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

      // Enhanced change detection: also check if any decisions were made that should result in changes
      // Even if JSON is identical, logical changes might exist
      const hasDecisions =
        Object.keys(decisions.credentials).length > 0 ||
        Object.keys(decisions.domains).length > 0 ||
        Object.keys(decisions.workflowCalls).length > 0 ||
        Object.keys(decisions.metadata).length > 0;

      // If no changes were detected, throw an error early
      if (!hasChanges && hasDecisions) {
        // This might be a false negative - the decisions might not have resulted in JSON changes
        // but we should still allow the merge if the user made explicit choices
        console.log(`[Merge] No JSON changes detected, but ${Object.keys(decisions.credentials).length + Object.keys(decisions.domains).length + Object.keys(decisions.workflowCalls).length + Object.keys(decisions.metadata).length} decisions were made`);
        // For now, we'll still proceed if decisions were made
        hasChanges = hasDecisions;
      }

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
    // Strategy: Staging is the BASE, and we only "Keep Main" for specific protected values (credentials/domains).
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

    // Process each decision
    Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
      if (source === 'main') {
        // Find which nodes in main use this credential ID
        mainWorkflow.nodes?.forEach(mainNode => {
          if (mainNode.credentials) {
            Object.entries(mainNode.credentials).forEach(([credKey, mainCred]: [string, any]) => {
              if (mainCred.id === decidedCredId) {
                // Apply this main version to the merged workflow
                const mergedNode = merged.nodes?.find(n => n.name === mainNode.name);
                if (mergedNode) {
                   console.log(`[Merge] Reverting credential ${credKey} to Main version on node ${mergedNode.name}`);
                   
                   if (!mergedNode.credentials) mergedNode.credentials = {};
                   mergedNode.credentials[credKey] = mainCred;

                   // If this node switched authentication method, revert the authentication parameter too
                   if (mainNode.parameters?.authentication) {
                      if (!mergedNode.parameters) mergedNode.parameters = {};
                      mergedNode.parameters.authentication = mainNode.parameters.authentication;
                      console.log(`[Merge] Reverted authentication parameter for ${mergedNode.name}`);
                   }

                   // Cleanup: Remove credentials types added in staging but not in main for this node
                   Object.keys(mergedNode.credentials).forEach(key => {
                      if (!mainNode.credentials?.[key]) {
                         delete mergedNode.credentials![key];
                      }
                   });
                }
              }
            });
          }
        });
      }
    });

    // Handle staging-only credentials: if 'main' source is selected, it means "exclude"
    Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
        if (source === 'main') {
            const existsInMain = mainWorkflow.nodes?.some(n => 
                Object.values(n.credentials || {}).some((c: any) => c.id === decidedCredId)
            );
            
            if (!existsInMain) {
                merged.nodes?.forEach(node => {
                    if (node.credentials) {
                        Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
                            if (cred.id === decidedCredId) {
                                delete node.credentials![key];
                            }
                        });
                    }
                });
            }
        }
    });
  }

  /**
   * Apply domain/URL selection decisions to the merged workflow
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

    const urlPatterns = ['url', 'webhookUrl', 'path', 'endpoint', 'baseUrl', 'apiUrl'];

    Object.entries(domainDecisions).forEach(([decisionKey, decision]) => {
      const targetUrl = decision.url;
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
                  // Check if this URL matches the decision key
                  if (value === decisionKey || (isWebhookDecision && value === decisionPath)) {
                    // Apply the selected value directly
                    obj[key] = targetValue;
                    return;
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

  private getNestedValue(obj: any, path: string): any {
    const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
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
    // Process each workflow call decision
    Object.entries(workflowCallDecisions).forEach(([callKey, action]) => {
      const [sourceWorkflow, targetWorkflow] = callKey.split('->');
      
      merged.nodes?.forEach((node) => {
        if (node.type === 'n8n-nodes-base.executeWorkflow' || node.type.includes('executeWorkflow')) {
          const nodeTargetWorkflow = node.parameters?.workflowId;
          const nodeSourceWorkflow = node.name; // Source workflow is typically the node name
          
          // Check if this node matches the decision
          if (nodeTargetWorkflow === targetWorkflow) {
            if (action === 'remove') {
              node.disabled = true;
              console.log(`[Merge] Disabled workflow call from ${sourceWorkflow} to ${targetWorkflow}`);
            } else if (action === 'add') {
              node.disabled = false;
              console.log(`[Merge] Enabled workflow call from ${sourceWorkflow} to ${targetWorkflow}`);
            }
            // 'keep' action: no change needed, keep current state
          }
        }
      });
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
              if (source === 'main' && key in mainWorkflow) {
                  merged[key] = mainWorkflow[key];
              } else if (source === 'staging' && key in stagingWorkflow) {
                  merged[key] = stagingWorkflow[key];
              }
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
      const prDescription = description || `Automated merge from Wingm8n FlowBridge\n\nThis PR contains merged N8N workflows with selected changes from staging to production.`;

      return await this.githubService.createPullRequest(owner, repo, prTitle, prDescription, mergeBranchName, targetBranch);
    } catch (error: any) {
      if (error.status === 422 || (error.message && (error.message.includes('No commits between') || error.message.includes('Validation Failed')))) {
        throw new Error('No changes to merge: The resulting configuration is identical to the target branch.');
      }
      throw error;
    }
  }
}

export function createMergeService(githubService: GitHubService): MergeService {
  return new MergeService(githubService);
}
