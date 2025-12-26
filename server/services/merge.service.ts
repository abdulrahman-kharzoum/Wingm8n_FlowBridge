/**
 * Merge Service
 * Handles the creation of merge branches and pull requests
 */

import type { N8NWorkflow, MergeDecision, MergeBranch } from '@shared/types/workflow.types';
import { GitHubService } from './github.service';

export class MergeService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  /**
   * Create a merge branch with the selected changes
   */
  async createMergeBranch(
    owner: string,
    repo: string,
    stagingBranch: string,
    mainBranch: string,
    stagingWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }>,
    mainWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }>,
    decisions: MergeDecision
  ): Promise<MergeBranch> {
    try {
      // Generate unique merge branch name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const randomSuffix = Math.random().toString(36).substring(7);
      const mergeBranchName = `merge/${stagingBranch}-to-${mainBranch}/${timestamp}-${randomSuffix}`;

      // Create the merge branch from main
      await this.githubService.createBranch(owner, repo, mergeBranchName, mainBranch);

      console.log(`[Merge] Starting merge for ${owner}/${repo}. Target: ${mainBranch}, Source: ${stagingBranch}`);
      console.log(`[Merge] Decision counts: Credentials=${Object.keys(decisions.credentials).length}, Domains=${Object.keys(decisions.domains).length}, Metadata=${Object.keys(decisions.metadata).length}`);

      // Merge workflows based on decisions
      const mergedWorkflows = this.mergeWorkflows(
        stagingWorkflows,
        mainWorkflows,
        decisions
      );

      // Track if any actual changes were made
      let hasChanges = false;

      // Upload merged workflows to the merge branch
      for (const workflow of mergedWorkflows) {
        const mergedContent = JSON.stringify(workflow.content, null, 2);
        
        // Find the corresponding main workflow to compare
        const mainWorkflow = mainWorkflows.find(w => w.path === workflow.path);
        const mainContent = mainWorkflow ? JSON.stringify(mainWorkflow.content, null, 2) : null;
        
        // Only update if content is different from main, or if it's a new file
        if (!mainContent || mergedContent !== mainContent) {
          console.log(`[Merge] Updating ${workflow.path} - content differs from main`);
          await this.githubService.updateFile(
            owner,
            repo,
            mergeBranchName,
            workflow.path,
            mergedContent,
            `Merge: Update ${workflow.name}`
          );
          hasChanges = true;
        } else {
          console.log(`[Merge] Skipping ${workflow.path} - content identical to main`);
        }
      }

      // If no changes were detected, throw an error early
      if (!hasChanges) {
        throw new Error(
          'No changes to merge: The merged configuration is identical to the main branch. ' +
          'This can happen if all your selected decisions result in keeping the main branch values. ' +
          'Please select at least one staging value to merge.'
        );
      }

      return {
        name: mergeBranchName,
        baseBranch: mainBranch,
        decisions,
        createdAt: new Date(),
        status: 'ready',
      };
    } catch (error) {
      console.error('Failed to create merge branch:', error);
      throw error;
    }
  }

  /**
   * Merge workflows based on user decisions
   */
  private mergeWorkflows(
    stagingWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }>,
    mainWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }>,
    decisions: MergeDecision
  ): Array<{ name: string; path: string; content: N8NWorkflow }> {
    const mergedWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }> = [];
    const processedPaths = new Set<string>();

    // Process main workflows first
    for (const mainWorkflow of mainWorkflows) {
      const stagingWorkflow = stagingWorkflows.find((w) => w.path === mainWorkflow.path);

      if (stagingWorkflow) {
        // Merge the workflows
        const merged = this.mergeWorkflowContent(
          stagingWorkflow.content,
          mainWorkflow.content,
          decisions,
          mainWorkflow.path
        );

        mergedWorkflows.push({
          name: mainWorkflow.name,
          path: mainWorkflow.path,
          content: merged,
        });

        processedPaths.add(mainWorkflow.path);
      } else {
        // Keep main workflow as is
        mergedWorkflows.push(mainWorkflow);
        processedPaths.add(mainWorkflow.path);
      }
    }

    // Add staging-only workflows
    for (const stagingWorkflow of stagingWorkflows) {
      if (!processedPaths.has(stagingWorkflow.path)) {
        mergedWorkflows.push(stagingWorkflow);
      }
    }

    return mergedWorkflows;
  }

  /**
   * Merge individual workflow content based on decisions
   */
  private mergeWorkflowContent(
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    decisions: MergeDecision,
    filename: string
  ): N8NWorkflow {
    // Determine the base workflow.
    // If we are merging, we should start with a base that includes the structural changes we want.
    // However, we don't have explicit "structure" decisions, only property-level ones.
    // A common safe default for "Apply Staging Changes to Main" is actually to start with STAGING,
    // and then revert the specific properties we chose to keep from MAIN.
    // BUT, if we want to "Update Main with specific changes", we usually mean "Keep Main, apply overrides".
    
    // If we have added nodes in Staging, starting with Main will LOSE them.
    // If we have removed nodes in Staging, starting with Main will KEEP them (undesired if we wanted the removal).
    
    // Strategy:
    // 1. Identify if this is primarily a "Take Staging" or "Keep Main" operation.
    //    For a "Release" or "Merge Staging to Main", the intent is usually to bring Staging's state to Main.
    //    So, Staging should be the BASE, and we only "Keep Main" for specific protected values (credentials/domains).
    
    // Let's switch the base to Staging, and then re-apply "Main" decisions on top of it.
    // This ensures new nodes/logic from Staging are preserved by default,
    // and only the specific configuration we wanted to "Pin" to Main (like prod credentials) are kept from Main.
    
    const merged: N8NWorkflow = JSON.parse(JSON.stringify(stagingWorkflow));

    // Apply credential decisions
    this.applyCredentialDecisions(merged, stagingWorkflow, mainWorkflow, decisions.credentials);

    // Apply domain decisions
    this.applyDomainDecisions(merged, stagingWorkflow, mainWorkflow, decisions.domains);

    // Apply workflow call decisions
    this.applyWorkflowCallDecisions(
      merged,
      stagingWorkflow,
      mainWorkflow,
      decisions.workflowCalls
    );

    // Apply metadata decisions
    this.applyMetadataDecisions(
        merged,
        stagingWorkflow,
        mainWorkflow,
        decisions.metadata,
        filename
    );

    return merged;
  }

  /**
   * Apply credential selection decisions to the merged workflow
   * 
   * Strategy: The merged workflow starts as a copy of staging.
   * - If decision is 'staging' -> no change needed (already has staging values)
   * - If decision is 'main' -> find and apply main's credential
   * - Decisions are keyed by credential ID (could be staging or main ID)
   */
  private applyCredentialDecisions(
    merged: N8NWorkflow,
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    credentialDecisions: Record<string, 'staging' | 'main' | 'keep-both'>
  ): void {
    if (!credentialDecisions || Object.keys(credentialDecisions).length === 0) {
      return;
    }

    console.log('[Merge] Applying credential decisions:', credentialDecisions);

    // Build a map of node names to their credentials in both workflows
    const stagingCredMap = new Map<string, Map<string, any>>(); // nodeName -> credKey -> cred
    const mainCredMap = new Map<string, Map<string, any>>();
    
    stagingWorkflow.nodes?.forEach(node => {
      if (node.credentials) {
        const nodeCredMap = new Map<string, any>();
        Object.entries(node.credentials).forEach(([key, cred]) => {
          nodeCredMap.set(key, cred);
        });
        stagingCredMap.set(node.name, nodeCredMap);
      }
    });
    
    mainWorkflow.nodes?.forEach(node => {
      if (node.credentials) {
        const nodeCredMap = new Map<string, any>();
        Object.entries(node.credentials).forEach(([key, cred]) => {
          nodeCredMap.set(key, cred);
        });
        mainCredMap.set(node.name, nodeCredMap);
      }
    });

    // Process each decision
    Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
      if (source === 'main') {
        // Find which node in main has this credential ID
        let foundNodeName: string | null = null;
        let foundCredKey: string | null = null;
        let foundCred: any = null;
        
        mainWorkflow.nodes?.forEach(node => {
          if (node.credentials) {
            Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
              if (cred.id === decidedCredId) {
                foundNodeName = node.name;
                foundCredKey = key;
                foundCred = cred;
              }
            });
          }
        });
        
        // Also check if the decision ID is a staging credential ID that corresponds to a main credential
        if (!foundNodeName) {
          // Find the staging node that has this credential
          stagingWorkflow.nodes?.forEach(node => {
            if (node.credentials) {
              Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
                if (cred.id === decidedCredId) {
                  // Found in staging, now find the corresponding main node
                  const mainNode = mainWorkflow.nodes?.find(n => n.name === node.name);
                  if (mainNode?.credentials?.[key]) {
                    foundNodeName = node.name;
                    foundCredKey = key;
                    foundCred = mainNode.credentials[key];
                  }
                }
              });
            }
          });
        }
        
        // Apply the main credential to the merged workflow
        if (foundNodeName && foundCredKey && foundCred) {
          // We need to find the node in the merged workflow (which is a copy of staging)
          const mergedNode = merged.nodes?.find(n => n.name === foundNodeName);
          if (mergedNode) {
            if (!mergedNode.credentials) mergedNode.credentials = {};
            console.log(`[Merge] Applying main credential to ${foundNodeName}.${foundCredKey}: ${foundCred.id} (${foundCred.name})`);
            mergedNode.credentials[foundCredKey] = foundCred;
          } else {
            console.warn(`[Merge] Could not find node ${foundNodeName} in merged workflow to apply main credential`);
          }
        }
      }
      // If source is 'staging', the merged workflow already has staging values (no action needed)
    });
  }

  /**
   * Apply domain/URL selection decisions to the merged workflow
   * 
   * Strategy: The merged workflow starts as a copy of staging.
   * The decision contains { selected: 'staging' | 'main', url: string }
   * where 'url' is the actual URL value to use.
   * 
   * We need to find where each decision applies and replace the value.
   */
  private applyDomainDecisions(
    merged: N8NWorkflow,
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    domainDecisions: Record<string, { selected: 'staging' | 'main'; url: string }>
  ): void {
    if (!domainDecisions || Object.keys(domainDecisions).length === 0) {
      return;
    }

    console.log('[Merge] Applying domain decisions:', domainDecisions);

    const urlPatterns = [
      'url',
      'webhookUrl',
      'path',
      'endpoint',
      'baseUrl',
      'apiUrl',
    ];

    // Build a reverse lookup: for each staging URL, what's the corresponding main URL?
    // And vice versa, by node name and parameter path
    const urlMapping = new Map<string, { stagingUrl: string; mainUrl: string; nodeName: string; paramKey: string }>();
    
    // Collect all URLs from staging with their locations
    const stagingUrls = new Map<string, Array<{ nodeName: string; paramKey: string }>>();
    const mainUrls = new Map<string, Array<{ nodeName: string; paramKey: string }>>();

    const collectUrls = (workflow: N8NWorkflow, urlMap: Map<string, Array<{ nodeName: string; paramKey: string }>>) => {
      workflow.nodes?.forEach(node => {
        if (node.parameters) {
          const collectFromObject = (obj: any, pathPrefix: string = '') => {
            Object.entries(obj).forEach(([key, value]: [string, any]) => {
              const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
              if (urlPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
                if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/'))) {
                  const locations = urlMap.get(value) || [];
                  locations.push({ nodeName: node.name, paramKey: fullPath });
                  urlMap.set(value, locations);
                }
              }
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                collectFromObject(value, fullPath);
              }
            });
          };
          collectFromObject(node.parameters);
        }
      });
    };

    collectUrls(stagingWorkflow, stagingUrls);
    collectUrls(mainWorkflow, mainUrls);

    // Apply each decision
    Object.entries(domainDecisions).forEach(([decisionKey, decision]) => {
      const targetUrl = decision.url;
      
      console.log(`[Merge] Processing domain decision: key=${decisionKey}, selected=${decision.selected}, targetUrl=${targetUrl}`);
      
      // Find where this decision applies in the merged workflow
      // The decision key is the original URL from the diff (typically the staging URL)
      // We need to find nodes that have this URL and replace with targetUrl
      
      // Special case: if it's a webhook decision, extract the path
      let decisionPath = decisionKey;
      let isWebhookDecision = false;
      const webhookMatch = decisionKey.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/);
      if (webhookMatch) {
          decisionPath = webhookMatch[1];
          isWebhookDecision = true;
      }

      const targetValue = isWebhookDecision && decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)
          ? decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)![1]
          : targetUrl;

      merged.nodes?.forEach(node => {
        if (node.parameters) {
          const updateUrlsInObject = (obj: any, path: string = ''): void => {
            Object.entries(obj).forEach(([key, value]: [string, any]) => {
              const currentPath = path ? `${path}.${key}` : key;
              
              if (urlPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
                if (typeof value === 'string') {
                  // Check if this value matches the decision (either exact URL or webhook path)
                  if (value === decisionKey || (isWebhookDecision && value === decisionPath)) {
                    console.log(`[Merge] Replacing ${value} with ${targetValue} in ${node.name}.${currentPath}`);
                    obj[key] = targetValue;
                    return;
                  }
                  
                  // For 'main' decisions, we need to find where the staging URL is
                  // and replace it with the main URL
                  if (decision.selected === 'main') {
                    // Find the value in the main workflow at this path
                    const mainNode = mainWorkflow.nodes?.find(n => n.name === node.name);
                    if (mainNode?.parameters) {
                      const mainValue = this.getNestedValue(mainNode.parameters, currentPath);
                      
                      // If main has the target value, apply it to the merged copy
                      if (mainValue === targetValue || (isWebhookDecision && mainValue === targetValue)) {
                          console.log(`[Merge] Applying main value ${targetValue} to ${node.name}.${currentPath} (was: ${value})`);
                          obj[key] = targetValue;
                          return;
                      }
                    }
                  }
                }
              }
              
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                updateUrlsInObject(value, currentPath);
              } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                  if (typeof item === 'object' && item !== null) {
                    updateUrlsInObject(item, `${currentPath}[${index}]`);
                  }
                });
              }
            });
          };
          updateUrlsInObject(node.parameters);
        }
      });
    });
  }

  /**
   * Helper to get a nested value from an object using a path string
   */
  private getNestedValue(obj: any, path: string): any {
    // Handle array notation like "items[0].value"
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Helper to get a value at a simple path in an object
   */
  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Apply workflow call selection decisions to the merged workflow
   */
  private applyWorkflowCallDecisions(
    merged: N8NWorkflow,
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    workflowCallDecisions: Record<string, 'add' | 'remove' | 'keep'>
  ): void {
    // This is a placeholder for workflow call merging logic
    // In a real implementation, you would:
    // 1. Find Execute Workflow nodes
    // 2. Apply the decisions to keep/remove/modify them
    // 3. Handle workflow name normalization (staging- prefix)

    merged.nodes?.forEach((node) => {
      if (node.type === 'n8n-nodes-base.executeWorkflow' || node.type.includes('executeWorkflow')) {
        const targetWorkflow = node.parameters?.workflowId;
        if (targetWorkflow) {
          const decision = workflowCallDecisions[targetWorkflow];
          if (decision === 'remove') {
            // Mark for removal or handle accordingly
            node.disabled = true;
          }
        }
      }
    });
  }

  /**
   * Apply metadata decisions to the merged workflow
   */
  private applyMetadataDecisions(
      merged: N8NWorkflow,
      stagingWorkflow: N8NWorkflow,
      mainWorkflow: N8NWorkflow,
      metadataDecisions: Record<string, 'staging' | 'main'>,
      filename: string
  ): void {
      if (!metadataDecisions) return;

      const prefix = `${filename}-`;

      Object.entries(metadataDecisions).forEach(([decisionKey, source]) => {
          if (decisionKey.startsWith(prefix)) {
              const key = decisionKey.substring(prefix.length);
              
              if (source === 'main') {
                  // We are based on Staging. If decision is Main, we copy from Main.
                  if (key in mainWorkflow) {
                      merged[key] = mainWorkflow[key];
                  }
              }
              // If source is Staging, it's already there.
          }
      });
  }

  /**
   * Create a pull request for the merge branch
   */
  async createPullRequest(
    owner: string,
    repo: string,
    mergeBranchName: string,
    targetBranch: string = 'main',
    title?: string,
    description?: string
  ): Promise<{
    number: number;
    url: string;
    state: string;
  }> {
    try {
      const prTitle = title || `Merge: ${mergeBranchName}`;
      const prDescription =
        description ||
        `Automated merge from Wingm8n FlowBridge\n\nThis PR contains merged N8N workflows with selected changes from staging to production.`;

      return await this.githubService.createPullRequest(
        owner,
        repo,
        prTitle,
        prDescription,
        mergeBranchName,
        targetBranch
      );
    } catch (error: any) {
      // Handle the case where no changes were made (merged content == main content)
      // GitHub API returns 422 Unprocessable Entity for validation failures like "No commits between..."
      if (error.status === 422 || (error.message && (error.message.includes('No commits between') || error.message.includes('Validation Failed')))) {
        // If we can't create a PR because there are no changes, we should probably delete the merge branch to clean up
        // But for now, let's just inform the user.
        throw new Error('No changes to merge: The resulting configuration is identical to the target branch. Please ensure you have selected changes that differ from the main branch.');
      }
      console.error('Failed to create pull request:', error);
      throw error;
    }
  }
}

export function createMergeService(githubService: GitHubService): MergeService {
  return new MergeService(githubService);
}
