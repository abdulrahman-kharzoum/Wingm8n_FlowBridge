import { PRAnalyzerService, WorkflowFileAnalysis } from './server/services/pr-analyzer.service';

const analyzer = new PRAnalyzerService("dummy_token");

const mockResults: WorkflowFileAnalysis[] = [
    {
        filename: "file1.json",
        status: "modified",
        base: {
            credentials: [], // Not in base
            domains: [],
            workflowCalls: { workflow: "file1", calls: [], calledBy: [] },
            metadata: {},
            content: {}
        },
        head: {
            credentials: [{ id: "cred1", name: "Cred 1", type: "test" }], // Only in head (New)
            domains: [],
            workflowCalls: { workflow: "file1", calls: [], calledBy: [] },
            metadata: {},
            content: {}
        }
    },
    {
        filename: "file2.json",
        status: "modified",
        base: {
            credentials: [], // Not in base
            domains: [],
            workflowCalls: { workflow: "file2", calls: [], calledBy: [] },
            metadata: {},
            content: {}
        },
        head: {
            credentials: [{ id: "cred1", name: "Cred 1", type: "test" }], // Only in head (New)
            domains: [],
            workflowCalls: { workflow: "file2", calls: [], calledBy: [] },
            metadata: {},
            content: {}
        }
    }
];

// Access private method
const aggregated = (analyzer as any).aggregateAnalysis(mockResults);

console.log("--- Testing Credential Aggregation ---");
const cred1 = aggregated.credentials.find((c: any) => c.id === "cred1");

if (cred1) {
    console.log("Files found:", cred1.files);
    if (cred1.files.length === 2 && cred1.files.includes("file1.json") && cred1.files.includes("file2.json")) {
        console.log("SUCCESS: Credential 'cred1' correctly aggregated from multiple files.");
    } else {
        console.error("FAILURE: Incorrect file aggregation.", cred1.files);
    }
} else {
    console.error("FAILURE: Credential 'cred1' not found (it might have been filtered out if considered unchanged, but it should be New).");
}