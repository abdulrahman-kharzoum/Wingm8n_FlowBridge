/**
 * Workflow Router
 * tRPC endpoints for workflow analysis and comparison
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createGitHubService, fetchBranchWorkflows } from '../services/github.service';
import { createWorkflowAnalyzerService } from '../services/workflow-analyzer.service';

export const workflowRouter = router({
  /**
   * Compare workflows between staging and main branches
   */
  compareBranches: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        stagingBranch: z.string().default('staging'),
        mainBranch: z.string().default('main'),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Get GitHub token from user session
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);
        const analyzerService = createWorkflowAnalyzerService();

        // Fetch workflows from both branches
        const stagingWorkflows = await fetchBranchWorkflows(
          githubService,
          input.owner,
          input.repo,
          input.stagingBranch
        );

        const mainWorkflows = await fetchBranchWorkflows(
          githubService,
          input.owner,
          input.repo,
          input.mainBranch
        );

        // Analyze and compare
        const comparison = await analyzerService.analyzeWorkflows(
          stagingWorkflows,
          mainWorkflows
        );

        // Generate summary
        const summary = analyzerService.generateSummary(comparison);

        return {
          success: true,
          data: {
            comparison,
            summary,
          },
        };
      } catch (error) {
        console.error('Failed to compare branches:', error);
        throw error;
      }
    }),

  /**
   * Get credentials from a specific branch
   */
  getCredentials: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);
        const workflows = await fetchBranchWorkflows(
          githubService,
          input.owner,
          input.repo,
          input.branch
        );

        // Extract all credentials
        const credentialMap = new Map();
        workflows.workflows.forEach((workflow) => {
          const { extractCredentials } = require('@shared/utils/workflow-parser');
          const credentials = extractCredentials(workflow.content);
          credentials.forEach((cred: any) => {
            if (!credentialMap.has(cred.id)) {
              credentialMap.set(cred.id, cred);
            }
          });
        });

        return {
          success: true,
          data: Array.from(credentialMap.values()),
        };
      } catch (error) {
        console.error('Failed to get credentials:', error);
        throw error;
      }
    }),

  /**
   * Get domains/URLs from a specific branch
   */
  getDomains: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);
        const workflows = await fetchBranchWorkflows(
          githubService,
          input.owner,
          input.repo,
          input.branch
        );

        // Extract all domains
        const domains = [];
        workflows.workflows.forEach((workflow) => {
          const { extractDomains } = require('@shared/utils/workflow-parser');
          const workflowDomains = extractDomains(workflow.content, workflow.name);
          domains.push(...workflowDomains);
        });

        return {
          success: true,
          data: domains,
        };
      } catch (error) {
        console.error('Failed to get domains:', error);
        throw error;
      }
    }),

  /**
   * Get workflow call chains from a specific branch
   */
  getWorkflowCalls: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        branch: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);
        const workflows = await fetchBranchWorkflows(
          githubService,
          input.owner,
          input.repo,
          input.branch
        );

        // Extract all workflow calls
        const chains = [];
        workflows.workflows.forEach((workflow) => {
          const { extractWorkflowCalls } = require('@shared/utils/workflow-parser');
          const chain = extractWorkflowCalls(workflow.content, workflow.name);
          chains.push(chain);
        });

        return {
          success: true,
          data: chains,
        };
      } catch (error) {
        console.error('Failed to get workflow calls:', error);
        throw error;
      }
    }),
});
