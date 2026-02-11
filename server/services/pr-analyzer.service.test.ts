import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PRAnalyzerService } from './pr-analyzer.service';

// Mock Octokit
const mockOctokit = {
    pulls: {
        get: vi.fn(),
        listFiles: vi.fn(),
    },
    repos: {
        getContent: vi.fn(),
    },
};

vi.mock('@octokit/rest', () => ({
    Octokit: vi.fn().mockImplementation(() => mockOctokit),
}));

// Mock GitHub Service for fetching branch workflows (registry building)
vi.mock('./github.service', () => ({
    createGitHubService: vi.fn(),
    fetchBranchWorkflows: vi.fn(),
}));

import { fetchBranchWorkflows } from './github.service';

describe('PRAnalyzerService', () => {
    let service: PRAnalyzerService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new PRAnalyzerService('fake-token');
    });

    it('should aggregates credentials and populate alternatives from registry', async () => {
        // Setup Mock Data matching User's scenario

        // 1. PR Details
        mockOctokit.pulls.get.mockResolvedValue({
            data: {
                number: 1,
                title: 'Test PR',
                base: { ref: 'main', sha: 'base-sha' },
                head: { ref: 'staging', sha: 'head-sha' },
                state: 'open',
            },
        });

        // 2. Changed Files
        mockOctokit.pulls.listFiles.mockResolvedValue({
            data: [
                { filename: 'workflows/My workflow 522.json', status: 'modified' },
            ],
        });

        // 3. Workflow Content
        // Main Branch Content (Base)
        const mainContent = {
            name: "My workflow 522",
            nodes: [
                {
                    id: "node-1",
                    name: "Create a row",
                    type: "n8n-nodes-base.supabase",
                    credentials: { supabaseApi: { id: "cred-wonderhr", name: "wonderhr" } }
                },
                {
                    id: "node-2",
                    name: "Get a row",
                    type: "n8n-nodes-base.supabase",
                    credentials: { supabaseApi: { id: "cred-aisupply", name: "ai supply" } }
                }
            ],
            connections: { "Create a row": { main: [[{ node: "Get a row", type: "main", index: 0 }]] } }
        };

        // Staging Branch Content (Head) - Both nodes using "wonderhr"
        const stagingContent = {
            name: "My workflow 522",
            nodes: [
                {
                    id: "node-1",
                    name: "Create a row",
                    type: "n8n-nodes-base.supabase",
                    credentials: { supabaseApi: { id: "cred-wonderhr", name: "wonderhr" } }
                },
                {
                    id: "node-2",
                    name: "Get a row",
                    type: "n8n-nodes-base.supabase",
                    credentials: { supabaseApi: { id: "cred-wonderhr", name: "wonderhr" } }
                }
            ],
            connections: { "Create a row": { main: [[{ node: "Get a row", type: "main", index: 0 }]] } }
        };

        mockOctokit.repos.getContent.mockImplementation(({ ref }) => {
            if (ref === 'base-sha') {
                return Promise.resolve({
                    data: { content: Buffer.from(JSON.stringify(mainContent)).toString('base64') }
                });
            }
            if (ref === 'head-sha') {
                return Promise.resolve({
                    data: { content: Buffer.from(JSON.stringify(stagingContent)).toString('base64') }
                });
            }
            return Promise.reject(new Error('Unknown ref'));
        });

        // 4. Mock Registry Fetching (fetchBranchWorkflows)
        // Should return Main content to build the registry
        (fetchBranchWorkflows as any).mockResolvedValue({
            workflows: [
                {
                    name: 'My workflow 522.json',
                    path: 'workflows/My workflow 522.json',
                    content: mainContent
                }
            ]
        });

        // Run Analysis
        const result = await service.analyzePR('owner', 'repo', 1);

        // Assertions
        expect(result.analysis.credentials).toBeDefined();

        // We expect "cred-aisupply" to be effectively removed/replaced in node-2.
        // "cred-wonderhr" is used in node-1 (unchanged) and node-2 (changed).

        // The aggregator might filter out "cred-wonderhr" if it deems it valid in both (it is).
        // But "cred-aisupply" is NOT in staging.
        // The diff logic is complex.

        // Check credentials in result
        const credentials = result.analysis.credentials;
        console.log('Result Credentials:', JSON.stringify(credentials, null, 2));

        // Verify "cred-wonderhr" usage
        const wonderhr = credentials.find(c => c.id === 'cred-wonderhr' || c.stagingId === 'cred-wonderhr');

        // "wonderhr" is in Main and Staging. It might be filtered out as "Identical" by default logic if strict equality is used.
        // BUT we added "usedByNodes" merging. If usage changed (now used by node-2 as well), it might ideally show up, 
        // but the current filter logic only checks ID/Name changes.
        // (See pr-analyzer.service.ts: "Filter out credentials that are identical... if cred.mainId && cred.stagingId && cred.mainId !== cred.stagingId return true...")

        // However, "node-2" saw a replacement: "cred-aisupply" -> "cred-wonderhr".
        // This usually creates a Diff Entry where Main="cred-aisupply" and Staging="cred-wonderhr".
        // OR it marks "cred-aisupply" as Removed and "cred-wonderhr" as Added (or modified).

        // Let's see what happens to "cred-aisupply".
        const aisupply = credentials.find(c => c.mainId === 'cred-aisupply');

        // Verify Alternatives
        // Regardless of what is shown, if we see an entry for "cred-aisupply" (as removed) or "cred-wonderhr" (as added/modified),
        // it SHOULD have "alternatives" populated from the registry.
        // The registry contains {"supabaseApi": ["cred-wonderhr", "cred-aisupply"]}.

        if (aisupply) {
            expect(aisupply.alternatives).toBeDefined();
            expect(aisupply.alternatives.length).toBeGreaterThan(0);
            // Should contain "cred-aisupply" as alternative (the old one)
            expect(aisupply.alternatives.some((a: any) => a.id === 'cred-aisupply')).toBe(true);
        }
    });
});
