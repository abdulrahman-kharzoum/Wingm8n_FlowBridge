import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { createGitHubService } from '../services/github.service';
import { TRPCError } from '@trpc/server';

export const githubRouter = router({
  /**
   * Get all repositories accessible to the authenticated user
   */
  listRepositories: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(30),
        affiliation: z.enum(['owner', 'collaborator', 'organization_member']).default('owner'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
          });
        }

        // Get GitHub access token from session/context
        // This assumes the token is stored in the session after OAuth callback
        const githubToken = (ctx.req as any).session?.githubToken;

        if (!githubToken) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token not found. Please re-authenticate.',
          });
        }

        const githubService = createGitHubService(githubToken);
        const result = await githubService.getUserRepositories(
          input.page,
          input.perPage,
          input.affiliation
        );

        return {
          repositories: result.repos,
          total: result.total,
          page: input.page,
          perPage: input.perPage,
        };
      } catch (error) {
        console.error('[GitHub] Error listing repositories:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch repositories from GitHub',
        });
      }
    }),

  /**
   * Get branches for a specific repository
   */
  getBranches: protectedProcedure
    .input(
      z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const githubToken = (ctx.req as any).session?.githubToken;

        if (!githubToken) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token not found',
          });
        }

        const githubService = createGitHubService(githubToken);
        const branches = await githubService.getRepositoryBranches(input.owner, input.repo);

        return { branches };
      } catch (error) {
        console.error('[GitHub] Error fetching branches:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch branches',
        });
      }
    }),

  /**
   * Find workflow files in a specific branch
   */
  findWorkflowFiles: protectedProcedure
    .input(
      z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        branch: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const githubToken = (ctx.req as any).session?.githubToken;

        if (!githubToken) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token not found',
          });
        }

        const githubService = createGitHubService(githubToken);
        const workflowFiles = await githubService.findWorkflowFiles(
          input.owner,
          input.repo,
          input.branch
        );

        return { workflowFiles };
      } catch (error) {
        console.error('[GitHub] Error finding workflow files:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find workflow files',
        });
      }
    }),

  /**
   * Get content of a specific file
   */
  getFileContent: protectedProcedure
    .input(
      z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        branch: z.string().min(1),
        path: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const githubToken = (ctx.req as any).session?.githubToken;

        if (!githubToken) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token not found',
          });
        }

        const githubService = createGitHubService(githubToken);
        const fileContent = await githubService.getFileContent(
          input.owner,
          input.repo,
          input.branch,
          input.path
        );

        return fileContent;
      } catch (error) {
        console.error('[GitHub] Error getting file content:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get file content',
        });
      }
    }),

  /**
   * Compare two branches
   */
  compareBranches: protectedProcedure
    .input(
      z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        base: z.string().min(1),
        head: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const githubToken = (ctx.req as any).session?.githubToken;

        if (!githubToken) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token not found',
          });
        }

        const githubService = createGitHubService(githubToken);
        const comparison = await githubService.compareBranches(
          input.owner,
          input.repo,
          input.base,
          input.head
        );

        return comparison;
      } catch (error) {
        console.error('[GitHub] Error comparing branches:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to compare branches',
        });
      }
    }),
});
