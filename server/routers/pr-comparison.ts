import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { createPRAnalyzerService } from '../services/pr-analyzer.service';

export const prComparisonRouter = router({
  compare: protectedProcedure
    .input(
      z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        prNumber: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const githubToken = ctx.user?.githubToken;

        if (!githubToken) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'GitHub token not found',
          });
        }

        const prAnalyzer = createPRAnalyzerService(githubToken);
        const result = await prAnalyzer.analyzePR(input.owner, input.repo, input.prNumber);

        return result;
      } catch (error) {
        console.error('[PR Comparison] Error comparing PR:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to compare PR',
        });
      }
    }),
});