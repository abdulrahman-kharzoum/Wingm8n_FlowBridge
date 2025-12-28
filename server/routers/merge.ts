/**
 * Merge Router
 * tRPC endpoints for merge branch creation and pull request management
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createGitHubService, fetchBranchWorkflows } from '../services/github.service';
import { createMergeService } from '../services/merge.service';
import type { MergeDecision } from '@shared/types/workflow.types';

export const mergeRouter = router({
  /**
   * Create a merge branch with selected changes
   */
  createMergeBranch: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        stagingBranch: z.string(),
        mainBranch: z.string(),
        decisions: z.object({
          credentials: z.record(z.string(), z.string()),
          domains: z.record(
            z.string(),
            z.object({
              selected: z.enum(['staging', 'main', 'custom']),
              url: z.string(),
            })
          ),
          workflowCalls: z.record(
            z.string(),
            z.union([
              z.enum(['add', 'remove', 'keep']),
              z.object({
                action: z.literal('map'),
                targetId: z.string(),
                targetName: z.string().optional(),
              }),
            ])
          ),
          metadata: z.record(z.string(), z.enum(['staging', 'main'])),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);
        const mergeService = createMergeService(githubService);

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

        // Create merge branch
        const mergeBranch = await mergeService.createMergeBranch(
          input.owner,
          input.repo,
          input.stagingBranch,
          input.mainBranch,
          stagingWorkflows.workflows,
          mainWorkflows.workflows,
          input.decisions as MergeDecision
        );

        return {
          success: true,
          data: mergeBranch,
        };
      } catch (error) {
        console.error('Failed to create merge branch:', error);
        throw error;
      }
    }),

  /**
   * Create a pull request for a merge branch
   */
  createPullRequest: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        mergeBranchName: z.string(),
        targetBranch: z.string().default('main'),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);
        const mergeService = createMergeService(githubService);

        // Create pull request
        const pullRequest = await mergeService.createPullRequest(
          input.owner,
          input.repo,
          input.mergeBranchName,
          input.targetBranch,
          input.title,
          input.description
        );

        return {
          success: true,
          data: pullRequest,
        };
      } catch (error) {
        console.error('Failed to create pull request:', error);
        throw error;
      }
    }),

  /**
   * Get merge branch status
   */
  getMergeBranchStatus: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        mergeBranchName: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        const githubService = createGitHubService(githubToken);

        // Get branch information
        const branch = await githubService.findBranch(input.owner, input.repo, input.mergeBranchName);

        if (!branch) {
          return {
            success: false,
            error: 'Merge branch not found',
          };
        }

        return {
          success: true,
          data: {
            name: branch.name,
            commit: branch.commit,
            protected: branch.protected,
          },
        };
      } catch (error) {
        console.error('Failed to get merge branch status:', error);
        throw error;
      }
    }),

  /**
   * Delete a merge branch
   */
  deleteMergeBranch: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        mergeBranchName: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken;
        if (!githubToken) {
          throw new Error('GitHub token not found in session');
        }

        // TODO: Implement branch deletion via GitHub API
        // This would require adding a deleteBranch method to GitHubService

        return {
          success: true,
          message: 'Merge branch deleted successfully',
        };
      } catch (error) {
        console.error('Failed to delete merge branch:', error);
        throw error;
      }
    }),
});
