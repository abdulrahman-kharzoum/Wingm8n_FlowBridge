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
    
    // Build a map of all available credentials in Main for lookup
    const mainCredentialMap = new Map<string, string>(); // ID -> Name
    mainWorkflows.forEach(wf => {
      wf.content.nodes.forEach(node => {
        if (node.credentials) {
          Object.values(node.credentials).forEach((cred: any) => {
            if (cred.id && cred.name) {
              mainCredentialMap.set(cred.id, cred.name);
            }
          });
        }
      });
    });

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
          mainWorkflow.path,
          mainCredentialMap
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
    filename: string,
    mainCredentialMap: Map<string, string>
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
    this.applyCredentialDecisions(merged, stagingWorkflow, mainWorkflow, decisions.credentials, mainCredentialMap);

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
   * Recursively replace a value or property in an object or array
   * @param target The object or array to traverse
   * @param predicate Function to test if a value should be replaced. Returns true for match.
   * @param replacer Function to generate the new value.
   * @param keyFilter Optional regex to filter which keys to process (e.g., only 'id', 'url')
   */
  private recursiveReplace(
      target: any,
      predicate: (value: any, key: string | number) => boolean,
      replacer: (value: any, key: string | number) => any,
      keyFilter?: RegExp
  ): number {
      let changes = 0;

      if (Array.isArray(target)) {
          for (let i = 0; i < target.length; i++) {
              if (typeof target[i] === 'object' && target[i] !== null) {
                  changes += this.recursiveReplace(target[i], predicate, replacer, keyFilter);
              } else if (predicate(target[i], i)) {
                  target[i] = replacer(target[i], i);
                  changes++;
              }
          }
      } else if (typeof target === 'object' && target !== null) {
          Object.keys(target).forEach(key => {
              const value = target[key];
              
              // If filtering by key, skip if it doesn't match AND it's a primitive
              // We always traverse objects to find nested matches
              if (keyFilter && typeof value !== 'object' && !keyFilter.test(key)) {
                  return;
              }

              if (predicate(value, key)) {
                  target[key] = replacer(value, key);
                  changes++;
              } else if (typeof value === 'object' && value !== null) {
                   changes += this.recursiveReplace(value, predicate, replacer, keyFilter);
              }
          });
      }

      return changes;
  }

  /**
   * Apply credential selection decisions to the merged workflow
   * Now performs GLOBAL replacement of credential IDs across the entire workflow
   */
  private applyCredentialDecisions(
    merged: N8NWorkflow,
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    credentialDecisions: Record<string, string>,
    mainCredentialMap: Map<string, string>
  ): void {
    console.log('[Merge] Applying credential decisions:', credentialDecisions);
    
    if (!credentialDecisions || Object.keys(credentialDecisions).length === 0) {
      console.log('[Merge] No credential decisions to apply');
      return;
    }

    // Helper to find Staging Credential ID that corresponds to a Main Credential ID
    const findStagingCounterpart = (mainId: string): string | undefined => {
        // Let's build a quick map of NodeName -> { [credType]: credId } for both
        const stagingMap = new Map<string, Record<string, string>>();
        stagingWorkflow.nodes.forEach(n => {
            if (n.credentials) {
                const creds: Record<string, string> = {};
                Object.entries(n.credentials).forEach(([type, c]: [string, any]) => creds[type] = c.id);
                stagingMap.set(n.name, creds);
            }
        });
        
        let foundStagingId: string | undefined;
        
        mainWorkflow.nodes.forEach(n => {
            if (n.credentials) {
                Object.entries(n.credentials).forEach(([type, c]: [string, any]) => {
                    if (c.id === mainId) {
                        // Found the main credential usage. Check Staging node.
                        const stagingCreds = stagingMap.get(n.name);
                        if (stagingCreds && stagingCreds[type] && stagingCreds[type] !== mainId) {
                            foundStagingId = stagingCreds[type];
                        }
                    }
                });
            }
        });
        
        return foundStagingId;
    };

    Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
      // Determine what ID we are targeting
      let targetId: string | undefined;
      let targetName: string | undefined;

      if (source === 'main') {
          targetId = decidedCredId;
          targetName = mainCredentialMap.get(targetId);
      } else if (source === 'staging') {
          // Already there, nothing to do usually
          return;
      } else if (source !== 'keep-both') {
          // It's a specific Alternative Credential ID
          targetId = source;
          targetName = mainCredentialMap.get(targetId);
      }

      if (targetId) {
          // We need to replace whatever is currently in Staging (merged) with this targetId.
          // First, identify what ID is currently being used in Staging.
          // If the row key (decidedCredId) is a Main ID, find its Staging counterpart.
          const stagingId = findStagingCounterpart(decidedCredId);
          
          // The ID to replace is either the Staging counterpart, OR the decidedCredId itself (if it was Staging-only)
          const idToReplace = stagingId || decidedCredId;

          if (idToReplace && idToReplace !== targetId) {
              console.log(`[Merge] Replacing credential ${idToReplace} with ${targetId} (Name: ${targetName})`);
              
              // 1. Replace IDs
              const idChanges = this.recursiveReplace(
                  merged,
                  (val) => val === idToReplace,
                  () => targetId,
                  /id|credential/i
              );
              console.log(`[Merge] Updated ${idChanges} credential IDs`);

              // 2. Replace Names (if we found the target name)
              if (targetName) {
                  // We need to find nodes that use this credential and update the name
                  // N8N structure: credentials: { [type]: { id: "...", name: "..." } }
                  // We can't just global replace the name string because it might be common.
                  // We iterate nodes.
                  merged.nodes?.forEach(node => {
                      if (node.credentials) {
                          Object.values(node.credentials).forEach((cred: any) => {
                              if (cred.id === targetId) { // We already swapped the ID
                                  cred.name = targetName;
                              }
                          });
                      }
                  });
              }

              // 3. Handle Auth Method consistency (only if we selected Main)
              if (source === 'main') {
                 mainWorkflow.nodes?.forEach(mainNode => {
                     if (mainNode.parameters?.authentication) {
                         const mergedNode = merged.nodes?.find(n => n.name === mainNode.name);
                         const usesCred = Object.values(mainNode.credentials || {}).some((c: any) => c.id === decidedCredId);
                         
                         if (mergedNode && usesCred) {
                             if (!mergedNode.parameters) mergedNode.parameters = {};
                             if (mergedNode.parameters.authentication !== mainNode.parameters.authentication) {
                                 mergedNode.parameters.authentication = mainNode.parameters.authentication;
                             }
                         }
                     }
                 });
              }
          }
      }
    });

    // Handle "exclude" scenario (Staging-only credential that user rejected)
    // If source is 'main' but it doesn't exist in main, we should remove it.
     Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
        if (source === 'main') {
            const existsInMain = mainWorkflow.nodes?.some(n =>
                Object.values(n.credentials || {}).some((c: any) => c.id === decidedCredId)
            );
            
            if (!existsInMain) {
              console.log(`[Merge] Excluding staging-only credential: ${decidedCredId}`);
              // Remove occurrences
              this.recursiveReplace(
                  merged,
                  (val, key) => val === decidedCredId,
                  () => undefined, // This won't delete the key, just set to undefined.
                  // For actual deletion, we need a parent-aware traversal or specific cleanup.
                  // For now, let's do the specific node cleanup as before, which is safer for "removal"
              );
              
              merged.nodes?.forEach(node => {
                  if (node.credentials) {
                      Object.keys(node.credentials).forEach(key => {
                          // @ts-ignore
                          if (node.credentials[key].id === decidedCredId) {
                               // @ts-ignore
                              delete node.credentials[key];
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
   * Now performs GLOBAL replacement of URLs
   */
  private applyDomainDecisions(
    merged: N8NWorkflow,
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    domainDecisions: Record<string, { selected: 'staging' | 'main' | 'custom'; url: string }>
  ): void {
    console.log('[Merge] Applying domain decisions:', domainDecisions);
    
    if (!domainDecisions || Object.keys(domainDecisions).length === 0) {
      console.log('[Merge] No domain decisions to apply');
      return;
    }

    Object.entries(domainDecisions).forEach(([decisionKey, decision]) => {
      console.log(`[Merge] Processing domain decision: ${decisionKey} -> ${decision.url} (${decision.selected})`);
      
      const targetUrl = decision.url;
      let decisionPath = decisionKey;
      let isWebhookDecision = false;
      
      const webhookMatch = decisionKey.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/);
      if (webhookMatch) {
          decisionPath = webhookMatch[1];
          isWebhookDecision = true;
      }

      // Value to find (What are we replacing?)
      // If selected is 'main', we want to replace Staging URL with Main URL.
      // But we need to know what the Staging URL *was*.
      // The decision key is usually the "key" from the diff, which might be the URL itself or a Webhook ID.
      
      // Strategy:
      // 1. If it's a Webhook, we look for the specific Webhook parameters (path/httpMethod) regardless of current value,
      //    because we can identify the node by ID usually, but here we are doing global replace.
      //    Actually, for Webhooks, "global replace" of a path is risky if it's common (e.g. "/webhook").
      //    So for Webhooks, we stick to the Node-based approach but use recursiveReplace for the parameter object.
      
      // 2. For standard URLs, we find the "other" URL (the one NOT selected) and replace it with the selected one.
      
      let valueToReplace: string | null = null;
      
      if (!isWebhookDecision) {
           // Try to find what the "other" value was.
           // If we selected Main, we want to find Staging's version of this URL.
           // This requires looking up the diff or inferring it.
           // Since we don't have the diff here, let's assume 'decisionKey' IS the URL we want to replace
           // IF the decisionKey looks like a URL.
           // But wait, the decisionKey is unique.
           
           // If decisionKey is a URL, it's likely the one we want to keep? No, the decision object has 'url'.
           // Let's assume we want to replace ANY occurrence of the "Rejected" URL with the "Selected" URL.
           // But we don't know the "Rejected" URL explicitly here.
           
           // Alternative: Just search for the "Staging" URL if we selected "Main".
           // But we need to find it.
           // Let's brute-force scan:
           // If selected=Main, we scan Staging workflow to find corresponding nodes/values? No.
           
           // SIMPLER APPROACH:
           // The user usually provides the "Key" as the URL they saw in the UI.
           // If the UI showed "https://staging.api.com", and they picked "https://prod.api.com",
           // Then 'decisionKey' might be "https://staging.api.com" (if it was new) or a composite key.
           
           // Let's look at how keys are generated in PR Analyzer:
           // key = domain.url (if simple) OR "nodeId:path" (if collision/param).
           
           // If key contains ':', it's likely "nodeId:path".
           if (decisionKey.includes(':') && !decisionKey.startsWith('http')) {
               // Scoped replacement! Even better.
               const [nodeId, paramPath] = decisionKey.split(':');
               // Find the node with this ID
               const node = merged.nodes.find(n => n.id === nodeId);
               if (node && node.parameters) {
                   // We need to set the value at paramPath to targetUrl
                   // paramPath might be "options.url"
                   const parts = paramPath.split('.');
                   let current = node.parameters;
                   for(let i=0; i<parts.length-1; i++) {
                       current = current[parts[i]];
                       if (!current) break;
                   }
                   if (current) {
                       const lastPart = parts[parts.length-1];
                       console.log(`[Merge] Scoped update for ${node.name} (${paramPath}): ${current[lastPart]} -> ${targetUrl}`);
                       current[lastPart] = targetUrl;
                   }
               }
           } else {
               // It's a global URL key.
               // We want to replace occurrences of the "Staging" URL with "Main" URL if selected=Main.
               // But 'decisionKey' might be the *Main* URL if it was an existing one?
               // Actually, if we selected Main, we want to put Main URL into the merged (which is Staging-based).
               // So we want to find Staging URL and replace with Main URL.
               // But we don't know Staging URL easily.
               
               // Let's use the Recursive Replace to set the value to targetUrl
               // matching on the *Path/Key* pattern rather than value?
               // No, that's dangerous.
               
               // Let's try to match the VALUE that currently exists in 'merged' (which is Staging).
               // If 'merged' has "http://staging.com" and target is "http://prod.com", we want to swap.
               // We can just look for the node that contained this decision.
               
               // Fallback: Use the previous logic of scanning all nodes for URL-like fields.
               // But now we check if the value matches the *decisionKey* (if it's a URL) OR if we can infer.
               
               if (decision.selected === 'main' || decision.selected === 'custom') {
                   // We want to force this URL.
                   // Iterate all nodes, find properties that look like URLs.
                   // If they match the *Staging* version of this decision?
                   // We lack the Staging value here.
                   
                   // WORKAROUND: We will iterate the original Staging workflow to find where this decisionKey came from?
                   // No.
                   
                   // Let's trust the previous implementation's logic but make it recursive:
                   // Scan all string values. If value == decisionKey, replace.
                   // This assumes decisionKey IS the value to replace.
                   
                   const changes = this.recursiveReplace(
                       merged,
                       (val) => val === decisionKey,
                       () => targetUrl
                   );
                   if (changes > 0) {
                       console.log(`[Merge] Global replaced ${changes} occurrences of ${decisionKey} to ${targetUrl}`);
                   } else {
                       // If exact match failed, maybe it was a composite key or the value changed.
                       // Let's try the key-based scan from previous implementation as a backup
                       // (It handled fuzzy matching for webhooks, but for URLs it was exact)
                   }
               }
           }
      } else {
          // Webhook handling
          // decisionKey format: "GET /webhook/path (Webhook)"
          // decisionPath = "/webhook/path"
          // We also have `targetMethod`
          
          let targetMethod = 'GET';
          const methodMatch = decision.url.match(/^([A-Z]+)\s+/);
          if (methodMatch) targetMethod = methodMatch[1];
          const finalPath = isWebhookDecision && decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)
              ? decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)![1]
              : targetUrl;
              
          // Webhooks are usually identified by Node ID in our aggregation logic: "webhook:nodeId"
          if (decisionKey.startsWith('webhook:')) {
              const nodeId = decisionKey.split(':')[1];
              const node = merged.nodes.find(n => n.id === nodeId);
              if (node && node.parameters) {
                  console.log(`[Merge] Updating webhook node ${node.name}: path=${finalPath}, method=${targetMethod}`);
                  node.parameters.path = finalPath;
                  node.parameters.httpMethod = targetMethod;
              }
          } else {
              // Legacy match by path string
              // Find nodes with type webhook and matching path?
              // Or just recursive replace of 'path' property if it matches old path?
              // Dangerous. Let's stick to Node scanning for Webhooks.
              merged.nodes.forEach(node => {
                  if (node.type.includes('webhook') && node.parameters) {
                      const currentPath = node.parameters.path;
                      const currentMethod = node.parameters.httpMethod || 'GET';
                      const currentKey = `${currentMethod} ${currentPath} (Webhook)`;
                      
                      // Check if this node matches the decision key
                      if (currentKey === decisionKey || node.parameters.path === decisionPath) {
                          node.parameters.path = finalPath;
                          node.parameters.httpMethod = targetMethod;
                          console.log(`[Merge] Updated webhook ${node.name} via path match`);
                      }
                  }
              });
          }
      }
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
