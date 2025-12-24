/**
 * Workflow Parser Utilities
 * Functions to extract and analyze N8N workflow data
 */

import type {
  N8NWorkflow,
  N8NNode,
  Credential,
  Domain,
  WorkflowCall,
  WorkflowCallChain,
  CredentialDiff,
  DomainDiff,
  WorkflowCallDiff,
} from '../types/workflow.types';

/**
 * Extract all unique credentials from a workflow
 */
export function extractCredentials(workflow: N8NWorkflow): Credential[] {
  const credentials = new Map<string, Credential>();

  workflow.nodes?.forEach((node: N8NNode) => {
    if (node.credentials) {
      Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
        if (cred.id && !credentials.has(cred.id)) {
          credentials.set(cred.id, {
            id: cred.id,
            name: cred.name || key,
            type: key,
            nodeType: node.type,
          });
        }
      });
    }
  });

  return Array.from(credentials.values());
}

/**
 * Extract all domains/URLs from a workflow
 */
export function extractDomains(workflow: N8NWorkflow, workflowName: string): Domain[] {
  const domains: Domain[] = [];
  const urlPatterns = [
    'url',
    'webhookUrl',
    'path',
    'endpoint',
    'baseUrl',
    'apiUrl',
  ];

  workflow.nodes?.forEach((node: N8NNode) => {
    if (node.parameters) {
      const extractUrlsFromObject = (obj: any, path: string = ''): void => {
        Object.entries(obj).forEach(([key, value]: [string, any]) => {
          const currentPath = path ? `${path}.${key}` : key;

          // Check if this key looks like it might contain a URL
          if (urlPatterns.some((pattern) => key.toLowerCase().includes(pattern))) {
            if (typeof value === 'string' && isValidUrl(value)) {
              domains.push({
                url: value,
                nodeId: node.id,
                nodeName: node.name,
                nodeType: node.type,
                parameterPath: currentPath,
              });
            }
          }

          // Recursively check nested objects
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            extractUrlsFromObject(value, currentPath);
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                extractUrlsFromObject(item, `${currentPath}[${index}]`);
              }
            });
          }
        });
      };

      extractUrlsFromObject(node.parameters);
    }
  });

  return domains;
}

/**
 * Extract workflow call chains (Execute Workflow nodes)
 */
export function extractWorkflowCalls(workflow: N8NWorkflow, workflowName: string): WorkflowCallChain {
  const calls: WorkflowCall[] = [];
  const calledBy: WorkflowCall[] = [];

  workflow.nodes?.forEach((node: N8NNode) => {
    // Look for Execute Workflow nodes
    if (node.type === 'n8n-nodes-base.executeWorkflow' || node.type.includes('executeWorkflow')) {
      const targetWorkflow = node.parameters?.workflowId;
      if (targetWorkflow) {
        calls.push({
          sourceWorkflow: workflowName,
          targetWorkflow,
          nodeId: node.id,
          nodeName: node.name,
        });
      }
    }
  });

  return {
    workflow: workflowName,
    calls,
    calledBy,
  };
}

/**
 * Compare credentials between staging and main branches
 */
export function compareCredentials(
  stagingCredentials: Credential[],
  mainCredentials: Credential[]
): CredentialDiff[] {
  const allIds = new Set<string>();
  stagingCredentials.forEach((c) => allIds.add(c.id));
  mainCredentials.forEach((c) => allIds.add(c.id));

  return Array.from(allIds).map((id) => {
    const stagingCred = stagingCredentials.find((c) => c.id === id);
    const mainCred = mainCredentials.find((c) => c.id === id);

    return {
      id,
      name: stagingCred?.name || mainCred?.name || id,
      type: stagingCred?.type || mainCred?.type || 'unknown',
      inStaging: !!stagingCred,
      inMain: !!mainCred,
      stagingOnly: !!stagingCred && !mainCred,
      mainOnly: !stagingCred && !!mainCred,
    };
  });
}

/**
 * Compare domains between staging and main branches
 */
export function compareDomains(stagingDomains: Domain[], mainDomains: Domain[]): DomainDiff[] {
  const allUrls = new Set<string>();
  stagingDomains.forEach((d) => allUrls.add(d.url));
  mainDomains.forEach((d) => allUrls.add(d.url));

  return Array.from(allUrls).map((url) => {
    const stagingInstances = stagingDomains.filter((d) => d.url === url);
    const mainInstances = mainDomains.filter((d) => d.url === url);

    return {
      url,
      stagingUrl: stagingInstances[0]?.url,
      mainUrl: mainInstances[0]?.url,
      isDifferent: stagingInstances[0]?.url !== mainInstances[0]?.url,
      locations: {
        staging: stagingInstances,
        main: mainInstances,
      },
    };
  });
}

/**
 * Compare workflow call chains between staging and main branches
 */
export function compareWorkflowCalls(
  stagingChains: WorkflowCallChain[],
  mainChains: WorkflowCallChain[]
): WorkflowCallDiff {
  const stagingCalls = stagingChains.flatMap((c) => c.calls);
  const mainCalls = mainChains.flatMap((c) => c.calls);

  const added = mainCalls.filter(
    (call) =>
      !stagingCalls.some(
        (sc) =>
          sc.sourceWorkflow === call.sourceWorkflow && sc.targetWorkflow === call.targetWorkflow
      )
  );

  const removed = stagingCalls.filter(
    (call) =>
      !mainCalls.some(
        (mc) =>
          mc.sourceWorkflow === call.sourceWorkflow && mc.targetWorkflow === call.targetWorkflow
      )
  );

  const modified = stagingCalls
    .map((stagingCall) => {
      const mainCall = mainCalls.find(
        (mc) =>
          mc.sourceWorkflow === stagingCall.sourceWorkflow &&
          mc.targetWorkflow === stagingCall.targetWorkflow
      );
      return mainCall ? { staging: stagingCall, main: mainCall } : null;
    })
    .filter((m) => m !== null) as Array<{ staging: WorkflowCall; main: WorkflowCall }>;

  return {
    stagingChains,
    mainChains,
    differences: {
      added,
      removed,
      modified,
    },
  };
}

/**
 * Validate if a string is a valid URL
 */
function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    // Check for relative URLs or webhook patterns
    return (
      /^(https?:\/\/|\/|webhook|\.\.\/)/i.test(str) ||
      /^[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]+$/.test(str)
    );
  }
}

/**
 * Normalize workflow name (remove staging prefix if present)
 */
export function normalizeWorkflowName(name: string): string {
  return name.replace(/^staging-/i, '');
}

/**
 * Check if a workflow is a staging workflow
 */
export function isStagingWorkflow(name: string): boolean {
  return /^staging-/i.test(name);
}
