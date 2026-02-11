/**
 * Workflow Analyzer Service
 * Analyzes and compares N8N workflows between branches
 */

import type {
  N8NWorkflow,
  BranchWorkflows,
  WorkflowComparison,
  Credential,
  CredentialWithUsage,
  Domain,
  WorkflowCallChain,
} from '@shared/types/workflow.types';
import {
  extractCredentials,
  extractDomains,
  extractWorkflowCalls,
  compareCredentials,
  compareDomains,
  compareWorkflowCalls,
  extractCredentialsWithUsage,
} from '@shared/utils/workflow-parser';

export class WorkflowAnalyzerService {
  /**
   * Analyze and compare workflows between staging and main branches
   */
  async analyzeWorkflows(
    stagingBranch: BranchWorkflows,
    mainBranch: BranchWorkflows
  ): Promise<WorkflowComparison> {
    // Extract data from all workflows in each branch
    const stagingCredentials = this.extractAllCredentials(stagingBranch.workflows);
    const mainCredentials = this.extractAllCredentials(mainBranch.workflows);

    const stagingDomains = this.extractAllDomains(stagingBranch.workflows);
    const mainDomains = this.extractAllDomains(mainBranch.workflows);

    const stagingChains = this.extractAllWorkflowCalls(stagingBranch.workflows);
    const mainChains = this.extractAllWorkflowCalls(mainBranch.workflows);

    // Compare the extracted data
    const credentialDiffs = compareCredentials(stagingCredentials, mainCredentials);
    const domainDiffs = compareDomains(stagingDomains, mainDomains);
    const workflowCallDiffs = compareWorkflowCalls(stagingChains, mainChains);

    return {
      staging: stagingBranch,
      main: mainBranch,
      credentials: credentialDiffs,
      domains: domainDiffs,
      workflowCalls: workflowCallDiffs,
      metadata: [], // TODO: Implement metadata comparison across all workflows
      nodeChanges: [], // TODO: Implement node comparison across all workflows
    };
  }

  /**
   * Extract all credentials from multiple workflows
   */
  private extractAllCredentials(
    workflows: Array<{
      name: string;
      path: string;
      content: N8NWorkflow;
    }>
  ): CredentialWithUsage[] {
    const credentialMap = new Map<string, CredentialWithUsage>();

    workflows.forEach((workflow) => {
      const credentials = extractCredentialsWithUsage(workflow.content);
      credentials.forEach((cred) => {
        if (!credentialMap.has(cred.id)) {
          credentialMap.set(cred.id, cred);
        } else {
          // If it already exists, merge the usage
          const existing = credentialMap.get(cred.id)!;
          const existingUsageIds = new Set(existing.usedByNodes.map(n => n.nodeId));

          cred.usedByNodes.forEach(usage => {
            if (!existingUsageIds.has(usage.nodeId)) {
              existing.usedByNodes.push(usage);
              existingUsageIds.add(usage.nodeId);
            }
          });
        }
      });
    });

    return Array.from(credentialMap.values());
  }

  /**
   * Extract all domains from multiple workflows
   */
  private extractAllDomains(
    workflows: Array<{
      name: string;
      path: string;
      content: N8NWorkflow;
    }>
  ): Domain[] {
    const domains: Domain[] = [];

    workflows.forEach((workflow) => {
      const workflowDomains = extractDomains(workflow.content, workflow.name);
      domains.push(...workflowDomains);
    });

    return domains;
  }

  /**
   * Extract all workflow call chains from multiple workflows
   */
  private extractAllWorkflowCalls(
    workflows: Array<{
      name: string;
      path: string;
      content: N8NWorkflow;
    }>
  ): WorkflowCallChain[] {
    const chains: WorkflowCallChain[] = [];

    workflows.forEach((workflow) => {
      const chain = extractWorkflowCalls(workflow.content, workflow.name);
      chains.push(chain);
    });

    return chains;
  }

  /**
   * Generate a summary of differences
   */
  generateSummary(comparison: WorkflowComparison): {
    credentialChanges: number;
    domainChanges: number;
    workflowCallChanges: number;
    stagingOnlyCredentials: number;
    mainOnlyCredentials: number;
    hasConflicts: boolean;
  } {
    const credentialChanges = comparison.credentials.filter(
      (c) => c.stagingOnly || c.mainOnly
    ).length;
    const domainChanges = comparison.domains.filter((d) => d.isDifferent).length;
    const workflowCallChanges =
      comparison.workflowCalls.differences.added.length +
      comparison.workflowCalls.differences.removed.length +
      comparison.workflowCalls.differences.modified.length;

    const stagingOnlyCredentials = comparison.credentials.filter((c) => c.stagingOnly).length;
    const mainOnlyCredentials = comparison.credentials.filter((c) => c.mainOnly).length;

    return {
      credentialChanges,
      domainChanges,
      workflowCallChanges,
      stagingOnlyCredentials,
      mainOnlyCredentials,
      hasConflicts: credentialChanges > 0 || domainChanges > 0 || workflowCallChanges > 0,
    };
  }
}

export function createWorkflowAnalyzerService(): WorkflowAnalyzerService {
  return new WorkflowAnalyzerService();
}
