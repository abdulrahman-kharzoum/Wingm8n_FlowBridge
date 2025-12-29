import { Octokit } from '@octokit/rest';
import { extractCredentials, extractDomains, extractWorkflowCalls, detectHardcodedSecrets, extractMetadata, compareMetadata, compareNodes, getCredentialReplacements } from '@shared/utils/workflow-parser';
import { createGitHubService, fetchBranchWorkflows } from './github.service';
import type { Credential } from '@shared/types/workflow.types';

export interface WorkflowFileAnalysis {
  filename: string;
  status: string;
  base: WorkflowAnalysisData | null;
  head: WorkflowAnalysisData | null;
  secrets?: string[];
}

export interface WorkflowAnalysisData {
  content?: any; // Store raw content for diffing
  credentials: any[];
  domains: any[];
  workflowCalls: {
    workflow: string;
    calls: any[];
    calledBy: any[];
  };
  metadata: any;
}

export interface PRAnalysisResult {
  pr: {
    number: number;
    title: string;
    base: string;
    head: string;
    state: string;
  };
  filesChanged: number;
  analysis: {
    credentials: any[];
    domains: any[];
    workflowCalls: any[];
    secrets: string[];
    metadata: any[];
    nodeChanges: any[];
    addedWorkflows?: Array<{ name: string; id?: string; filename: string }>;
  };
}

export class PRAnalyzerService {
  private octokit: Octokit;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.octokit = new Octokit({
      auth: accessToken,
      request: {
        headers: {
          'If-None-Match': '', // Prevent caching
          'Cache-Control': 'no-cache',
        },
      },
    });
  }

  async analyzePR(owner: string, repo: string, prNumber: number): Promise<PRAnalysisResult> {
    try {
      // 1. Fetch PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      // 2. Get list of changed files
      const { data: files } = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      // 3. Filter for N8N workflow JSON files
      const workflowFiles = files.filter(
        file => file.filename.endsWith('.json') &&
                (file.filename.includes('workflow') ||
                 file.filename.includes('.n8n') ||
                 file.status === 'added' ||
                 file.status === 'modified')
      );

      // 3.5 Fetch all main branch workflows to build credential registry
      const allMainCredentials = new Map<string, Credential[]>(); // Type -> Credential[]
      try {
          const ghService = createGitHubService(this.accessToken);
          // Fetch all workflows from base branch (recursively)
          const mainWorkflows = await fetchBranchWorkflows(ghService, owner, repo, pr.base.ref);
          
          mainWorkflows.workflows.forEach(w => {
              const creds = extractCredentials(w.content);
              creds.forEach(c => {
                  if (!allMainCredentials.has(c.type)) {
                      allMainCredentials.set(c.type, []);
                  }
                  // Avoid duplicates by ID
                  const existingList = allMainCredentials.get(c.type)!;
                  if (!existingList.some(ex => ex.id === c.id)) {
                      existingList.push(c);
                  }
              });
          });
          console.log(`[PR Analyzer] Registry built with ${allMainCredentials.size} credential types from Main branch.`);
      } catch (e) {
          console.error('[PR Analyzer] Failed to fetch main branch workflows for credential registry:', e);
          // Proceed without registry (alternatives will be empty)
      }

      // 4. Fetch content of each changed workflow
      const analysisResults = await Promise.all(
        workflowFiles.map(async (file) => {
          let baseContent: any = null;
          let headContent: any = null;
          let secrets: string[] = [];

          try {
            // Base version (main/production)
            if (file.status !== 'added') {
              try {
                const { data: baseFile } = await this.octokit.repos.getContent({
                  owner,
                  repo,
                  path: file.filename,
                  ref: pr.base.sha,
                });
                
                if ('content' in baseFile) {
                  const content = Buffer.from(baseFile.content, 'base64').toString('utf-8');
                  baseContent = JSON.parse(content);
                }
              } catch (e) {
                console.warn(`Could not fetch base content for ${file.filename}`);
              }
            }

            // Head version (staging)
            if (file.status !== 'removed') {
              try {
                const { data: headFile } = await this.octokit.repos.getContent({
                  owner,
                  repo,
                  path: file.filename,
                  ref: pr.head.sha,
                });
                
                if ('content' in headFile) {
                  const content = Buffer.from(headFile.content, 'base64').toString('utf-8');
                  headContent = JSON.parse(content);
                  
                  // Detect secrets in the new version
                  secrets = detectHardcodedSecrets(headContent);
                }
              } catch (e) {
                console.warn(`Could not fetch head content for ${file.filename}`);
              }
            }

            // 5. Analyze both versions
            return {
              filename: file.filename,
              status: file.status,
              base: baseContent ? {
                content: baseContent,
                credentials: extractCredentials(baseContent),
                domains: extractDomains(baseContent, file.filename),
                workflowCalls: extractWorkflowCalls(baseContent, file.filename),
                metadata: extractMetadata(baseContent),
              } : null,
              head: headContent ? {
                content: headContent,
                credentials: extractCredentials(headContent),
                domains: extractDomains(headContent, file.filename),
                workflowCalls: extractWorkflowCalls(headContent, file.filename),
                metadata: extractMetadata(headContent),
              } : null,
              secrets
            };
          } catch (error) {
            console.error(`Failed to analyze ${file.filename}:`, error);
            return null;
          }
        })
      );

      // 6. Aggregate and deduplicate results
      const validResults = analysisResults.filter((r): r is any => r !== null) as WorkflowFileAnalysis[];
      const aggregated = this.aggregateAnalysis(validResults, allMainCredentials);

      return {
        pr: {
          number: pr.number,
          title: pr.title,
          base: pr.base.ref,
          head: pr.head.ref,
          state: pr.state,
        },
        filesChanged: workflowFiles.length,
        analysis: aggregated,
      };

    } catch (error) {
      console.error('PR comparison failed:', error);
      throw new Error('Failed to compare PR');
    }
  }

  private aggregateAnalysis(results: WorkflowFileAnalysis[], credentialRegistry: Map<string, Credential[]> = new Map()) {
    const credentials = new Map();
    const domains = new Map();
    const workflowCalls = new Map();
    const addedWorkflows: Array<{ name: string; id?: string; filename: string }> = [];

    // Helper to normalize webhook keys for comparison
    const getDomainKey = (domain: any) => {
        // We use nodeId:parameterPath as a primary key for "same entity",
        // but we'll handle the URL value matching in the aggregation logic
        if (domain.nodeId && domain.parameterPath) {
             return `${domain.nodeId}:${domain.parameterPath}`;
        }
        return domain.url;
    };

    const secrets: string[] = [];
    const metadataDiffs: any[] = [];
    const nodeDiffs: any[] = [];

    // 0. Build a Workflow Registry (ID -> Name) from all analyzed files
    // This helps us resolve "Stale" cached names in Workflow Calls
    const workflowRegistry = new Map<string, string>(); // ID -> Real Name
    
    // Also include main workflows if available? 
    // We don't have IDs for all main workflows easily unless we fetched them all.
    // But we have `credentialRegistry` which came from main workflows... 
    // We should ideally have passed the main workflows list or a map of them.
    // For now, let's at least register the files IN THIS PR (Base and Head).
    
    results.forEach(res => {
        if (res.base?.content?.id) {
            workflowRegistry.set(res.base.content.id, res.base.content.name);
        }
        if (res.head?.content?.id) {
            workflowRegistry.set(res.head.content.id, res.head.content.name);
        }
    });

    for (const result of results) {
        // Collect Added Workflows
        if (result.status === 'added' && result.head?.content) {
            addedWorkflows.push({
                name: result.head.content.name || result.filename,
                id: result.head.content.id, // Only if exposed in root, otherwise undefined
                filename: result.filename
            });
        }

        // Compare Metadata and Nodes if both versions exist
        if (result.base?.content && result.head?.content) {
            // compareMetadata(staging, main) -> compareMetadata(head, base)
            const mDiffs = compareMetadata(result.head.metadata, result.base.metadata);
            if (mDiffs.length > 0) {
                metadataDiffs.push({
                    filename: result.filename,
                    diffs: mDiffs
                });
            }

            // compareNodes(staging, main) -> compareNodes(head, base)
            // This ensures Old=Main (Base), New=Staging (Head) in the diff output
            const nDiffs = compareNodes(result.head.content, result.base.content);
            if (nDiffs.length > 0) {
                nodeDiffs.push({
                    filename: result.filename,
                    diffs: nDiffs
                });
            }
        }

      if (result.secrets) {
        secrets.push(...result.secrets);
      }

      // Detect credential replacements
      // getCredentialReplacements(staging, main) -> (head, base)
      const replacements = new Map<string, string>(); // mainId -> stagingId
      if (result.base?.content && result.head?.content) {
          const fileReplacements = getCredentialReplacements(result.head.content, result.base.content);
          fileReplacements.forEach((stagingId, mainId) => replacements.set(mainId, stagingId));
      }

      // Aggregate credentials
      // First pass: Process Main credentials (from Base)
      if (result.base?.credentials) {
        result.base.credentials.forEach((cred: any) => {
          // Check if this credential was replaced by another one in Staging
          const replacedByStagingId = replacements.get(cred.id);
          
          if (replacedByStagingId) {
             // This credential was replaced. We will handle it when processing Staging credentials
             // OR we can create a special key linking them.
             // Let's use the MAIN credential ID as the primary key if it exists
             if (credentials.has(cred.id)) {
                 // Already exists (from another file), just add the filename
                 const existing = credentials.get(cred.id);
                 if (!existing.files.includes(result.filename)) {
                     existing.files.push(result.filename);
                 }
             } else {
                 credentials.set(cred.id, {
                    ...cred,
                    id: cred.id, // Use Main ID as the base ID for the diff entry
                    mainId: cred.id,
                    stagingId: replacedByStagingId,
                    inMain: true,
                    inStaging: false, // Will be set to true when we process the replacement
                    files: [result.filename],
                    mainName: cred.name,
                    mainNodeAuthType: cred.nodeAuthType,
                 });
             }
          } else {
             if (!credentials.has(cred.id)) {
                credentials.set(cred.id, {
                  ...cred,
                  mainType: cred.type,
                  inMain: true,
                  inStaging: false,
                  files: [result.filename],
                  mainName: cred.name,
                  mainNodeAuthType: cred.nodeAuthType,
                });
             } else {
                // Add filename if not already present
                const existing = credentials.get(cred.id);
                if (!existing.files.includes(result.filename)) {
                    existing.files.push(result.filename);
                }
             }
          }
        });
      }
      
      // Second pass: Process Staging credentials (from Head)
      if (result.head?.credentials) {
        result.head.credentials.forEach((cred: any) => {
          // Check if this credential replaces a Main credential
          // Check if this credential replaces ANY Main credentials
          const replacedMainIds: string[] = [];
          replacements.forEach((sId, mId) => {
              if (sId === cred.id) {
                  replacedMainIds.push(mId);
              }
          });

          // Update all replaced entries
          replacedMainIds.forEach(mId => {
              const existing = credentials.get(mId);
              if (existing) {
                  existing.inStaging = true;
                  existing.stagingName = cred.name;
                  existing.stagingId = cred.id; // Explicitly set staging ID
                  existing.name = cred.name;
                  existing.stagingType = cred.type;
                  existing.mainType = existing.type; // Current type is main type
                  existing.stagingNodeAuthType = cred.nodeAuthType;
                  if (!existing.files.includes(result.filename)) {
                      existing.files.push(result.filename);
                  }
              }
          });

          // Handle the credential itself (either as a continuation or a new entry)
          const key = cred.id;
          const isReplacement = replacedMainIds.length > 0;

          if (credentials.has(key)) {
            // It exists in Main with the SAME ID (Continuation)
            if (isReplacement) {
              // If this credential is used to replace OTHER credentials, we prioritize that relationship.
              // We remove the self-match entry to avoid "ghosting" or duplicates where the credential
              // appears both as a replacement target and as a standalone row.
              // The user prefers to see only the replacement row.
              credentials.delete(key);
            } else {
              // Normal continuation
              const existing = credentials.get(key);
              existing.inStaging = true;
              existing.stagingName = cred.name;
              existing.name = cred.name;
              existing.stagingType = cred.type;
              existing.mainType = existing.type;
              existing.stagingNodeAuthType = cred.nodeAuthType;
              if (!existing.files.includes(result.filename)) {
                existing.files.push(result.filename);
              }
            }
          } else {
            // It does NOT exist in Main
            // Check if this credential SHOULD be associated with a Main credential even if IDs don't match
            // This happens when a credential is "replaced" in the workflow JSON (different ID), but we want to display it as a modification of the old one.
            // We already handled 'replacedMainIds' above. If 'isReplacement' is true, the work is done (attached to the Main ID).
            
            // However, the issue described is that we see TWO rows:
            // 1. "Cloud Supabase (Main) -> Not Present (Staging)"
            // 2. "Not Present (Main) -> Cloud Supabase Staging (Staging)"
            // This happens because 'replacedByStagingId' wasn't detected correctly or 'replacements' map is incomplete.
            
            // If we missed the replacement link earlier, we might have a "New" credential here that is actually replacing an "Old" one.
            // We can try to fuzzy match by Name or Type within the same file?
            // BUT, if 'isReplacement' is false, it means we didn't find a direct replacement link.
            
            if (!isReplacement) {
                // Check if there's an "Orphaned" Main credential of the SAME TYPE in the SAME FILE
                // that doesn't have a Staging counterpart yet.
                // This is a heuristic to merge "Split" rows.
                
                let foundMatch = false;
                
                // Iterate over existing credentials to find a candidate
                // Use Array.from or forEach to avoid iterator issues with target config
                const entries = Array.from(credentials.entries());
                for (const [existingId, existing] of entries) {
                    // @ts-ignore
                    if (existing.inMain && !existing.inStaging &&
                        // @ts-ignore
                        existing.files.includes(result.filename) &&
                        // @ts-ignore
                        existing.type === cred.type) {
                        
                        // Found a candidate: Same Type, Same File, currently marked as "Removed" from Staging
                        // We will assume this New Staging credential replaces this Old Main credential.
                        console.log(`[PR Analyzer] Heuristic Merge: Linking new ${cred.name} (${cred.id}) to old ${// @ts-ignore
                        existing.name} (${existingId})`);
                        
                        // @ts-ignore
                        existing.inStaging = true;
                        // @ts-ignore
                        existing.stagingName = cred.name;
                        // @ts-ignore
                        existing.stagingId = cred.id;
                        // @ts-ignore
                        existing.name = cred.name; // Use new name
                        // @ts-ignore
                        existing.stagingType = cred.type;
                        // @ts-ignore
                        existing.stagingNodeAuthType = cred.nodeAuthType;
                        
                        foundMatch = true;
                        break; // Only match one
                    }
                }
                
                if (!foundMatch) {
                    credentials.set(key, {
                        ...cred,
                        inMain: false,
                        inStaging: true,
                        files: [result.filename],
                        stagingName: cred.name,
                        stagingType: cred.type,
                        stagingNodeAuthType: cred.nodeAuthType,
                    });
                }
            }
          }
        });
      }

      // Aggregate domains
      // Main (Base)
      if (result.base?.domains) {
        result.base.domains.forEach((domain: any) => {
          const key = getDomainKey(domain);
          if (!domains.has(key)) {
            domains.set(key, {
                ...domain,
                inMain: true,
                inStaging: false,
                mainUrl: domain.url, // Explicitly set mainUrl
                files: [result.filename]
            });
          } else {
             const existing = domains.get(key);
             if (!existing.files.includes(result.filename)) {
                 existing.files.push(result.filename);
             }
          }
        });
      }

      // Staging (Head)
      if (result.head?.domains) {
        result.head.domains.forEach((domain: any) => {
          const key = getDomainKey(domain);
          if (domains.has(key)) {
            const existing = domains.get(key);
            existing.inStaging = true;
            existing.stagingUrl = domain.url; // Explicitly set stagingUrl on existing
            if (!existing.files.includes(result.filename)) {
                existing.files.push(result.filename);
            }
          } else {
             // Heuristic: If it's a "New" domain, check if there's an "Orphaned" Main domain
             // (in Main but not Staging) from the SAME FILE that we can link to.
             
             let foundMatch = false;
             
             // If we rely on URL as fallback key, and URL changed, we get a new Key.
             // We want to find if there is an existing Main domain that:
             // 1. Is in the same file
             // 2. Is currently marked as "Removed" (inMain=true, inStaging=false)
             // 3. Has a matching Node ID (if available) OR is the "only" other URL change in that file (riskier)
             
             // NOTE: 'domains' is a Map. We can iterate it.
             for (const [existingKey, existing] of Array.from(domains.entries())) {
                 if (existing.inMain && !existing.inStaging && existing.files.includes(result.filename)) {
                     // Check for Node ID match if available in both
                     if (domain.nodeId && existing.nodeId && domain.nodeId === existing.nodeId) {
                         // Strong match! Same Node ID, different URL (implied by different Key)
                         // We merge this new Staging domain into the existing Main domain entry
                         
                         existing.inStaging = true;
                         existing.stagingUrl = domain.url;
                         // We keep the Key as the Main one (usually) or we might need to re-key?
                         // If we keep the old Key, we just updated the value.
                         
                         foundMatch = true;
                         break;
                     }
                     
                     // Weak match: If neither has Node ID (or one missing), and we want to assume
                     // "Change" if it's in the same file?
                     // Let's be conservative: Only match if we are fairly sure.
                     // If Parameter Path matches?
                     if (domain.parameterPath && existing.parameterPath && domain.parameterPath === existing.parameterPath) {
                          // Likely same field
                          existing.inStaging = true;
                          existing.stagingUrl = domain.url;
                          foundMatch = true;
                          break;
                     }
                 }
             }
             
             if (!foundMatch) {
                domains.set(key, {
                    ...domain,
                    inMain: false,
                    inStaging: true,
                    stagingUrl: domain.url, // Explicitly set stagingUrl
                    files: [result.filename]
                });
             }
          }
        });
      }

      // Aggregate workflow calls
      // Main (Base)
      if (result.base?.workflowCalls && result.base.workflowCalls.calls) {
        result.base.workflowCalls.calls.forEach((call: any) => {
          // Resolve Stale Name
          if (call.targetWorkflow && workflowRegistry.has(call.targetWorkflow)) {
             call.targetWorkflowName = workflowRegistry.get(call.targetWorkflow);
          }

          const key = `${call.sourceWorkflow}-${call.targetWorkflow}`;
          if (!workflowCalls.has(key)) {
            workflowCalls.set(key, { ...call, inMain: true, inStaging: false, files: [result.filename] });
          } else {
              const existing = workflowCalls.get(key);
              if (!existing.files.includes(result.filename)) {
                  existing.files.push(result.filename);
              }
          }
        });
      }

      // Staging (Head)
      if (result.head?.workflowCalls && result.head.workflowCalls.calls) {
        result.head.workflowCalls.calls.forEach((call: any) => {
           // Resolve Stale Name
           if (call.targetWorkflow && workflowRegistry.has(call.targetWorkflow)) {
              console.log(`[PR Analyzer] Resolved stale workflow name for call target ${call.targetWorkflow}: "${call.targetWorkflowName}" -> "${workflowRegistry.get(call.targetWorkflow)}"`);
              call.targetWorkflowName = workflowRegistry.get(call.targetWorkflow);
           }

          const key = `${call.sourceWorkflow}-${call.targetWorkflow}`;
          if (workflowCalls.has(key)) {
            const existing = workflowCalls.get(key);
            existing.inStaging = true;
            // Also update Name in existing entry if this call is fresher/better?
            if (call.targetWorkflowName && existing.targetWorkflowName !== call.targetWorkflowName) {
                existing.targetWorkflowName = call.targetWorkflowName; // Take the latest/resolved name
            }

            if (!existing.files.includes(result.filename)) {
                existing.files.push(result.filename);
            }
          } else {
            workflowCalls.set(key, { ...call, inMain: false, inStaging: true, files: [result.filename] });
          }
        });
      }
    }

    // Filter out credentials that are identical in both branches (unchanged)
    const filteredCredentials = Array.from(credentials.values()).filter(cred => {
        // If it's only in one branch, keep it (New or Removed)
        if (!cred.inMain || !cred.inStaging) return true;

        // If ids are different (Replacement), keep it
        if (cred.mainId && cred.stagingId && cred.mainId !== cred.stagingId) return true;

        // If names are different (Renamed), keep it
        if (cred.mainName !== cred.stagingName) return true;

        // Otherwise, it's identical (Unchanged), so hide it
        return false;
    });

    // Enrich credentials with alternatives
    const enrichedCredentials = filteredCredentials.map(cred => {
        const type = cred.stagingType || cred.mainType;
        let alternatives: Credential[] = [];
        
        if (type && credentialRegistry.has(type)) {
            // Get all credentials of this type from Main
            const allOfSameType = credentialRegistry.get(type)!;
            
            // Filter out the ones that are already represented as "Main" or "Staging" in this diff item
            alternatives = allOfSameType.filter(alt =>
                alt.id !== cred.mainId && alt.id !== cred.stagingId
            );
        }
        
        return {
            ...cred,
            alternatives
        };
    });

    // Filter out domains that are identical in both branches
    const filteredDomains = Array.from(domains.values()).filter(domain => {
        // If it's only in one branch, keep it (New or Removed)
        if (!domain.inMain || !domain.inStaging) return true;

        // If the URL has changed (e.g. for Webhooks where we match by Node ID), keep it
        if (domain.mainUrl !== domain.stagingUrl) return true;

        // Otherwise, it's identical, so hide it
        return false;
    });

    // Filter out workflow calls that are identical in both branches
    const filteredWorkflowCalls = Array.from(workflowCalls.values()).filter(call => {
        // If it's only in one branch, keep it (Added or Removed)
        if (!call.inMain || !call.inStaging) return true;

        // If it exists in both, it's unchanged.
        // We assume source/target workflow IDs are the identity.
        return true; // Keep unchanged workflow calls too so users can see the full graph
    });

    return {
      credentials: enrichedCredentials,
      domains: filteredDomains,
      workflowCalls: filteredWorkflowCalls,
      secrets: Array.from(new Set(secrets)), // Deduplicate secrets
      metadata: metadataDiffs,
      nodeChanges: nodeDiffs,
      addedWorkflows
    };
  }
}

export function createPRAnalyzerService(accessToken: string): PRAnalyzerService {
  return new PRAnalyzerService(accessToken);
}