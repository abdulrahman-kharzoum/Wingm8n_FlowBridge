import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { createN8nService } from '../services/n8n.service';
import { GitHubService, fetchBranchWorkflows } from '../services/github.service';

const n8nService = createN8nService();

export const n8nRouter = router({
  getWorkflows: publicProcedure
    .input(z.object({
        owner: z.string(),
        repo: z.string()
    }))
    .query(async ({ ctx, input }) => {
        // Fetch Workflows from GitHub Main Branch
        // 1. Get Token
        const token = (ctx as any).user?.githubToken;
         if (!token) {
             throw new Error("Authentication required to access GitHub for workflows");
         }
        const ghService = new GitHubService(token);

        try {
            const mainWorkflows = await fetchBranchWorkflows(ghService, input.owner, input.repo, 'main');
            return mainWorkflows.workflows.map(w => ({
                id: w.content.id ? w.content.id.toString() : w.name, // Use ID if available, else filename
                name: w.content.name,
                active: w.content.active || false
            }));
        } catch (error) {
            console.error('[N8N Router] Failed to fetch workflows from main:', error);
            // Return empty list or throw?
            // If main doesn't have workflows or fails, we return empty so the UI doesn't break, 
            // but user should know.
            return [];
        }
    }),

  createWorkflow: publicProcedure
    .input(z.object({
        workflow: z.any() 
    }))
    .mutation(async ({ input }) => {
      return await n8nService.createWorkflow(input.workflow);
    }),

  createWorkflowViaWebhook: publicProcedure
    .input(z.object({
        name: z.string(),
        workflowJson: z.any().optional()
    }))
    .mutation(async ({ input }) => {
        const payload = input.workflowJson || { 
            name: input.name, 
            nodes: [], 
            connections: {}, 
            settings: {} 
        };
        // Ensure name is set in payload 
        payload.name = input.name;
        
        return await n8nService.createWorkflow(payload);
    }),

  syncWorkflowsFromBranch: publicProcedure
    .input(z.object({
        owner: z.string(),
        repo: z.string(),
        branchName: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
        try {
            const token = (ctx as any).user?.githubToken;
             if (!token) {
                 throw new Error("Authentication required to access GitHub");
             }
             
             const ghService = new GitHubService(token);
             
             console.log(`[syncWorkflowsFromBranch] Fetching workflows from branch ${input.branchName}`);
             const branchWorkflows = await fetchBranchWorkflows(ghService, input.owner, input.repo, input.branchName);
             console.log(`[syncWorkflowsFromBranch] Found ${branchWorkflows.workflows.length} workflows`);

             const results = [];
             for (const workflow of branchWorkflows.workflows) {
                 console.log(`[syncWorkflowsFromBranch] Syncing workflow: ${workflow.content.name}`);
                 try {
                     await n8nService.syncWorkflowViaWebhook(workflow.content);
                     results.push({ name: workflow.content.name, status: 'success' });
                 } catch (e: any) {
                     console.error(`[syncWorkflowsFromBranch] Failed to sync ${workflow.content.name}:`, e);
                     results.push({ name: workflow.content.name, status: 'error', message: e.message });
                 }
             }

             return { success: true, results };
        } catch (error: any) {
            console.error('[syncWorkflowsFromBranch] Error:', error);
            throw new Error(error.message || 'Failed to sync workflows from branch');
        }
    }),

  createWorkflowFromMapping: publicProcedure
    .input(z.object({
        owner: z.string(),
        repo: z.string(),
        prNumber: z.number(),
        targetName: z.string(),
        targetId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
         try {
             // Assuming ctx.user has the token. If not, we might need to adjust based on actual auth implementation.
             // fallback to a process env token if user token not present? Or fail.
             const token = (ctx as any).user?.githubToken;
             
             if (!token) {
                 throw new Error("Authentication required to access GitHub");
             }
             
             const ghService = new GitHubService(token);
             
             // Get PR details to find head ref
             console.log(`[createWorkflowFromMapping] Fetching PR ${input.prNumber} for ${input.owner}/${input.repo}`);
             const pr = await ghService.getPullRequest(input.owner, input.repo, input.prNumber);
             const headBranch = pr.head.ref;
             console.log(`[createWorkflowFromMapping] PR Head Branch: ${headBranch}`);
             
             // Fetch all workflows from that branch
             const branchWorkflows = await fetchBranchWorkflows(ghService, input.owner, input.repo, headBranch);
             console.log(`[createWorkflowFromMapping] Found ${branchWorkflows.workflows.length} workflows in branch`);
             
             // Find the workflow matching the targetId (preferred) or targetName
             // targetName might be "staging - My Flow" or "My Flow"
             // The file name might not match exactly, we check the content name
             const match = branchWorkflows.workflows.find(w => {
                 if (input.targetId && w.content.id === input.targetId) return true;
                 return w.content.name === input.targetName || w.content.name === `staging - ${input.targetName}`;
             });
             
             if (!match) {
                 console.error(`[createWorkflowFromMapping] Workflow "${input.targetName}" (ID: ${input.targetId}) not found. Available:`, branchWorkflows.workflows.map(w => `${w.content.name} (${w.content.id})`));
                 throw new Error(`Workflow with name "${input.targetName}" not found in PR branch ${headBranch}`);
             }
             
             // Create in N8N
             console.log(`[createWorkflowFromMapping] Creating workflow "${match.content.name}" in N8N...`);
             const result = await n8nService.createWorkflow(match.content);
             console.log(`[createWorkflowFromMapping] Created workflow ID: ${result.id}`);
             return result;
         } catch (error: any) {
             console.error('[createWorkflowFromMapping] Error:', error);
             throw new Error(error.message || 'Failed to create workflow from mapping');
         }
    }),

  createStagingCredential: publicProcedure
    .input(z.object({
        type: z.enum(['supabase', 'respondio', 'postgres']),
        data: z.record(z.string(), z.any())
    }))
    .mutation(async ({ input }) => {
        return await n8nService.createCredentialViaWebhook(input.type, input.data);
    }),

  createStagingEnvironment: publicProcedure
    .input(z.object({
        credentials: z.record(z.string(), z.string()) // Mapping: Credential Type -> New Credential ID
    }))
    .mutation(async ({ input }) => {
        try {
            console.log('[createStagingEnvironment] Step 1: Fetching dev workflows...');
            const devWorkflows = await n8nService.fetchDevWorkflows();
            console.log(`[createStagingEnvironment] Found ${devWorkflows.length} dev workflows.`);

            const results = [];

            for (const workflow of devWorkflows) {
                try {
                    // Step 2: Rename Workflow
                    // "dev - Name" -> "staging - Name"
                    let newName = workflow.name;
                    if (newName.startsWith('dev - ')) {
                        newName = newName.replace('dev - ', 'staging - ');
                    } else if (!newName.startsWith('staging - ')) {
                        newName = `staging - ${newName}`;
                    }

                    // Deep clone to avoid mutating original if cached/shared (though fetch returns new obj)
                    const stagingWorkflow = JSON.parse(JSON.stringify(workflow));
                    stagingWorkflow.name = newName;
                    stagingWorkflow.id = undefined; // Ensure new ID

                    // Step 3: Replace Credentials
                    if (stagingWorkflow.nodes) {
                        for (const node of stagingWorkflow.nodes) {
                            if (node.credentials) {
                                for (const [credType, credConfig] of Object.entries(node.credentials)) {
                                    // Check if we have a new credential ID for this type
                                    // credType is the credential name used in N8N node definition (e.g. 'postgres', 'supabaseApi')
                                    // The user provided input.credentials keys should match these types or we need a mapping.
                                    // Assuming direct match or simplified types like 'postgres', 'supabase', 'respondio'
                                    
                                    // Helper to match types loosely
                                    const targetCredId = input.credentials[credType] ||
                                                         (credType.includes('postgres') ? input.credentials['postgres'] : undefined) ||
                                                         (credType.includes('supabase') ? input.credentials['supabase'] : undefined) ||
                                                         (credType.includes('respond') ? input.credentials['respondio'] : undefined);

                                    if (targetCredId) {
                                        console.log(`[createStagingEnvironment] Replacing ${credType} credential in node ${node.name} with ${targetCredId}`);
                                        // Update the credential ID.
                                        // Structure: node.credentials[credType] = { id: "...", name: "..." }
                                        // We only update the ID. Name is often just for display in UI, but we can set it to 'Staging Credential'
                                        (node.credentials[credType] as any).id = targetCredId;
                                    }
                                }
                            }
                        }
                    }

                    // Create the new Staging Workflow
                    console.log(`[createStagingEnvironment] Creating staging workflow: ${newName}`);
                    const result = await n8nService.createWorkflow(stagingWorkflow);
                    results.push({ originalName: workflow.name, stagingName: result.name, status: 'success' });

                } catch (e: any) {
                    console.error(`[createStagingEnvironment] Failed to process workflow ${workflow.name}:`, e);
                    results.push({ originalName: workflow.name, status: 'error', message: e.message });
                }
            }

            return { success: true, results };

        } catch (error: any) {
            console.error('[createStagingEnvironment] Error:', error);
            throw new Error(error.message || 'Failed to create staging environment');
        }
    }),

  generateGraphSuggestion: publicProcedure
    .input(z.object({
        owner: z.string(),
        repo: z.string(),
        stagingCalls: z.array(z.object({
            sourceWorkflow: z.string(),
            targetWorkflow: z.string(), // This is the ID in Staging (or Name if ID not found, but usually ID)
            targetWorkflowName: z.string().optional()
        }))
    }))
    .mutation(async ({ ctx, input }) => {
        // Fetch Workflows from GitHub Main Branch
        // 1. Get Token
        const token = (ctx as any).user?.githubToken;
         if (!token) {
             throw new Error("Authentication required to access GitHub for suggestions");
         }
        const ghService = new GitHubService(token);

        // 2. Fetch Main Branch Workflows
        const mainWorkflows = await fetchBranchWorkflows(ghService, input.owner, input.repo, 'main');
        
        // 3. Map Name -> ID for quick lookup from Main
        const prodMap = new Map<string, string>();
        mainWorkflows.workflows.forEach(w => {
            if (w.content.id) {
                // Normalize production name: strip "dev - " or "staging - " if present to find pure name
                let prodName = w.content.name;
                const devPrefix = 'dev - ';
                if (prodName.startsWith(devPrefix)) {
                    prodName = prodName.substring(devPrefix.length);
                }
                
                prodMap.set(w.content.name, w.content.id.toString()); // Keep original full name as key too just in case
                prodMap.set(prodName, w.content.id.toString()); // Map stripped name
            } 
        });
        
        const suggestions: Record<string, {
            status: 'mapped' | 'missing';
            targetId?: string;
            targetName?: string;
        }> = {};

        for (const call of input.stagingCalls) {
            // The call in Staging usually points to a "Staging" workflow name, e.g. "staging - Facebook"
            // We want to remove "staging - " and find the Production equivalent in Main
            
            let potentialProdName = call.targetWorkflowName || '';
            const stagingPrefix = 'staging - ';
            
            // Clean up the name
            let cleanName = potentialProdName;
            if (cleanName.startsWith(stagingPrefix)) {
                cleanName = cleanName.substring(stagingPrefix.length);
            } else if (cleanName.toLowerCase().startsWith(stagingPrefix)) { // Case insensitive check
                cleanName = cleanName.substring(stagingPrefix.length);
            }

            // Check if this Clean Name exists in Main Branch Workflows
            if (prodMap.has(cleanName)) {
                suggestions[call.targetWorkflow] = { // Key is the Staging Workflow ID/Name used in the call
                    status: 'mapped',
                    targetId: prodMap.get(cleanName),
                    targetName: cleanName
                };
            } else if (prodMap.has(potentialProdName)) {
                 // Try exact match if clean match failed (unlikely if prefixes differ, but good safety)
                 suggestions[call.targetWorkflow] = {
                    status: 'mapped',
                    targetId: prodMap.get(potentialProdName),
                    targetName: potentialProdName
                };
            } else {
                 // Fuzzy/Partial match: Check if cleanName is contained within any production name
                 // e.g. "Shopify update Price" inside "dev - Shopify update Price & Stock"
                 const partialMatchKey = Array.from(prodMap.keys()).find(k => 
                     k.toLowerCase().includes(cleanName.toLowerCase()) || 
                     cleanName.toLowerCase().includes(k.toLowerCase())
                 );

                 if (partialMatchKey) {
                     suggestions[call.targetWorkflow] = {
                        status: 'mapped',
                        targetId: prodMap.get(partialMatchKey),
                        targetName: partialMatchKey
                    };
                 } else {
                     suggestions[call.targetWorkflow] = {
                        status: 'missing',
                        targetName: cleanName // Suggest the cleaned name for potential creation
                    };
                 }
            }

        }

        
        return suggestions;
    }),
});
