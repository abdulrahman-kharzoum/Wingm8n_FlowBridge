# Wingm8n_FlowBridge - PR Comparison & N8N Workflow Analysis

## 🎯 Current State & Requirements

**What's Working:**
- ✅ GitHub OAuth authentication
- ✅ Repository selection (personal repos only)
- ✅ Dashboard UI with sidebar navigation

**What Needs to be Built:**
1. **Fix Repository Selection** - Include collaborative/organization repos
2. **PR Input Interface** - Allow users to enter a Pull Request number
3. **PR Comparison Engine** - Fetch and compare staging vs main from PR
4. **N8N Analysis System** - Extract credentials, domains, and workflow calls
5. **Comparison Dashboard** - Beautiful UI to visualize differences

---

## 🔧 Task 1: Fix Repository Selection to Include Collaborative Repos

### Problem
Currently only showing repos from `/user/repos` endpoint, which excludes:
- Organization repositories where user is a member
- Repositories where user is a collaborator
- Forked repositories with access

### Solution

**File: `lib/github/client.ts`** (Update existing service)

```typescript
import { Octokit } from '@octokit/rest';

export async function getAllAccessibleRepos(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });
  
  try {
    // Fetch all repos user has access to (personal + orgs + collaborations)
    const { data: allRepos } = await octokit.repos.listForAuthenticatedUser({
      visibility: 'all', // public, private, all
      affiliation: 'owner,collaborator,organization_member', // KEY CHANGE HERE
      sort: 'updated',
      per_page: 100,
    });

    // Filter for repos that likely contain n8n workflows
    // (optional: you can add a search for .json files)
    return allRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      private: repo.private,
      updated_at: repo.updated_at,
      default_branch: repo.default_branch,
      permissions: repo.permissions, // shows what user can do
    }));
  } catch (error) {
    console.error('Failed to fetch repos:', error);
    throw new Error('Unable to fetch repositories');
  }
}

// New function: Check if repo contains n8n workflows
export async function hasN8NWorkflows(
  accessToken: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const octokit = new Octokit({ auth: accessToken });
  
  try {
    // Search for .json files in common n8n directories
    const searchPaths = ['workflows/', '.n8n/', 'n8n/'];
    
    for (const path of searchPaths) {
      try {
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
        });
        
        if (Array.isArray(data) && data.some(file => file.name.endsWith('.json'))) {
          return true;
        }
      } catch {
        // Path doesn't exist, continue
        continue;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}
```

**File: `app/api/github/repos/route.ts`** (Update API route)

```typescript
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAllAccessibleRepos } from '@/lib/github/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repos = await getAllAccessibleRerepos(session.accessToken);
    
    // Add a badge to show repo type (personal, org, collaborative)
    const enrichedRepos = repos.map(repo => ({
      ...repo,
      repoType: repo.owner.login === session.user.githubUsername 
        ? 'personal' 
        : repo.permissions?.admin 
        ? 'organization' 
        : 'collaborative'
    }));
    
    return NextResponse.json(enrichedRepos);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch repos' },
      { status: 500 }
    );
  }
}
```

**File: `components/dashboard/RepoSelector.tsx`** (Update UI)

```tsx
export function RepoCard({ repo, onSelect }) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'organization': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'collaborative': return 'bg-teal-100 text-teal-700 border-teal-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="group p-6 hover:shadow-xl hover:scale-[1.02] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">
              {repo.name}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full border ${getBadgeColor(repo.repoType)}`}>
              {repo.repoType}
            </span>
          </div>
          <p className="text-sm text-slate-500">{repo.description || 'No description'}</p>
        </div>
      </div>
      
      {/* ... rest of card ... */}
    </Card>
  );
}
```

---

## 🔧 Task 2: Create PR Input & Comparison Interface

### New Page: PR Comparison Dashboard

**File: `app/(dashboard)/compare/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useRepoContext } from '@/contexts/RepoContext';
import { GitPullRequest, AlertCircle } from 'lucide-react';

export default function ComparePage() {
  const { data: session } = useSession();
  const { selectedRepo } = useRepoContext();
  const [prNumber, setPrNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  if (!selectedRepo) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Repository Selected</h2>
          <p className="text-slate-600 mb-4">
            Please select a repository from the dashboard first.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const handleCompare = async () => {
    if (!prNumber || !session?.accessToken) return;

    setLoading(true);
    try {
      const response = await fetch('/api/github/pr/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: selectedRepo.owner,
          repo: selectedRepo.name,
          prNumber: parseInt(prNumber),
        }),
      });

      const data = await response.json();
      setComparisonData(data);
    } catch (error) {
      console.error('Failed to compare PR:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Compare Pull Request
        </h1>
        <p className="text-slate-600">
          Analyze N8N workflow changes between staging and main
        </p>
      </div>

      {/* PR Input Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitPullRequest className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold">Enter Pull Request Details</h2>
        </div>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Repository
            </label>
            <Input
              value={`${selectedRepo.owner}/${selectedRepo.name}`}
              disabled
              className="bg-slate-50"
            />
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Pull Request Number
            </label>
            <Input
              type="number"
              placeholder="e.g., 42"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <Button
          onClick={handleCompare}
          disabled={!prNumber || loading}
          className="mt-4 w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
        >
          {loading ? 'Analyzing...' : 'Compare & Analyze'}
        </Button>
      </Card>

      {/* Comparison Results */}
      {comparisonData && (
        <ComparisonResults data={comparisonData} />
      )}
    </div>
  );
}
```

---

## 🔧 Task 3: PR Comparison API with N8N Analysis

**File: `app/api/github/pr/compare/route.ts`**

```typescript
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';
import { 
  analyzePRChanges, 
  extractCredentials, 
  extractDomains, 
  extractWorkflowCalls 
} from '@/lib/n8n/analyzer';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { owner, repo, prNumber } = await request.json();
    const octokit = new Octokit({ auth: session.accessToken });

    // 1. Fetch PR details
    const { data: pr } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    // 2. Get list of changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    // 3. Filter for N8N workflow JSON files
    const workflowFiles = files.filter(
      file => file.filename.endsWith('.json') && 
              (file.filename.includes('workflow') || 
               file.filename.includes('.n8n') ||
               file.status === 'added' || 
               file.status === 'modified')
    );

    // 4. Fetch content of each changed workflow
    const analysisResults = await Promise.all(
      workflowFiles.map(async (file) => {
        // Get file content from both base (main) and head (staging)
        let baseContent = null;
        let headContent = null;

        try {
          // Base version (main/production)
          if (file.status !== 'added') {
            const { data: baseFile } = await octokit.repos.getContent({
              owner,
              repo,
              path: file.filename,
              ref: pr.base.sha,
            });
            
            if ('content' in baseFile) {
              baseContent = JSON.parse(
                Buffer.from(baseFile.content, 'base64').toString('utf-8')
              );
            }
          }

          // Head version (staging)
          const { data: headFile } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: pr.head.sha,
          });
          
          if ('content' in headFile) {
            headContent = JSON.parse(
              Buffer.from(headFile.content, 'base64').toString('utf-8')
            );
          }

          // 5. Analyze both versions
          return {
            filename: file.filename,
            status: file.status,
            base: baseContent ? {
              credentials: extractCredentials(baseContent),
              domains: extractDomains(baseContent),
              workflowCalls: extractWorkflowCalls(baseContent),
            } : null,
            head: headContent ? {
              credentials: extractCredentials(headContent),
              domains: extractDomains(headContent),
              workflowCalls: extractWorkflowCalls(headContent),
            } : null,
          };
        } catch (error) {
          console.error(`Failed to analyze ${file.filename}:`, error);
          return null;
        }
      })
    );

    // 6. Aggregate and deduplicate results
    const aggregated = aggregateAnalysis(analysisResults.filter(Boolean));

    return NextResponse.json({
      pr: {
        number: pr.number,
        title: pr.title,
        base: pr.base.ref,
        head: pr.head.ref,
        state: pr.state,
      },
      filesChanged: workflowFiles.length,
      analysis: aggregated,
    });

  } catch (error) {
    console.error('PR comparison failed:', error);
    return NextResponse.json(
      { error: 'Failed to compare PR' },
      { status: 500 }
    );
  }
}

// Helper function to aggregate and deduplicate
function aggregateAnalysis(results: any[]) {
  const credentials = new Map();
  const domains = new Map();
  const workflowCalls = new Map();

  for (const result of results) {
    // Aggregate credentials
    if (result.base?.credentials) {
      result.base.credentials.forEach(cred => {
        const key = `${cred.type}-${cred.id}`;
        if (!credentials.has(key)) {
          credentials.set(key, { ...cred, inBase: true, inHead: false });
        }
      });
    }
    
    if (result.head?.credentials) {
      result.head.credentials.forEach(cred => {
        const key = `${cred.type}-${cred.id}`;
        if (credentials.has(key)) {
          credentials.get(key).inHead = true;
        } else {
          credentials.set(key, { ...cred, inBase: false, inHead: true });
        }
      });
    }

    // Aggregate domains (similar pattern)
    // ... implement for domains and workflowCalls
  }

  return {
    credentials: Array.from(credentials.values()),
    domains: Array.from(domains.values()),
    workflowCalls: Array.from(workflowCalls.values()),
  };
}
```

---

## 🔧 Task 4: N8N Analyzer Service

**File: `lib/n8n/analyzer.ts`**

```typescript
// N8N Workflow Analysis Service

export interface N8NCredential {
  id: string;
  name: string;
  type: string;
  nodeName: string;
}

export interface N8NDomain {
  url: string;
  type: 'http' | 'webhook' | 'api';
  nodeName: string;
  method?: string;
}

export interface N8NWorkflowCall {
  workflowId: string;
  workflowName: string;
  nodeName: string;
}

/**
 * Extract all credentials from an N8N workflow
 */
export function extractCredentials(workflow: any): N8NCredential[] {
  const credentials: N8NCredential[] = [];
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return credentials;
  }

  for (const node of workflow.nodes) {
    if (!node.credentials) continue;

    // Credentials are stored as: { credentialType: { id, name } }
    for (const [type, cred] of Object.entries(node.credentials)) {
      if (typeof cred === 'object' && cred !== null && 'id' in cred) {
        credentials.push({
          id: (cred as any).id,
          name: (cred as any).name || 'Unnamed',
          type,
          nodeName: node.name,
        });
      }
    }
  }

  return credentials;
}

/**
 * Extract all domains and URLs from workflow nodes
 */
export function extractDomains(workflow: any): N8NDomain[] {
  const domains: N8NDomain[] = [];
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return domains;
  }

  for (const node of workflow.nodes) {
    const params = node.parameters || {};
    
    // HTTP Request nodes
    if (node.type === 'n8n-nodes-base.httpRequest') {
      if (params.url) {
        domains.push({
          url: params.url,
          type: 'http',
          nodeName: node.name,
          method: params.method || 'GET',
        });
      }
    }

    // Webhook nodes
    if (node.type === 'n8n-nodes-base.webhook') {
      if (params.path) {
        domains.push({
          url: params.path,
          type: 'webhook',
          nodeName: node.name,
        });
      }
    }

    // Generic URL detection in any parameter
    const urlRegex = /https?:\/\/[^\s"'<>]+/g;
    const paramStr = JSON.stringify(params);
    const matches = paramStr.match(urlRegex);
    
    if (matches) {
      matches.forEach(url => {
        // Avoid duplicates
        if (!domains.some(d => d.url === url)) {
          domains.push({
            url,
            type: 'api',
            nodeName: node.name,
          });
        }
      });
    }
  }

  return domains;
}

/**
 * Extract workflow calls (executeWorkflow nodes)
 */
export function extractWorkflowCalls(workflow: any): N8NWorkflowCall[] {
  const calls: N8NWorkflowCall[] = [];
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return calls;
  }

  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.executeWorkflow') {
      const params = node.parameters || {};
      
      calls.push({
        workflowId: params.workflowId || '',
        workflowName: params.workflowName || params.source || 'Unknown',
        nodeName: node.name,
      });
    }
  }

  return calls;
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
```

---

## 🔧 Task 5: Comparison Results UI

**File: `components/compare/ComparisonResults.tsx`**

```tsx
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Key, 
  Globe, 
  Workflow, 
  AlertTriangle,
  CheckCircle,
  XCircle 
} from 'lucide-react';

export function ComparisonResults({ data }) {
  const { pr, filesChanged, analysis } = data;

  return (
    <div className="space-y-6">
      {/* PR Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">PR #{pr.number}: {pr.title}</h2>
            <p className="text-slate-600 mt-1">
              {pr.head} → {pr.base} • {filesChanged} workflow files changed
            </p>
          </div>
          <Badge variant={pr.state === 'open' ? 'default' : 'secondary'}>
            {pr.state}
          </Badge>
        </div>
      </Card>

      {/* Credentials Analysis */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-6 h-6 text-amber-600" />
          <h3 className="text-xl font-semibold">Credentials</h3>
          <Badge>{analysis.credentials.length} found</Badge>
        </div>

        <div className="space-y-2">
          {analysis.credentials.map((cred, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
            >
              <div>
                <p className="font-medium">{cred.type}</p>
                <p className="text-sm text-slate-500">
                  ID: {cred.id} • Node: {cred.nodeName}
                </p>
              </div>
              
              <div className="flex gap-2">
                {cred.inBase && (
                  <Badge variant="outline" className="bg-blue-50">
                    Main
                  </Badge>
                )}
                {cred.inHead && (
                  <Badge variant="outline" className="bg-amber-50">
                    Staging
                  </Badge>
                )}
                {!cred.inBase && cred.inHead && (
                  <Badge variant="destructive">New</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Domains Analysis */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-teal-600" />
          <h3 className="text-xl font-semibold">Domains & URLs</h3>
          <Badge>{analysis.domains.length} found</Badge>
        </div>

        <div className="space-y-2">
          {analysis.domains.map((domain, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
            >
              <div className="flex-1">
                <p className="font-mono text-sm">{domain.url}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {domain.type.toUpperCase()} • {domain.nodeName}
                  {domain.method && ` • ${domain.method}`}
                </p>
              </div>
              
              <div className="flex gap-2">
                {domain.inBase && domain.inHead && domain.url === domain.baseUrl ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Workflow Calls Analysis */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Workflow className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold">Workflow Calls</h3>
          <Badge>{analysis.workflowCalls.length} found</Badge>
        </div>

        <div className="space-y-2">
          {analysis.workflowCalls.map((call, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
            >
              <div>
                <p className="font-medium">{call.workflowName}</p>
                <p className="text-sm text-slate-500">
                  Called from: {call.nodeName}
                </p>
              </div>
              
              {call.workflowName.startsWith('staging-') && (
                <Badge variant="outline" className="bg-amber-50">
                  Needs Rename
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

---

## 📝 Implementation Checklist

### Phase 1: Repository Access Fix
- [ ] Update `getAllAccessibleRepos()` to include collaborative repos
- [ ] Add `affiliation` parameter with all three types
- [ ] Update API route to handle new repo structure
- [ ] Add repo type badges to UI (personal/org/collaborative)
- [ ] Test with organization repos and collaborative repos

### Phase 2: PR Input Interface
- [ ] Create `/compare` page with PR number input
- [ ] Add repository validation
- [ ] Build loading states and error handling
- [ ] Add PR number validation (numeric only)

### Phase 3: PR Comparison API
- [ ] Create `/api/github/pr/compare` endpoint
- [ ] Implement PR file fetching
- [ ] Filter for N8N workflow JSON files
- [ ] Fetch base (main) and head (staging) versions
- [ ] Call analyzer functions for each file

### Phase 4: N8N Analysis Engine
- [ ] Create `lib/n8n/analyzer.ts`
- [ ] Implement `extractCredentials()` function
- [ ] Implement `extractDomains()` function (HTTP + Webhooks)
- [ ] Implement `extractWorkflowCalls()` function
- [ ] Add `detectHardcodedSecrets()` function
- [ ] Test with real N8N workflow JSON

### Phase 5: Results UI
- [ ] Create `ComparisonResults` component
- [ ] Build credentials comparison cards
- [ ] Build domains comparison cards
- [ ] Build workflow calls comparison cards
- [ ] Add diff indicators (added/removed/changed)
- [ ] Add export functionality

---

## 🎨 UI Design Notes

**Color Coding:**
- 🔵 **Blue** - Exists in Main (production)
- 🟡 **Amber** - Exists in Staging (development)
- 🟢 **Green** - Added in PR
- 🔴 **Red** - Removed in PR
- ⚠️ **Warning** - Changed/different between branches

**Interaction:**
- Clickable cards to see full details
- Collapsible sections for large datasets
- Copy buttons for credentials/URLs
- Export as JSON button for entire analysis

---

## 🚀 Quick Start Commands

```bash
# 1. Install additional dependencies
npm install @octokit/rest

# 2. Create new files
touch lib/n8n/analyzer.ts
touch app/api/github/pr/compare/route.ts
touch app/(dashboard)/compare/page.tsx
touch components/compare/ComparisonResults.tsx

# 3. Update existing files
# - lib/github/client.ts
# - app/api/github/repos/route.ts
# - components/dashboard/RepoSelector.tsx

# 4. Test the flow
npm run dev
# Navigate to /dashboard → select repo → go to /compare → enter PR number
```

---

## 🧪 Testing Scenarios

1. **Collaborative Repo Access:**
   - Login with account that has access to org repos
   - Verify org repos appear in dropdown
   - Verify collaborative repos appear

2. **PR Comparison:**
   - Select a repo with N8N workflows
   - Enter a valid PR number (staging → main)
   - Verify credentials are extracted correctly
   - Verify domains/webhooks are detected
   - Verify workflow calls are identified

3. **Edge Cases:**
   - PR with no workflow changes
   - PR with only new workflows (no base)
   - PR with deleted workflows
   - Invalid PR number
   - Closed/merged PR

---

## 🎯 Expected Output Example

When user enters PR #42, they should see:

```
PR #42: Merge staging workflows to production
staging → main • 5 workflow files changed

Credentials (8 found)
✓ slackApi - ID: 301 [Main] [Staging]
⚠️ httpBasicAuth - ID: 201 [Staging only] - NEW
✓ googleSheetsApi - ID: 105 [Main] [Staging]

Domains & URLs (12 found)
✓ https://api.acme.com/orders [Unchanged]
⚠️ https://staging.api.acme.com → https://api.acme.com [Changed]
⚠️ /webhook/staging/orders → /webhook/orders [Changed]

Workflow Calls (3 found)
⚠️ staging-workflow-B → Should rename to: workflow-B
✓ workflow-C [Correct]
```

---

## 💡 Pro Tips

1. **Performance:** Use Promise.all() to fetch multiple files in parallel
2. **Caching:** Cache PR analysis results to avoid re-fetching
3. **Rate Limits:** GitHub API has limits - show progress indicator
4. **Large PRs:** Add pagination if PR has 50+ changed files
5. **Security:** Never display full credential IDs - mask last few characters

---

## 