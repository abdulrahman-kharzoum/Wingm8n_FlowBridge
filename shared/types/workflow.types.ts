/**
 * N8N Workflow Types
 * Defines types for workflow analysis, credentials, domains, and workflow chains
 */

// Credential types
export interface Credential {
  id: string;
  name: string;
  type: string;
  nodeType?: string;
}

export interface CredentialDiff {
  id: string;
  name: string;
  type: string;
  inStaging: boolean;
  inMain: boolean;
  stagingOnly: boolean;
  mainOnly: boolean;
}

// Domain/URL types
export interface Domain {
  url: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  parameterPath: string;
}

export interface DomainDiff {
  url: string;
  stagingUrl?: string;
  mainUrl?: string;
  isDifferent: boolean;
  locations: {
    staging: Domain[];
    main: Domain[];
  };
}

// Workflow execution node types
export interface WorkflowCall {
  sourceWorkflow: string;
  targetWorkflow: string;
  nodeId: string;
  nodeName: string;
}

export interface WorkflowCallChain {
  workflow: string;
  calls: WorkflowCall[];
  calledBy: WorkflowCall[];
}

export interface WorkflowCallDiff {
  stagingChains: WorkflowCallChain[];
  mainChains: WorkflowCallChain[];
  differences: {
    added: WorkflowCall[];
    removed: WorkflowCall[];
    modified: Array<{
      staging: WorkflowCall;
      main: WorkflowCall;
    }>;
  };
}

// N8N Workflow JSON structure
export interface N8NNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
}

export interface N8NWorkflow {
  id?: string;
  name: string;
  nodes: N8NNode[];
  connections?: Record<string, any>;
  settings?: Record<string, any>;
  [key: string]: any;
}

// Branch comparison types
export interface BranchWorkflows {
  branch: string;
  workflows: Array<{
    name: string;
    path: string;
    content: N8NWorkflow;
  }>;
}

export interface WorkflowComparison {
  staging: BranchWorkflows;
  main: BranchWorkflows;
  credentials: CredentialDiff[];
  domains: DomainDiff[];
  workflowCalls: WorkflowCallDiff;
}

// Merge decision types
export interface MergeDecision {
  credentials: {
    [credentialId: string]: 'staging' | 'main' | 'keep-both';
  };
  domains: {
    [url: string]: {
      selected: 'staging' | 'main';
      url: string;
    };
  };
  workflowCalls: {
    [workflowName: string]: 'staging' | 'main';
  };
}

export interface MergeBranch {
  name: string;
  baseBranch: string;
  decisions: MergeDecision;
  createdAt: Date;
  status: 'draft' | 'ready' | 'merged';
}
