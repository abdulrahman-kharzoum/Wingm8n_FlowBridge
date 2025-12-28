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
        console.log(`[Merge] Staging-only workflow (New File): ${stagingWorkflow.path}`);
        
        // Even for new files, we must apply decisions (e.g. Credential mapping, Domains, etc.)
        // We simulate an empty "Main" workflow for comparison
        const dummyMainWorkflow: N8NWorkflow = {
            id: '',
            name: '',
            nodes: [],
            connections: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            settings: {},
            staticData: null,
            tags: [],
            versionId: 'new-file'
        };

        const merged = this.mergeWorkflowContent(
          stagingWorkflow.content,
          dummyMainWorkflow,
          decisions,
          stagingWorkflow.path, // Use staging path/name
          mainCredentialMap
        );

        mergedWorkflows.push({
            name: stagingWorkflow.name,
            path: stagingWorkflow.path,
            content: merged,
        });
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
   * Recursively find and update credential objects ({ id, name }) in a single pass
   */
  private recursiveCredentialUpdate(
      target: any,
      targetId: string,
      newId: string,
      newName: string
  ): number {
      let changes = 0;

      if (Array.isArray(target)) {
          for (let i = 0; i < target.length; i++) {
              if (typeof target[i] === 'object' && target[i] !== null) {
                  changes += this.recursiveCredentialUpdate(target[i], targetId, newId, newName);
              }
          }
      } else if (typeof target === 'object' && target !== null) {
          // Check if this object IS a credential object (has id and name)
          if (target.id === targetId && 'name' in target) {
             console.log(`[Merge] Found credential object to update: ${target.id} -> ${newId}, ${target.name} -> ${newName}`);
             target.id = newId;
             target.name = newName;
             changes++;
          }
          
          // Continue traversal
          Object.values(target).forEach(value => {
              if (typeof value === 'object' && value !== null) {
                  changes += this.recursiveCredentialUpdate(value, targetId, newId, newName);
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

    // Helper: Build Main Credential Type Map (Main Cred ID -> Type)
    const mainCredTypeMap = new Map<string, string>();
    mainWorkflow.nodes.forEach(n => {
        if (n.credentials) {
            Object.entries(n.credentials).forEach(([type, c]: [string, any]) => {
                if (c.id) mainCredTypeMap.set(c.id, type);
            });
        }
    });

    Object.entries(credentialDecisions).forEach(([decidedCredId, source]) => {
      // decidedCredId is the key from the Diff. It might be Staging ID or Main ID.
      // source is 'staging', 'main', or specific ID.

      let targetId: string | undefined;
      let targetName: string | undefined;

      if (source === 'main') {
          // Verify if decidedCredId is the Main ID (it usually is if we selected Main for a Main-only cred, or if we keyed by ID)
          // But if the diff Key was Staging ID, and we picked Main...
          // We need to know what the TARGET ID is.
          
          // Assumption: If 'main' is selected, we want to use the Main version of this credential.
          // BUT which Main credential?
          // If decidedCredId IS the Main ID, we use it.
          // If decidedCredId is Staging ID, we need to find its Main counterpart.
          
          // If decidedCredId exists in Main Cred map, it's a Main ID.
          if (mainCredentialMap.has(decidedCredId)) {
              targetId = decidedCredId;
              targetName = mainCredentialMap.get(targetId);
          } else {
              // It's likely a Staging ID. We need to find the Main equivalent.
              // This is hard without explicit mapping.
              // BUT, usually the 'source' value IS 'main' meaning "Use the Main ID associated with this diff".
              // If the diff grouped them, we don't know the Main ID here unless we re-derive it.
              
              // However, typically the UI sends the *Selected Value* as the second arg?
              // `onCredentialSelected(id, value)`
              // If I select "Main", value is 'main'.
              
              // Wait, if I select a SPECIFIC credential (e.g. from dropdown), value is the ID.
              // If I select the "Main" column header or option, value is 'main'.
              
              // If the user selected "Main", we assume they want the Main Credential found in the same context.
              // Let's try to find it by Node Name mapping.
              
              // Reverse lookup: Find Staging Node using decidedCredId, find corresponding Main Node, get its Cred ID.
              const stagingNode = stagingWorkflow.nodes.find(n => 
                  n.credentials && Object.values(n.credentials).some((c: any) => c.id === decidedCredId)
              );
              
              if (stagingNode) {
                  const mainNode = mainWorkflow.nodes.find(n => n.name === stagingNode.name);
                  if (mainNode && mainNode.credentials && stagingNode.credentials) {
                      // Find cred of same type
                      const stgCredType = Object.keys(stagingNode.credentials).find(t => stagingNode.credentials![t].id === decidedCredId);
                      if (stgCredType && mainNode.credentials[stgCredType]) {
                          targetId = mainNode.credentials[stgCredType].id;
                          targetName = mainNode.credentials[stgCredType].name;
                      }
                  }
              }
          }
      } else if (source === 'staging') {
          return; // Keep as is
      } else if (source !== 'keep-both') {
          // Explicit ID provided (e.g. user selected specific credential from dropdown)
          targetId = source;
          targetName = mainCredentialMap.get(targetId) || 'Unknown Credential'; 
      }

      if (targetId) {
          console.log(`[Merge] Target Credential ID identified: ${targetId} (${targetName})`);
          
          // We want to replace occurrences of the "Old" credential with `targetId`.
          // The "Old" credential is whatever is currently in the merged workflow (Staging base).
          // 1. If decidedCredId matches something in Staging, that's likely it.
          // 2. If decidedCredId is the *Main* ID, we need to find what corresponds to it in Staging.
          
          let idToReplace: string | undefined;
          
          // Check if decidedCredId exists in Staging
          const existsInStaging = stagingWorkflow.nodes.some(n => 
              n.credentials && Object.values(n.credentials).some((c: any) => c.id === decidedCredId)
          );

          if (existsInStaging) {
              idToReplace = decidedCredId;
          } else {
              // decidedCredId is likely Main ID. Find Staging counterpart.
              // We need to find nodes that SHOULD use this credential.
              // Strategy: Find Main nodes using targetId. Find matching Staging nodes. Get their cred ID.
              const mainNodeUsingCred = mainWorkflow.nodes.find(n => 
                  n.credentials && Object.values(n.credentials).some((c: any) => c.id === targetId)
              );
              
              if (mainNodeUsingCred && mainNodeUsingCred.credentials) {
                  const stagingNode = merged.nodes?.find(n => n.name === mainNodeUsingCred.name);
                  if (stagingNode && stagingNode.credentials) {
                       // Find cred of same type
                       // We need the type from Main node
                       const typeEntry = Object.entries(mainNodeUsingCred.credentials).find(([_, c]: [string, any]) => c.id === targetId);
                       if (typeEntry) {
                           const type = typeEntry[0];
                           if (stagingNode.credentials[type]) {
                               idToReplace = stagingNode.credentials[type].id;
                           }
                       }
                  }
              }
          }
          
          // Fallback: If we still don't have idToReplace, but we have a targetId that we want explicitly.
          // Maybe the Staging node is NEW and uses a default/dev credential we want to swap.
          // We can try to match by Credential Type?
          // If we know targetId is "Google Sheets Prod", we find its type "googleSheets".
          // We scan Staging nodes. If any uses "googleSheets" with ID !== targetId, we swap?
          // That's aggressive but might be what the user wants if they selected "Use Main" globally.
          // Let's stick to the safer mapping for now, but log warning.
          
          if (idToReplace && idToReplace !== targetId) {
              console.log(`[Merge] Replacing credential ${idToReplace} -> ${targetId}`);
              
              // SINGLE PASS: Update both ID and Name simultaneously
              // This fixes the issue where ID is updated but Name remains old if structure varies
              if (targetName) {
                  const changes = this.recursiveCredentialUpdate(
                      merged,
                      idToReplace,
                      targetId,
                      targetName
                  );
                  console.log(`[Merge] Updated ${changes} credential objects (ID & Name)`);
              } else {
                  // Fallback for ID only if name is missing (unlikely)
                  const idChanges = this.recursiveReplace(
                       merged,
                       (val) => val === idToReplace,
                       () => targetId,
                       /id|credential/i
                  );
                  console.log(`[Merge] Updated ${idChanges} credential IDs (ID only fallback)`);
              }

              // Update Auth Parameters if needed
              if (source === 'main' || source === targetId) {
                   // Copy auth settings from Main node if possible
                   // Find a Main node using this cred
                   const mainRefNode = mainWorkflow.nodes.find(n => 
                       n.credentials && Object.values(n.credentials).some((c: any) => c.id === targetId)
                   );
                   if (mainRefNode) {
                        merged.nodes?.forEach(n => {
                            // If this node uses the credential
                            if (n.credentials && Object.values(n.credentials).some((c: any) => c.id === targetId)) {
                                if (mainRefNode.parameters?.authentication) {
                                    if (!n.parameters) n.parameters = {};
                                    n.parameters.authentication = mainRefNode.parameters.authentication;
                                }
                            }
                        });
                   }
              }

          } else if (!idToReplace && existsInStaging === false) {
             console.warn(`[Merge] Could not find Staging credential to replace for target ${targetId}`);
             // This might happen if Staging has NO credential for this node yet?
             // Or if the node is new in Staging but uses a THIRD ID?
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

      if (!isWebhookDecision) {
           if (decision.selected === 'main' || decision.selected === 'custom') {
               const targetUrl = decision.url;
               let decisionApplied = false;

               // Strategy 1: Scoped Node replacement (nodeId:path)
               // This is the most reliable method if the key preserves structural info.
               if (decisionKey.includes(':') && !decisionKey.startsWith('http') && !decisionKey.startsWith('https')) {
                   // Safe split strictly on first colon
                   const firstColonIdx = decisionKey.indexOf(':');
                   const nodeId = decisionKey.substring(0, firstColonIdx);
                   const paramPath = decisionKey.substring(firstColonIdx + 1);

                   // Find node in Merged workflow
                   // Note: merged workflow nodes come from Staging. 
                   // If the ID in the key is from Main (and differs from Staging), this will fail.
                   let node = merged.nodes?.find(n => n.id === nodeId);
                   
                   // Fallback: Try finding by Name if ID lookup failed (assuming names are stable)
                   if (!node) {
                       // We can't easily access Main node name here without the full diff. 
                       // But often IDs are consistent. 
                       // If we are in the "New Files" scenario, IDs are definitely from Staging.
                       // If "Old Files", IDs *should* match unless re-created.
                   }

                   if (node) {
                       // Traverse and set
                       // Path is likely relative to `parameters` (e.g. 'url', 'authentication.password')
                       // But could be 'credentials.spotifyApi.id' ? Unlikely for domains.
                       // Let's assume `parameters` root.
                       
                       if (node.parameters) {
                           const parts = paramPath.split('.');
                           let current: any = node.parameters;
                           let validPath = true;
                           
                           // Navigate to the parent of the target property
                           for(let i=0; i<parts.length-1; i++) {
                               if (current && typeof current === 'object' && parts[i] in current) {
                                   current = current[parts[i]];
                               } else {
                                   validPath = false;
                                   break;
                               }
                           }
                           
                           if (validPath && current && typeof current === 'object') {
                               const lastPart = parts[parts.length-1];
                               // Only update if it exists or if we are sure? 
                               // N8N parameters sometimes have defaults, but usually if it was diffed, it exists.
                               console.log(`[Merge] Scoped update for node ${node.name} (${nodeId}) at ${paramPath}: ${current[lastPart]} -> ${targetUrl}`);
                               current[lastPart] = targetUrl;
                               decisionApplied = true;
                           }
                       }
                   }
               }
               
               // Strategy 2: Value-based recursive replacement (Substring/Expression support)
               // Replaces substrings to support N8N expressions like "=https://api.com/{{...}}"
               if (!decisionApplied) {
                   console.log(`[Merge] Attempting global replace for key: ${decisionKey}`);
                   
                   let replacedCount = 0;
                   
                   // Strategy 2a: Strict Substring Replacement
                   // This handles standard cases where formatting matches
                   replacedCount += this.recursiveReplace(
                       merged,
                       (val) => typeof val === 'string' && val.includes(decisionKey),
                       (val) => val.replace(decisionKey, targetUrl)
                   );

                   // Strategy 2b: Normalized Match (Ignore Whitespace)
                   // Handles cases where N8N expressions differ only by spacing
                   // e.g. {{ $json.id }} vs {{ $json.id }}
                   if (replacedCount === 0) {
                       const cleanKey = decisionKey.replace(/\s/g, '');
                       
                       replacedCount += this.recursiveReplace(
                           merged,
                           (val) => {
                               if (typeof val !== 'string') return false;
                               // We only support FULL value replacement for fuzzy matches to avoid corrupting partial strings
                               const cleanVal = val.replace(/\s/g, '');
                               return cleanVal === cleanKey || cleanVal.includes(cleanKey);
                           },
                           (val) => {
                               // If it was an exact normalized match, replace the whole string
                               const cleanVal = val.replace(/\s/g, '');
                               if (cleanVal === cleanKey) {
                                   return targetUrl;
                               }
                               // If it was a partial normalized match, we can't easily replace just the substring
                               // without potentially breaking things.
                               // But if the decisionKey is long (expression), it's likely safe to assume uniqueness.
                               // Ideally we'd map indices, but that's complex.
                               // Fallback: If cleanVal INCLUDES cleanKey, and cleanKey > 10 chars,
                               // we might be able to replace?
                               // Actually, for now, let's stick to Exact Normalized Match to be safe.
                               return val;
                           }
                       );
                       
                       // Refined Strategy 2b Implementation above was logic-only.
                       // Actual implementation:
                       replacedCount += this.recursiveReplace(
                            merged,
                            (val) => typeof val === 'string' && val.replace(/\s/g, '') === cleanKey,
                            () => targetUrl
                       );
                   }
                   
                   // Strategy 2c: Trailing slash variations
                   if (replacedCount === 0) {
                        const altKey = decisionKey.endsWith('/') ? decisionKey.slice(0, -1) : decisionKey + '/';
                        if (decisionKey.startsWith('http')) {
                             replacedCount += this.recursiveReplace(
                                merged,
                                (val) => typeof val === 'string' && val.includes(altKey),
                                (val) => val.replace(altKey, targetUrl)
                             );
                        }
                   }

                   // Strategy 3: Cross-Branch Reference (Main Workflow Lookup)
                   // If the UI Key matches the Main workflow value, but Staging has a different value (e.g. previous custom edit),
                   // we can't find the Key in Staging. We must find WHERE it is in Main, then update that path in Staging.
                   if (replacedCount === 0 && mainWorkflow && mainWorkflow.nodes) {
                       console.log(`[Merge] Strategy 3: Looking for key in Main workflow to identify path...`);
                       let foundInMain = false;
                       let targetNodeId: string | null = null;
                       let targetParamPath: string | null = null;

                       // Helper to find path to value
                       const findPath = (obj: any, currentPath: string[] = []): boolean => {
                           if (typeof obj === 'string' && (obj.includes(decisionKey) || obj.replace(/\s/g, '') === decisionKey.replace(/\s/g, ''))) {
                               return true;
                           }
                           if (typeof obj === 'object' && obj !== null) {
                               for (const k of Object.keys(obj)) {
                                   if (findPath(obj[k], [...currentPath, k])) {
                                       targetParamPath = [...currentPath, k].join('.');
                                       return true;
                                   }
                               }
                           }
                           return false;
                       };

                       for (const node of mainWorkflow.nodes) {
                           if (node.parameters && findPath(node.parameters)) {
                               targetNodeId = node.id;
                               foundInMain = true;
                               console.log(`[Merge] Found key in Main Node ${node.name} (${node.id}) at path: ${targetParamPath}`);
                               break;
                           }
                       }

                       if (foundInMain && targetNodeId && targetParamPath) {
                           // Find corresponding node in Merged (Staging) workflow
                           const stagingNode = merged.nodes?.find(n => n.id === targetNodeId);
                           if (stagingNode && stagingNode.parameters) {
                               // Update the value at the found path
                               const parts = (targetParamPath as string).split('.');
                               let current: any = stagingNode.parameters;
                               let validPath = true;
                               
                               for(let i=0; i<parts.length-1; i++) {
                                   if (current && typeof current === 'object' && parts[i] in current) {
                                       current = current[parts[i]];
                                   } else {
                                       validPath = false;
                                       break;
                                   }
                               }

                               if (validPath && current && typeof current === 'object') {
                                   const lastPart = parts[parts.length-1];
                                   console.log(`[Merge] Strategy 3 Success: Updating Staging node ${stagingNode.name} at ${targetParamPath}`);
                                   // We overwrite with the target URL since we matched the logical location
                                   current[lastPart] = targetUrl;
                                   replacedCount++;
                               }
                           }
                       }
                   }
                   
                   if (replacedCount > 0) {
                       console.log(`[Merge] Applied ${replacedCount} domain replacements (including fuzzy/cross-branch matches)`);
                       decisionApplied = true;
                   }
               }

               if (!decisionApplied) {
                   console.warn(`[Merge] FAILED to apply domain decision: ${decisionKey} -> ${targetUrl}`);
               }
           }
      } else {
          // Webhook handling
          let decisionApplied = false;
          let targetMethod = 'GET';
          const methodMatch = decision.url.match(/^([A-Z]+)\s+/);
          if (methodMatch) targetMethod = methodMatch[1];
          const finalPath = isWebhookDecision && decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)
              ? decision.url.match(/^[A-Z]+\s+(.+)\s+\(Webhook\)$/)![1]
              : targetUrl;
              
          if (decisionKey.startsWith('webhook:')) {
              const nodeId = decisionKey.split(':')[1];
              const node = merged.nodes?.find(n => n.id === nodeId);
              if (node && node.parameters) {
                  console.log(`[Merge] Updating webhook node ${node.name}: path=${finalPath}, method=${targetMethod}`);
                  node.parameters.path = finalPath;
                  node.parameters.httpMethod = targetMethod;
              }
          } else {
              merged.nodes?.forEach(node => {
                  if (node.type.includes('webhook') && node.parameters) {
                      const currentPath = node.parameters.path;
                      const currentMethod = node.parameters.httpMethod || 'GET';
                      const currentKey = `${currentMethod} ${currentPath} (Webhook)`;
                      
                      if (currentKey === decisionKey || node.parameters.path === decisionPath) {
                          node.parameters.path = finalPath;
                          node.parameters.httpMethod = targetMethod;
                          console.log(`[Merge] Updated webhook ${node.name} via path match`);
                          decisionApplied = true;
                      }
                  }
              });

              // Fallback: If not found in merged (staging), try looking up key in Main workflow
              if (!decisionApplied && mainWorkflow && mainWorkflow.nodes) {
                  console.log(`[Merge] Webhook match failed in Staging. Looking for key in Main workflow: ${decisionKey}`);
                  let targetNodeId: string | null = null;
                  
                  // Look for the node in Main that generates this key
                  for (const node of mainWorkflow.nodes) {
                       if (node.type.includes('webhook') && node.parameters) {
                          const currentPath = node.parameters.path;
                          const currentMethod = node.parameters.httpMethod || 'GET';
                          const currentKey = `${currentMethod} ${currentPath} (Webhook)`;
                          
                          if (currentKey === decisionKey || node.parameters.path === decisionPath) {
                              targetNodeId = node.id;
                              console.log(`[Merge] Found matching webhook in Main: ${node.name} (${node.id})`);
                              break;
                          }
                       }
                  }

                  if (targetNodeId) {
                       const stagingNode = merged.nodes?.find(n => n.id === targetNodeId);
                       if (stagingNode && stagingNode.parameters) {
                           console.log(`[Merge] Updating Staging webhook ${stagingNode.name} via Main ID lookup`);
                           stagingNode.parameters.path = finalPath;
                           stagingNode.parameters.httpMethod = targetMethod;
                           decisionApplied = true;
                       }
                  }
              }
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
    workflowCallDecisions: Record<string, 'add' | 'remove' | 'keep' | { action: 'map'; targetId: string; targetName?: string }>
  ): void {
    console.log('[Merge] Applying workflow call decisions:', workflowCallDecisions);
    
    if (!workflowCallDecisions || Object.keys(workflowCallDecisions).length === 0) {
      console.log('[Merge] No workflow call decisions to apply');
      return;
    }

    // Process each workflow call decision
    Object.entries(workflowCallDecisions).forEach(([callKey, action]) => {
      // callKey format: "sourceWorkflow->targetWorkflow"
      const parts = callKey.split('->');
      if (parts.length !== 2) {
        return;
      }
      
      const [sourceWorkflow, targetWorkflow] = parts;
      
      merged.nodes?.forEach((node) => {
        if (node.type === 'n8n-nodes-base.executeWorkflow' || node.type.includes('executeWorkflow')) {
          // node.parameters.workflowId can be a String OR an Object (Resource Locator)
          const rawParam = node.parameters?.workflowId;
          const nodeTargetId = (typeof rawParam === 'object' && rawParam !== null) ? rawParam.value : rawParam;

          // Check if this node matches the decision target
          if (nodeTargetId === targetWorkflow) {
            if (action === 'remove') {
              node.disabled = true;
            } else if (action === 'add') {
              node.disabled = false;
            } else if (typeof action === 'object' && action.action === 'map') {
               console.log(`[Merge] Remapping ${node.name}: ${targetWorkflow} -> ${action.targetId} (${action.targetName})`);
               
               if (node.parameters) {
                   if (typeof node.parameters.workflowId === 'object' && node.parameters.workflowId !== null) {
                       // Preserve object structure, update fields
                       node.parameters.workflowId.value = action.targetId;
                       if (action.targetName) {
                           node.parameters.workflowId.cachedResultName = action.targetName;
                       }
                       node.parameters.workflowId.cachedResultUrl = `/workflow/${action.targetId}`;
                   } else {
                       // It's just a string, direct update
                       node.parameters.workflowId = action.targetId;
                   }
               }
            }
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
