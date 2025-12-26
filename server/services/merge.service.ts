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

      console.log(`\n=== MERGE OPERATION STARTED ===`);
      console.log(`Repository: ${owner}/${repo}`);
      console.log(`Branches: ${stagingBranch} -> ${mainBranch}`);
      console.log(`Target: ${mergeBranchName}`);
      console.log(`\nDecisions received:`);
      console.log(`  Credentials: ${Object.keys(decisions.credentials).length} - ${JSON.stringify(decisions.credentials, null, 2)}`);
      console.log(`  Domains: ${Object.keys(decisions.domains).length} - ${JSON.stringify(decisions.domains, null, 2)}`);
      console.log(`  Workflow Calls: ${Object.keys(decisions.workflowCalls).length} - ${JSON.stringify(decisions.workflowCalls, null, 2)}`);
      console.log(`  Metadata: ${Object.keys(decisions.metadata).length} - ${JSON.stringify(decisions.metadata, null, 2)}`);

      // Create the merge branch from main
      console.log(`\n[Step 1] Creating merge branch from main...`);
      await this.githubService.createBranch(owner, repo, mergeBranchName, mainBranch);
      console.log(`[Step 1] ✓ Branch created: ${mergeBranchName}`);

      console.log(`\n[Step 2] Starting workflow merge process...`);
      
      // Merge workflows based on decisions
      const mergedWorkflows = this.mergeWorkflows(
        stagingWorkflows,
        mainWorkflows,
        decisions
      );

      // Track if any actual changes were made
      let hasChanges = false;
      const filesProcessed: string[] = [];

      console.log(`\n[Step 3] Processing ${mergedWorkflows.length} merged workflows...`);

      // Upload merged workflows to the merge branch
      for (const workflow of mergedWorkflows) {
        const mergedContent = JSON.stringify(workflow.content, null, 2);
        
        // Find the corresponding main workflow to compare
        const mainWorkflow = mainWorkflows.find(w => w.path === workflow.path);
        const mainContent = mainWorkflow ? JSON.stringify(mainWorkflow.content, null, 2) : null;
        
        // Always upload the file to ensure the merge branch has content
        // Even if content is identical, we need commits for PR creation
        if (!mainContent || mergedContent !== mainContent) {
          console.log(`[Step 3] Updating ${workflow.path} - content differs from main`);
          await this.githubService.updateFile(
            owner,
            repo,
            mergeBranchName,
            workflow.path,
            mergedContent,
            `Merge: Update ${workflow.name}`
          );
          hasChanges = true;
          filesProcessed.push(workflow.path);
        } else {
          console.log(`[Step 3] Content identical for ${workflow.path}, but uploading to ensure branch has commits`);
          // Still upload to ensure the branch has commits
          await this.githubService.updateFile(
            owner,
            repo,
            mergeBranchName,
            workflow.path,
            mergedContent,
            `Merge: Update ${workflow.name}`
          );
          hasChanges = true;
          filesProcessed.push(workflow.path);
        }
      }

      // If no files were processed, throw an error
      if (filesProcessed.length === 0) {
        throw new Error(
          'No changes to merge: No workflow files were found to merge. ' +
          'Please ensure there are workflow files in both branches.'
        );
      }

      console.log(`\n[Step 4] Finalizing merge...`);
      console.log(`  Files processed: ${filesProcessed.length}`);
      console.log(`  Files: ${filesProcessed.join(', ')}`);
      console.log(`  Has changes: ${hasChanges}`);
      console.log(`\n=== MERGE OPERATION COMPLETED SUCCESSFULLY ===\n`);

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
    console.log(`[Merge] Merging workflows: ${stagingWorkflows.length} staging, ${mainWorkflows.length} main`);
    
    const mergedWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }> = [];
    const processedPaths = new Set<string>();

    // Process main workflows first
    for (const mainWorkflow of mainWorkflows) {
      const stagingWorkflow = stagingWorkflows.find((w) => w.path === mainWorkflow.path);

      if (stagingWorkflow) {
        console.log(`[Merge] Processing shared workflow: ${mainWorkflow.path}`);
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
        console.log(`[Merge] Main-only workflow: ${mainWorkflow.path}`);
        // Keep main workflow as is
        mergedWorkflows.push(mainWorkflow);
        processedPaths.add(mainWorkflow.path);
      }
    }

    // Add staging-only workflows
    for (const stagingWorkflow of stagingWorkflows) {
      if (!processedPaths.has(stagingWorkflow.path)) {
        console.log(`[Merge] Staging-only workflow: ${stagingWorkflow.path}`);
        mergedWorkflows.push(stagingWorkflow);
      }
    }

    console.log(`[Merge] Result: ${mergedWorkflows.length} workflows in merge`);
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
    console.log(`[Merge] Processing workflow: ${filename}`);
    console.log(`[Merge] Decisions: C=${Object.keys(decisions.credentials).length}, D=${Object.keys(decisions.domains).length}, WC=${Object.keys(decisions.workflowCalls).length}, M=${Object.keys(decisions.metadata).length}`);
    
    // Strategy: Start with staging as base, then apply decisions to override specific values
    const merged: N8NWorkflow = JSON.parse(JSON.stringify(stagingWorkflow));

    console.log(`[Merge] Base workflow (staging):`, {
      versionId: merged.versionId,
      nodes: merged.nodes?.length || 0
    });
    
    console.log(`[Merge] Main workflow:`, {
      versionId: mainWorkflow.versionId,
      nodes: mainWorkflow.nodes?.length || 0
    });

    if (merged.versionId === mainWorkflow.versionId) {
      console.warn(`[Merge] WARNING: Staging and Main versionIds are identical (${merged.versionId}). This suggests no changes or a potential fetch issue.`);
    }

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

    console.log(`[Merge] Final merged workflow:`, {
      versionId: merged.versionId,
      nodes: merged.nodes?.length || 0
    });
    
    console.log(`[Merge] Completed merge for ${filename}`);
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
    console.log('[Merge] Applying credential decisions:', credentialDecisions);
    
    if (!credentialDecisions || Object.keys(credentialDecisions).length === 0) {
      console.log('[Merge] No credential decisions to apply');
      return;
    }

    // Process each decision
    Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
      console.log(`[Merge] Processing credential decision: ${decidedCredId} -> ${source}`);
      
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
              console.log(`[Merge] Excluding staging-only credential: ${decidedCredId}`);
              merged.nodes?.forEach(node => {
                  if (node.credentials) {
                      Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
                          if (cred.id === decidedCredId) {
                              console.log(`[Merge] Removed credential ${key} from node ${node.name}`);
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
    console.log('[Merge] Applying domain decisions:', domainDecisions);
    
    if (!domainDecisions || Object.keys(domainDecisions).length === 0) {
      console.log('[Merge] No domain decisions to apply');
      return;
    }

    const urlPatterns = ['url', 'webhookUrl', 'path', 'endpoint', 'baseUrl', 'apiUrl'];

    Object.entries(domainDecisions).forEach(([decisionKey, decision]) => {
      console.log(`[Merge] Processing domain decision: ${decisionKey} -> ${decision.url} (${decision.selected})`);
      
      // CRITICAL DEBUG: Check what URLs are actually in the workflows
      console.log(`[Merge] Debug - Decision URL: ${decision.url}`);
      console.log(`[Merge] Debug - Decision selected: ${decision.selected}`);
      
      const targetUrl = decision.url;
      let decisionPath = decisionKey;
      let isWebhookDecision = false;
      const webhookMatch = decisionKey.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/);
      if (webhookMatch) {
          decisionPath = webhookMatch[1];
          isWebhookDecision = true;
          console.log(`[Merge] Webhook detected: ${decisionPath}`);
      }

      const targetValue = isWebhookDecision && decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)
          ? decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)![1]
          : targetUrl;

      let targetMethod: string | null = null;
      if (isWebhookDecision) {
          const methodMatch = decision.url.match(/^([A-Z]+)\s+/);
          if (methodMatch) targetMethod = methodMatch[1];
      }

      let changesApplied = 0;
      
      // Check what URLs exist in the workflows
      console.log(`[Merge] Debug - Looking for URLs matching: ${decisionKey} or ${decisionPath}`);
      
      merged.nodes?.forEach(node => {
        if (node.parameters) {
          const updateUrlsInObject = (obj: any, path: string = ''): void => {
            Object.entries(obj).forEach(([key, value]: [string, any]) => {
              const currentPath = path ? `${path}.${key}` : key;
              
              if (urlPatterns.some(pattern => key.toLowerCase().includes(pattern))) {
                if (typeof value === 'string') {
                  // Log all URL parameters found
                  if (value.includes('f58b8f82-0566-4965-a570-6e42cb177268')) {
                    console.log(`[Merge] Debug - Found webhook URL in node ${node.name}, param ${key}: ${value}`);
                  }
                  
                  // Check if this URL matches the decision key
                  if (value === decisionKey || (isWebhookDecision && value === decisionPath)) {
                    // Apply the selected value directly
                    console.log(`[Merge] Updating URL in node ${node.name}: ${value} -> ${targetValue}`);
                    obj[key] = targetValue;
                    
                    // Handle httpMethod for webhooks
                    if (isWebhookDecision && targetMethod) {
                         // We found the path/ID in this object 'obj'.
                         // For a webhook node, 'obj' should be the parameters object which also holds httpMethod.
                         if (node.type.includes('webhook')) {
                             console.log(`[Merge] Updating httpMethod in node ${node.name}: ${obj.httpMethod} -> ${targetMethod}`);
                             obj.httpMethod = targetMethod;
                         }
                    }

                    changesApplied++;
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

      console.log(`[Merge] Applied ${changesApplied} domain changes for ${decisionKey}`);
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
    console.log('[Merge] Applying workflow call decisions:', workflowCallDecisions);
    console.log(`[Merge] Workflow call decisions keys:`, Object.keys(workflowCallDecisions));
    console.log(`[Merge] Workflow call decisions count:`, Object.keys(workflowCallDecisions).length);
    
    if (!workflowCallDecisions || Object.keys(workflowCallDecisions).length === 0) {
      console.log('[Merge] No workflow call decisions to apply');
      return;
    }

    // Process each workflow call decision
    Object.entries(workflowCallDecisions).forEach(([callKey, action]) => {
      console.log(`[Merge] Processing workflow call decision: ${callKey} -> ${action}`);
      
      // callKey format: "sourceWorkflow->targetWorkflow"
      const parts = callKey.split('->');
      if (parts.length !== 2) {
        console.warn(`[Merge] Invalid workflow call key format: ${callKey}`);
        return;
      }
      
      const [sourceWorkflow, targetWorkflow] = parts;
      let changesApplied = 0;
      
      console.log(`[Merge] Looking for executeWorkflow nodes targeting: ${targetWorkflow}`);
      
      merged.nodes?.forEach((node) => {
        if (node.type === 'n8n-nodes-base.executeWorkflow' || node.type.includes('executeWorkflow')) {
          const nodeTargetWorkflow = node.parameters?.workflowId;
          const nodeSourceWorkflow = node.name; // Source workflow is typically the node name
          
          console.log(`[Merge] Found executeWorkflow node: ${node.name}, target=${nodeTargetWorkflow}, disabled=${node.disabled}`);
          
          // Check if this node matches the decision
          if (nodeTargetWorkflow === targetWorkflow) {
            if (action === 'remove') {
              node.disabled = true;
              console.log(`[Merge] Disabled workflow call from ${sourceWorkflow} to ${targetWorkflow}`);
              changesApplied++;
            } else if (action === 'add') {
              node.disabled = false;
              console.log(`[Merge] Enabled workflow call from ${sourceWorkflow} to ${targetWorkflow}`);
              changesApplied++;
            } else if (action === 'keep') {
              console.log(`[Merge] Keeping current state for workflow call from ${sourceWorkflow} to ${targetWorkflow}`);
            }
          }
        }
      });

      if (changesApplied === 0) {
        console.log(`[Merge] No matching nodes found for workflow call decision: ${callKey}`);
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
      console.log(`[Merge] Applying metadata decisions for ${filename}:`, metadataDecisions);
      
      if (!metadataDecisions) {
          console.log(`[Merge] No metadata decisions for ${filename}`);
          return;
      }
      
      const prefix = `${filename}-`;
      let changesApplied = 0;

      Object.entries(metadataDecisions).forEach(([decisionKey, source]) => {
          if (decisionKey.startsWith(prefix)) {
              const key = decisionKey.substring(prefix.length);
              console.log(`[Merge] Processing metadata decision: ${key} -> ${source}`);
              
              // Debug: Show what values are available - CRITICAL: Check if workflows are the same object
              console.log(`[Merge] Debug - Staging workflow object:`, stagingWorkflow);
              console.log(`[Merge] Debug - Main workflow object:`, mainWorkflow);
              console.log(`[Merge] Debug - Are they the same object?`, stagingWorkflow === mainWorkflow);
              console.log(`[Merge] Debug - Staging ${key}:`, stagingWorkflow[key]);
              console.log(`[Merge] Debug - Main ${key}:`, mainWorkflow[key]);
              console.log(`[Merge] Debug - Current merged ${key}:`, merged[key]);
              
              if (source === 'main' && key in mainWorkflow) {
                  const oldValue = merged[key];
                  const newValue = mainWorkflow[key];
                  
                  if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    merged[key] = newValue;
                    console.log(`[Merge] Updated metadata ${key}: ${oldValue} -> ${newValue} (from main)`);
                    changesApplied++;
                  } else {
                    console.log(`[Merge] Metadata ${key} already matches main (${oldValue})`);
                  }
              } else if (source === 'staging' && key in stagingWorkflow) {
                  const oldValue = merged[key];
                  const newValue = stagingWorkflow[key];
                  
                  if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                    merged[key] = newValue;
                    console.log(`[Merge] Updated metadata ${key}: ${oldValue} -> ${newValue} (from staging)`);
                    changesApplied++;
                  } else {
                     console.log(`[Merge] Metadata ${key} already matches staging (${oldValue})`);
                  }
              } else {
                  console.log(`[Merge] Metadata key ${key} not found in ${source} workflow`);
              }
          }
      });

      console.log(`[Merge] Applied ${changesApplied} metadata changes for ${filename}`);
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
