import { extractWorkflowCalls } from './shared/utils/workflow-parser';

// Mock the complex node structure provided by the user
const complexNode = {
  "parameters": {
    "workflowId": {
      "__rl": true,
      "value": "Z5SIgielsvB18uFX",
      "mode": "list",
      "cachedResultUrl": "/workflow/Z5SIgielsvB18uFX",
      "cachedResultName": "My workflow 5"
    },
    "workflowInputs": {
      "mappingMode": "defineBelow",
      "value": {},
      "matchingColumns": [],
      "schema": [],
      "attemptToConvertTypes": false,
      "convertFieldsToString": true
    },
    "options": {}
  },
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1.3,
  "position": [
    496,
    0
  ],
  "id": "6f199275-f612-4308-a890-cc06d92b309c",
  "name": "Call 'My workflow 5'"
};

const mockWorkflow = {
    name: "Test Workflow",
    nodes: [complexNode],
    connections: {},
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

// 1. Verify Workflow ID Extraction
console.log("--- Testing Workflow ID Extraction ---");
const result = extractWorkflowCalls(mockWorkflow, "Test Workflow");
console.log("Extracted Calls:", JSON.stringify(result.calls, null, 2));

const extractedId = result.calls[0]?.targetWorkflow;
if (extractedId === "Z5SIgielsvB18uFX") {
    console.log("SUCCESS: Correctly extracted complex workflow ID: Z5SIgielsvB18uFX");
} else {
    console.error("FAILURE: Extracted ID was:", extractedId);
}


// 2. Verify Recursive Replace Logic (Replicating the logic implemented in MergeService)
console.log("\n--- Testing Recursive Replace Logic ---");

// Mock a workflow with nested structures
const workflowData = {
    nodes: [
        {
            name: "Node 1",
            parameters: {
                url: "http://staging.example.com/api",
                headers: {
                    origin: "http://staging.example.com"
                }
            },
            credentials: {
                stripe: { id: "STAGING_CRED_ID" }
            }
        },
        {
            name: "Node 2",
            parameters: {
                 // Nested array
                 options: [
                     { callbackUrl: "http://staging.example.com/callback" }
                 ]
            }
        }
    ]
};

function recursiveReplace(
    target: any,
    predicate: (value: any, key: string | number) => boolean,
    replacer: (value: any, key: string | number) => any,
    keyFilter?: RegExp
): number {
    let changes = 0;

    if (Array.isArray(target)) {
        for (let i = 0; i < target.length; i++) {
            if (typeof target[i] === 'object' && target[i] !== null) {
                changes += recursiveReplace(target[i], predicate, replacer, keyFilter);
            } else if (predicate(target[i], i)) {
                target[i] = replacer(target[i], i);
                changes++;
            }
        }
    } else if (typeof target === 'object' && target !== null) {
        Object.keys(target).forEach(key => {
            const value = target[key];
            
            if (keyFilter && typeof value !== 'object' && !keyFilter.test(key)) {
                return;
            }

            if (predicate(value, key)) {
                target[key] = replacer(value, key);
                changes++;
            } else if (typeof value === 'object' && value !== null) {
                 changes += recursiveReplace(value, predicate, replacer, keyFilter);
            }
        });
    }

    return changes;
}

// Test 1: Replace URL globally
const targetUrl = "http://staging.example.com";
const newUrl = "http://production.example.com";

console.log("Replacing URLs...");
const urlChanges = recursiveReplace(
    workflowData,
    (val) => typeof val === 'string' && val.includes(targetUrl),
    (val) => val.replace(targetUrl, newUrl)
);

console.log(`Replaced ${urlChanges} URL occurrences.`);
// Should find 3 occurrences: node 1 url, node 1 header, node 2 option

// Test 2: Replace Credential ID globally
console.log("Replacing Credentials...");
const credChanges = recursiveReplace(
    workflowData,
    (val) => val === "STAGING_CRED_ID",
    () => "MAIN_CRED_ID",
    /id|credential/i
);

console.log(`Replaced ${credChanges} Credential ID occurrences.`);

// Verification
const node1Url = workflowData.nodes[0].parameters.url;
const node1Origin = workflowData.nodes[0].parameters.headers.origin;
const node2Callback = workflowData.nodes[1].parameters.options[0].callbackUrl;
const credId = workflowData.nodes[0].credentials.stripe.id;

if (node1Url === "http://production.example.com/api" && 
    node1Origin === "http://production.example.com" &&
    node2Callback === "http://production.example.com/callback") {
    console.log("SUCCESS: Global URL replacement worked.");
} else {
    console.error("FAILURE: URL replacement failed.", { node1Url, node1Origin, node2Callback });
}

if (credId === "MAIN_CRED_ID") {
    console.log("SUCCESS: Global Credential ID replacement worked.");
} else {
    console.error("FAILURE: Credential ID replacement failed.", credId);
}