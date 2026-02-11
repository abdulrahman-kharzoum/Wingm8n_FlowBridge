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
  nodeAuthType?: string;
}

export interface CredentialUsage {
  nodeId: string;
  nodeName: string;
  nodeType: string;
}

export interface CredentialWithUsage extends Credential {
  usedByNodes: CredentialUsage[];
}

export interface CredentialAlternative extends CredentialWithUsage {
  source: 'main' | 'staging';
}

export interface CredentialDiff {
  id: string;
  stagingId?: string;
  mainId?: string;
  name: string;
  stagingName?: string;
  mainName?: string;
  type: string;
  stagingType?: string;
  mainType?: string;
  inStaging: boolean;
  inMain: boolean;
  stagingOnly: boolean;
  mainOnly: boolean;
  stagingNodeAuthType?: string;
  mainNodeAuthType?: string;
  files: string[];
  alternatives: CredentialAlternative[]; // Other credentials of the same type from BOTH branches
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
  files: string[];
  locations: {
    staging: Domain[];
    main: Domain[];
  };
}

// Workflow execution node types
export interface WorkflowCall {
  sourceWorkflow: string;
  targetWorkflow: string;
  targetWorkflowName?: string;
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
    added: (WorkflowCall & { files: string[] })[];
    removed: (WorkflowCall & { files: string[] })[];
    modified: Array<{
      staging: WorkflowCall;
      main: WorkflowCall;
      files: string[];
    }>;
  };
}

// Metadata Diff Types
export interface MetadataDiff {
  key: string;
  stagingValue?: any;
  mainValue?: any;
  isDifferent: boolean;
}

// Node Parameter Diff Types
export interface ParameterDiff {
  key: string;
  stagingValue?: any;
  mainValue?: any;
}

export interface NodeDiff {
  nodeName: string;
  nodeType: string;
  changeType: 'added' | 'removed' | 'modified';
  parameterChanges?: ParameterDiff[];
}

// N8N Workflow JSON structure
export interface N8NNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, any>;
  credentials?: Record<string, { id: string; name: string }>;
  disabled?: boolean;
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
  metadata: MetadataDiff[];
  nodeChanges: NodeDiff[];
}

// Merge decision types
export interface MergeDecision {
  credentials: {
    [credentialId: string]: 'staging' | 'main' | 'keep-both' | string; // string = specific target credential ID
  };
  domains: {
    [url: string]: {
      selected: 'staging' | 'main' | 'custom';
      url: string;
    };
  };
  workflowCalls: {
    [workflowName: string]: 'add' | 'remove' | 'keep' | { action: 'map'; targetId: string; targetName?: string };
  };
  metadata: {
    [key: string]: 'staging' | 'main';
  };
}

export interface MergeBranch {
  name: string;
  baseBranch: string;
  decisions: MergeDecision;
  createdAt: Date;
  status: 'draft' | 'ready' | 'merged';
}
