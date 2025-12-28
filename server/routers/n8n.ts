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

  createWorkflowFromMapping: publicProcedure
    .input(z.object({
        owner: z.string(),
        repo: z.string(),
        prNumber: z.number(),
        targetName: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
         // Assuming ctx.user has the token. If not, we might need to adjust based on actual auth implementation.
         // fallback to a process env token if user token not present? Or fail.
         const token = (ctx as any).user?.githubToken;
         
         if (!token) {
             throw new Error("Authentication required to access GitHub");
         }
         
         const ghService = new GitHubService(token); 
         
         // Get PR details to find head ref
         const pr = await ghService.getPullRequest(input.owner, input.repo, input.prNumber);
         const headBranch = pr.head.ref;
         
         // Fetch all workflows from that branch
         const branchWorkflows = await fetchBranchWorkflows(ghService, input.owner, input.repo, headBranch);
         
         // Find the workflow matching the targetName
         // targetName might be "staging - My Flow" or "My Flow"
         // The file name might not match exactly, we check the content name
         const match = branchWorkflows.workflows.find(w => w.content.name === input.targetName || w.content.name === `staging - ${input.targetName}`);
         
         if (!match) {
             throw new Error(`Workflow with name "${input.targetName}" not found in PR branch ${headBranch}`);
         }
         
         // Create in N8N
         const result = await n8nService.createWorkflow(match.content);
         return result;
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
                 suggestions[call.targetWorkflow] = {
                    status: 'missing',
                    targetName: cleanName // Suggest the cleaned name for potential creation
                };
            }
        }

        
        return suggestions;
    }),
});
