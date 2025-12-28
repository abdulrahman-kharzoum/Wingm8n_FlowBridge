import { PRAnalyzerService, WorkflowFileAnalysis } from './server/services/pr-analyzer.service';

const analyzer = new PRAnalyzerService("dummy_token");

const mockResults: WorkflowFileAnalysis[] = [
    {
        filename: "file1.json",
        status: "modified",
        base: {
            credentials: [{ id: "main_cred_1", name: "Main Cred 1", type: "test" }],
            domains: [],
            workflowCalls: { workflow: "file1", calls: [], calledBy: [] },
            metadata: {},
            content: { nodes: [{ name: "Node1", credentials: { test: { id: "main_cred_1" } } }] }
        },
        head: {
            credentials: [{ id: "staging_cred_1", name: "Staging Cred 1", type: "test" }],
            domains: [],
            workflowCalls: { workflow: "file1", calls: [], calledBy: [] },
            metadata: {},
            content: { nodes: [{ name: "Node1", credentials: { test: { id: "staging_cred_1" } } }] }
        }
    },
    {
        filename: "file2.json",
        status: "modified",
        base: {
            credentials: [{ id: "main_cred_1", name: "Main Cred 1", type: "test" }],
            domains: [],
            workflowCalls: { workflow: "file2", calls: [], calledBy: [] },
            metadata: {},
            content: { nodes: [{ name: "NodeX", credentials: { test: { id: "main_cred_1" } } }] }
        },
        head: {
            credentials: [{ id: "staging_cred_1", name: "Staging Cred 1", type: "test" }],
            domains: [],
            workflowCalls: { workflow: "file2", calls: [], calledBy: [] },
            metadata: {},
            content: { nodes: [{ name: "NodeX", credentials: { test: { id: "staging_cred_1" } } }] }
        }
    }
];

// Access private method
const aggregated = (analyzer as any).aggregateAnalysis(mockResults);

console.log("--- Testing Credential Replacement Aggregation ---");
const cred = aggregated.credentials.find((c: any) => c.mainId === "main_cred_1");

if (cred) {
    console.log(`Credential Found: ${cred.mainName} -> ${cred.stagingName}`);
    console.log("Files found:", cred.files);
    
    if (cred.files.length === 2 && cred.files.includes("file1.json") && cred.files.includes("file2.json")) {
        console.log("SUCCESS: Replaced credential aggregated from multiple files.");
    } else {
        console.error("FAILURE: Incorrect file aggregation.", cred.files);
    }
} else {
    console.error("FAILURE: Credential not found.");
}