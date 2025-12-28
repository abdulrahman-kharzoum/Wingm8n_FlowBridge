import { PRAnalyzerService, WorkflowFileAnalysis } from './server/services/pr-analyzer.service';

const analyzer = new PRAnalyzerService("dummy_token");

const mockResults: WorkflowFileAnalysis[] = [
    {
        filename: "workflow.json",
        status: "modified",
        base: {
            credentials: [],
            domains: [],
            workflowCalls: { 
                workflow: "Source Workflow", 
                calls: [
                    { sourceWorkflow: "Source Workflow", targetWorkflow: "Target Workflow", nodeId: "1", nodeName: "Call Target" }
                ], 
                calledBy: [] 
            },
            metadata: {},
            content: { nodes: [] }
        },
        head: {
            credentials: [],
            domains: [],
            workflowCalls: { 
                workflow: "Source Workflow", 
                calls: [
                    { sourceWorkflow: "Source Workflow", targetWorkflow: "Target Workflow", nodeId: "1", nodeName: "Call Target" }
                ], 
                calledBy: [] 
            },
            metadata: {},
            content: { nodes: [] }
        }
    }
];

// Access private method
const aggregated = (analyzer as any).aggregateAnalysis(mockResults);

console.log("--- Testing Workflow Call Aggregation ---");
console.log("Total calls found:", aggregated.workflowCalls.length);

const call = aggregated.workflowCalls.find((c: any) => c.sourceWorkflow === "Source Workflow" && c.targetWorkflow === "Target Workflow");

if (call) {
    console.log("Call found:", call);
    console.log("inMain:", call.inMain);
    console.log("inStaging:", call.inStaging);
    
    if (call.inMain && call.inStaging) {
        console.log("SUCCESS: Unchanged workflow call is PRESERVED (not filtered out).");
    } else {
        console.error("FAILURE: Unchanged workflow call was NOT preserved correctly.");
    }
} else {
    console.error("FAILURE: Workflow call not found in aggregated results.");
}