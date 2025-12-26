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
  MetadataDiff,
  NodeDiff,
  ParameterDiff,
} from '../types/workflow.types';

/**
 * Extract workflow metadata
 */
export function extractMetadata(workflow: N8NWorkflow): Record<string, any> {
  return {
    name: workflow.name,
    id: workflow.id, // Only present if saved
    versionId: workflow.versionId, // Some versions use this
    active: workflow.active,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    tags: workflow.tags, // Array of tags
  };
}

/**
 * Compare workflow metadata
 */
export function compareMetadata(
  stagingMetadata: Record<string, any>,
  mainMetadata: Record<string, any>
): MetadataDiff[] {
  const keys = new Set([...Object.keys(stagingMetadata), ...Object.keys(mainMetadata)]);
  const diffs: MetadataDiff[] = [];

  keys.forEach((key) => {
    // Skip if both are undefined/null
    if (stagingMetadata[key] === undefined && mainMetadata[key] === undefined) return;

    // Simple equality check (works for primitives, need JSON.stringify for objects/arrays like tags)
    const stagingVal = stagingMetadata[key];
    const mainVal = mainMetadata[key];
    
    let isDifferent = stagingVal !== mainVal;
    
    if (typeof stagingVal === 'object' || typeof mainVal === 'object') {
        isDifferent = JSON.stringify(stagingVal) !== JSON.stringify(mainVal);
    }

    if (isDifferent) {
      diffs.push({
        key,
        stagingValue: stagingVal,
        mainValue: mainVal,
        isDifferent: true,
      });
    }
  });

  return diffs;
}

/**
 * Compare nodes and detect parameter changes
 */
export function compareNodes(
  stagingWorkflow: N8NWorkflow,
  mainWorkflow: N8NWorkflow
): NodeDiff[] {
  const diffs: NodeDiff[] = [];
  const stagingNodes = stagingWorkflow.nodes || [];
  const mainNodes = mainWorkflow.nodes || [];

  // Map by name (or ID if needed, but N8N often relies on names for connections, though ID is unique)
  // The user prompt example shows name based matching ("respond.io comment nodes")
  const stagingNodeMap = new Map(stagingNodes.map(n => [n.name, n]));
  const mainNodeMap = new Map(mainNodes.map(n => [n.name, n]));

  const allNames = new Set<string>();
  stagingNodeMap.forEach((_, key) => allNames.add(key));
  mainNodeMap.forEach((_, key) => allNames.add(key));

  allNames.forEach(name => {
    const stagingNode = stagingNodeMap.get(name);
    const mainNode = mainNodeMap.get(name);

    if (stagingNode && !mainNode) {
        diffs.push({
            nodeName: name,
            nodeType: stagingNode.type,
            changeType: 'added'
        });
    } else if (!stagingNode && mainNode) {
        diffs.push({
            nodeName: name,
            nodeType: mainNode.type,
            changeType: 'removed'
        });
    } else if (stagingNode && mainNode) {
        // Modified - check parameters and specific root properties
        const paramDiffs: ParameterDiff[] = [];
        const stagingParams = stagingNode.parameters || {};
        const mainParams = mainNode.parameters || {};
        
        // Check root properties that are important
        const rootPropsToCheck = ['webhookId', 'credentials'];
        rootPropsToCheck.forEach(prop => {
            // @ts-ignore
            const sVal = stagingNode[prop];
            // @ts-ignore
            const mVal = mainNode[prop];
            
            if (JSON.stringify(sVal) !== JSON.stringify(mVal)) {
                 paramDiffs.push({
                     key: prop,
                     stagingValue: sVal,
                     mainValue: mVal
                 });
            }
        });

        // Flatten parameters for comparison
        const flatten = (obj: any, prefix = ''): Record<string, any> => {
            let result: Record<string, any> = {};
            for (const key in obj) {
                const val = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    Object.assign(result, flatten(val, newKey));
                } else {
                    result[newKey] = val;
                }
            }
            return result;
        };

        const flatStaging = flatten(stagingParams);
        const flatMain = flatten(mainParams);
        const allParamKeys = new Set([...Object.keys(flatStaging), ...Object.keys(flatMain)]);

        allParamKeys.forEach(key => {
            const sVal = flatStaging[key];
            const mVal = flatMain[key];
            if (sVal !== mVal) {
                 if (Array.isArray(sVal) || Array.isArray(mVal)) {
                     if (JSON.stringify(sVal) !== JSON.stringify(mVal)) {
                         paramDiffs.push({ key, stagingValue: sVal, mainValue: mVal });
                     }
                 } else {
                     paramDiffs.push({ key, stagingValue: sVal, mainValue: mVal });
                 }
            }
        });

        if (paramDiffs.length > 0) {
            diffs.push({
                nodeName: name,
                nodeType: stagingNode.type,
                changeType: 'modified',
                parameterChanges: paramDiffs
            });
        }
    }
  });

  return diffs;
}

/**
 * Identify credential replacements by checking if a node switched credentials
 */
export function getCredentialReplacements(
  stagingWorkflow: N8NWorkflow,
  mainWorkflow: N8NWorkflow
): Map<string, string> {
  const replacements = new Map<string, string>(); // mainId -> stagingId

  const stagingNodes = new Map((stagingWorkflow.nodes || []).map(n => [n.name, n]));
  const mainNodes = new Map((mainWorkflow.nodes || []).map(n => [n.name, n]));

  stagingNodes.forEach((stagingNode, name) => {
    const mainNode = mainNodes.get(name);
    if (mainNode && stagingNode.credentials && mainNode.credentials) {
       const stagingCreds = stagingNode.credentials;
       const mainCreds = mainNode.credentials;
       
       const stagingKeys = Object.keys(stagingCreds);
       const mainKeys = Object.keys(mainCreds);

       // 1. Direct ID replacements (Same Type)
       stagingKeys.forEach(credType => {
           const sCred = stagingCreds[credType];
           const mCred = mainCreds[credType];
           
           if (sCred && mCred && sCred.id !== mCred.id) {
               replacements.set(mCred.id, sCred.id);
           }
       });

       // 2. Type replacements (Different Type)
       // Find keys present in Staging but not in Main, and vice versa
       const newTypes = stagingKeys.filter(k => !mainKeys.includes(k));
       const oldTypes = mainKeys.filter(k => !stagingKeys.includes(k));

       // If we have exactly one new type and one old type on the same node, assume it's a replacement
       if (newTypes.length === 1 && oldTypes.length === 1) {
           const sType = newTypes[0];
           const mType = oldTypes[0];
           
           const sCred = stagingCreds[sType];
           const mCred = mainCreds[mType];

           if (sCred && mCred) {
               replacements.set(mCred.id, sCred.id);
           }
       }
    }
  });

  return replacements;
}

/**
 * Extract all unique credentials from a workflow
 */
export function extractCredentials(workflow: N8NWorkflow): Credential[] {
  const credentials = new Map<string, Credential>();

  workflow.nodes?.forEach((node: N8NNode) => {
    if (node.credentials) {
      // Find authentication parameter value if it exists
      const nodeAuthType = node.parameters?.authentication;

      Object.entries(node.credentials).forEach(([key, cred]: [string, any]) => {
        if (cred.id && !credentials.has(cred.id)) {
          credentials.set(cred.id, {
            id: cred.id,
            name: cred.name || key,
            type: key,
            nodeType: node.type,
            nodeAuthType: typeof nodeAuthType === 'string' ? nodeAuthType : undefined,
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
    // Special handling for Webhook nodes
    let paramsToScan = node.parameters;
    
    if (node.type === 'n8n-nodes-base.webhook' && node.parameters) {
        // Extract webhook details as a "domain" entry so it appears in the list
        const httpMethod = node.parameters.httpMethod || 'GET';
        const path = node.parameters.path;
        // @ts-ignore
        const webhookId = node.webhookId;
        
        if (path) {
            domains.push({
                url: `${httpMethod} ${path} (Webhook)`,
                nodeId: node.id,
                nodeName: node.name,
                nodeType: node.type,
                parameterPath: 'path',
            });
        }
        
        // Don't scan the 'path' parameter again in the generic scanner
        // to avoid duplicate entries (one formatted as webhook, one raw)
        if (paramsToScan) {
            const { path, ...rest } = paramsToScan;
            paramsToScan = rest;
        }
    }

    if (paramsToScan) {
      const extractUrlsFromObject = (obj: any, path: string = ''): void => {
        Object.entries(obj).forEach(([key, value]: [string, any]) => {
          const currentPath = path ? `${path}.${key}` : key;

          // Check if this key looks like it might contain a URL
          if (urlPatterns.some((pattern) => key.toLowerCase().includes(pattern))) {
            if (typeof value === 'string' && isValidUrl(value)) {
              // Exclude internal n8n workflow URLs (e.g., /workflow/Z5SIgielsvB18uFX)
              // These are typically found in cachedResultUrl and handled in Workflow Call Graph
              if (value.match(/^\/workflow\/[a-zA-Z0-9]+$/)) {
                return;
              }

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

      extractUrlsFromObject(paramsToScan);
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
      // The parameter might be a simple string (workflowId) OR an object depending on the node version/config
      // We should check different possible locations for the target workflow ID/name
      let targetWorkflow = node.parameters?.workflowId;
      let targetWorkflowName = node.parameters?.cachedResultName as string | undefined;

      // Sometimes it might be in 'source' or 'workflow'
      if (typeof targetWorkflow === 'object') {
          // It's an object, try to find a name or id inside, or stringify it safely
          // Common patterns: { mode: 'id', value: '...' } or { __rl: true, value: '...', mode: 'id' }
          const paramObj = targetWorkflow as any;
          const val = paramObj?.value;
          
          // Try to extract cachedResultName from the object if not found at top level
          if (!targetWorkflowName && paramObj?.cachedResultName) {
              targetWorkflowName = paramObj.cachedResultName;
          }

          if (val) {
             targetWorkflow = val;
          } else {
             try {
                targetWorkflow = JSON.stringify(targetWorkflow);
             } catch(e) {
                targetWorkflow = "Unknown Workflow Object";
             }
          }
      }

      // Ensure it's a string
      if (targetWorkflow && typeof targetWorkflow !== 'string') {
          targetWorkflow = String(targetWorkflow);
      }

      if (targetWorkflow) {
        calls.push({
          sourceWorkflow: workflowName,
          targetWorkflow: targetWorkflow as string,
          targetWorkflowName: targetWorkflowName,
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
      stagingName: stagingCred?.name,
      mainName: mainCred?.name,
      type: stagingCred?.type || mainCred?.type || 'unknown',
      inStaging: !!stagingCred,
      inMain: !!mainCred,
      stagingOnly: !!stagingCred && !mainCred,
      mainOnly: !stagingCred && !!mainCred,
      stagingNodeAuthType: stagingCred?.nodeAuthType,
      mainNodeAuthType: mainCred?.nodeAuthType,
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
  // Handle n8n expression strings (starting with =)
  const cleanStr = str.startsWith('=') ? str.slice(1) : str;

  try {
    new URL(cleanStr);
    return true;
  } catch {
    // Check for relative URLs or webhook patterns
    return (
      /^(https?:\/\/|\/|webhook|\.\.\/)/i.test(cleanStr) ||
      /^[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]+$/.test(cleanStr)
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

/**
 * Detect hardcoded secrets in workflow
 */
export function detectHardcodedSecrets(workflow: any): string[] {
  const secrets: string[] = [];
  const jsonStr = JSON.stringify(workflow);
  
  // Patterns to detect
  const patterns = [
    /Bearer\s+[A-Za-z0-9\-_.]{20,}/g,  // Bearer tokens
    /ghp_[A-Za-z0-9]{36}/g,             // GitHub PATs
    /sk_live_[A-Za-z0-9]{24,}/g,        // Stripe keys
    /AIza[A-Za-z0-9\-_]{35}/g,          // Google API keys
  ];

  for (const pattern of patterns) {
    const matches = jsonStr.match(pattern);
    if (matches) {
      secrets.push(...matches);
    }
  }

  return secrets;
}
