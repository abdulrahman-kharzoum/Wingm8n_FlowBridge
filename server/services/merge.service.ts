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
      // Generate merge branch name
      const timestamp = new Date().toISOString().slice(0, 10);
      const mergeBranchName = `merge/${stagingBranch}-to-${mainBranch}/${timestamp}`;

      // Create the merge branch
      await this.githubService.createBranch(owner, repo, mergeBranchName, mainBranch);

      // Merge workflows based on decisions
      const mergedWorkflows = this.mergeWorkflows(
        stagingWorkflows,
        mainWorkflows,
        decisions
      );

      // Upload merged workflows to the merge branch
      for (const workflow of mergedWorkflows) {
        const content = JSON.stringify(workflow.content, null, 2);
        await this.githubService.updateFile(
          owner,
          repo,
          mergeBranchName,
          workflow.path,
          content,
          `Merge: Update ${workflow.name}`
        );
      }

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
    const mergedWorkflows: Array<{ name: string; path: string; content: N8NWorkflow }> = [];
    const processedPaths = new Set<string>();

    // Process main workflows first
    for (const mainWorkflow of mainWorkflows) {
      const stagingWorkflow = stagingWorkflows.find((w) => w.path === mainWorkflow.path);

      if (stagingWorkflow) {
        // Merge the workflows
        const merged = this.mergeWorkflowContent(
          stagingWorkflow.content,
          mainWorkflow.content,
          decisions
        );

        mergedWorkflows.push({
          name: mainWorkflow.name,
          path: mainWorkflow.path,
          content: merged,
        });

        processedPaths.add(mainWorkflow.path);
      } else {
        // Keep main workflow as is
        mergedWorkflows.push(mainWorkflow);
        processedPaths.add(mainWorkflow.path);
      }
    }

    // Add staging-only workflows
    for (const stagingWorkflow of stagingWorkflows) {
      if (!processedPaths.has(stagingWorkflow.path)) {
        mergedWorkflows.push(stagingWorkflow);
      }
    }

    return mergedWorkflows;
  }

  /**
   * Merge individual workflow content based on decisions
   */
  private mergeWorkflowContent(
    stagingWorkflow: N8NWorkflow,
    mainWorkflow: N8NWorkflow,
    decisions: MergeDecision
  ): N8NWorkflow {
    // Start with main workflow as base
    const merged: N8NWorkflow = JSON.parse(JSON.stringify(mainWorkflow));

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
    // For each node in the merged workflow
    merged.nodes?.forEach((node) => {
      if (node.credentials) {
        Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
          const credId = cred.id;
          const decision = credentialDecisions[credId];

          if (decision === 'staging') {
            // Find the credential from staging workflow
            const stagingNode = stagingWorkflow.nodes?.find(
              (n) => n.credentials?.[key]?.id === credId
            );
            if (stagingNode?.credentials?.[key]) {
              node.credentials![key] = stagingNode.credentials[key];
            }
          }
          // 'main' means keep current (already in merged)
          // 'keep-both' means keep both (already in merged)
        });
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
    const urlPatterns = [
      'url',
      'webhookUrl',
      'path',
      'endpoint',
      'baseUrl',
      'apiUrl',
    ];

    merged.nodes?.forEach((node) => {
      if (node.parameters) {
        const updateUrlsInObject = (obj: any, source: N8NWorkflow): void => {
          Object.entries(obj).forEach(([key, value]: [string, any]) => {
            if (urlPatterns.some((pattern) => key.toLowerCase().includes(pattern))) {
              if (typeof value === 'string') {
                const decision = domainDecisions[value];
                if (decision) {
                  obj[key] = decision.url;
                }
              }
            }

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              updateUrlsInObject(value, source);
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                  updateUrlsInObject(item, source);
                }
              });
            }
          });
        };

        updateUrlsInObject(node.parameters, stagingWorkflow);
      }
    });
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
    // This is a placeholder for workflow call merging logic
    // In a real implementation, you would:
    // 1. Find Execute Workflow nodes
    // 2. Apply the decisions to keep/remove/modify them
    // 3. Handle workflow name normalization (staging- prefix)

    merged.nodes?.forEach((node) => {
      if (node.type === 'n8n-nodes-base.executeWorkflow' || node.type.includes('executeWorkflow')) {
        const targetWorkflow = node.parameters?.workflowId;
        if (targetWorkflow) {
          const decision = workflowCallDecisions[targetWorkflow];
          if (decision === 'remove') {
            // Mark for removal or handle accordingly
            node.disabled = true;
          }
        }
      }
    });
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
      const prDescription =
        description ||
        `Automated merge from Wingm8n FlowBridge\n\nThis PR contains merged N8N workflows with selected changes from staging to production.`;

      return await this.githubService.createPullRequest(
        owner,
        repo,
        prTitle,
        prDescription,
        mergeBranchName,
        targetBranch
      );
    } catch (error) {
      console.error('Failed to create pull request:', error);
      throw error;
    }
  }
}

export function createMergeService(githubService: GitHubService): MergeService {
  return new MergeService(githubService);
}
