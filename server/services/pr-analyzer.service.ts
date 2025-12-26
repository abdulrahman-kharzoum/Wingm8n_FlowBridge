import { Octokit } from '@octokit/rest';
import { extractCredentials, extractDomains, extractWorkflowCalls, detectHardcodedSecrets, extractMetadata, compareMetadata, compareNodes } from '@shared/utils/workflow-parser';
import { createGitHubService } from './github.service';

export interface WorkflowFileAnalysis {
  filename: string;
  status: string;
  base: WorkflowAnalysisData | null;
  head: WorkflowAnalysisData | null;
  secrets?: string[];
}

export interface WorkflowAnalysisData {
  content?: any; // Store raw content for diffing
  credentials: any[];
  domains: any[];
  workflowCalls: {
    workflow: string;
    calls: any[];
    calledBy: any[];
  };
  metadata: any;
}

export interface PRAnalysisResult {
  pr: {
    number: number;
    title: string;
    base: string;
    head: string;
    state: string;
  };
  filesChanged: number;
  analysis: {
    credentials: any[];
    domains: any[];
    workflowCalls: any[];
    secrets: string[];
    metadata: any[];
    nodeChanges: any[];
  };
}

export class PRAnalyzerService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }

  async analyzePR(owner: string, repo: string, prNumber: number): Promise<PRAnalysisResult> {
    try {
      // 1. Fetch PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      // 2. Get list of changed files
      const { data: files } = await this.octokit.pulls.listFiles({
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
          let baseContent: any = null;
          let headContent: any = null;
          let secrets: string[] = [];

          try {
            // Base version (main/production)
            if (file.status !== 'added') {
              try {
                const { data: baseFile } = await this.octokit.repos.getContent({
                  owner,
                  repo,
                  path: file.filename,
                  ref: pr.base.sha,
                });
                
                if ('content' in baseFile) {
                  const content = Buffer.from(baseFile.content, 'base64').toString('utf-8');
                  baseContent = JSON.parse(content);
                }
              } catch (e) {
                console.warn(`Could not fetch base content for ${file.filename}`);
              }
            }

            // Head version (staging)
            if (file.status !== 'removed') {
              try {
                const { data: headFile } = await this.octokit.repos.getContent({
                  owner,
                  repo,
                  path: file.filename,
                  ref: pr.head.sha,
                });
                
                if ('content' in headFile) {
                  const content = Buffer.from(headFile.content, 'base64').toString('utf-8');
                  headContent = JSON.parse(content);
                  
                  // Detect secrets in the new version
                  secrets = detectHardcodedSecrets(headContent);
                }
              } catch (e) {
                console.warn(`Could not fetch head content for ${file.filename}`);
              }
            }

            // 5. Analyze both versions
            return {
              filename: file.filename,
              status: file.status,
              base: baseContent ? {
                content: baseContent,
                credentials: extractCredentials(baseContent),
                domains: extractDomains(baseContent, file.filename),
                workflowCalls: extractWorkflowCalls(baseContent, file.filename),
                metadata: extractMetadata(baseContent),
              } : null,
              head: headContent ? {
                content: headContent,
                credentials: extractCredentials(headContent),
                domains: extractDomains(headContent, file.filename),
                workflowCalls: extractWorkflowCalls(headContent, file.filename),
                metadata: extractMetadata(headContent),
              } : null,
              secrets
            };
          } catch (error) {
            console.error(`Failed to analyze ${file.filename}:`, error);
            return null;
          }
        })
      );

      // 6. Aggregate and deduplicate results
      const validResults = analysisResults.filter((r): r is any => r !== null) as WorkflowFileAnalysis[];
      const aggregated = this.aggregateAnalysis(validResults);

      return {
        pr: {
          number: pr.number,
          title: pr.title,
          base: pr.base.ref,
          head: pr.head.ref,
          state: pr.state,
        },
        filesChanged: workflowFiles.length,
        analysis: aggregated,
      };

    } catch (error) {
      console.error('PR comparison failed:', error);
      throw new Error('Failed to compare PR');
    }
  }

  private aggregateAnalysis(results: WorkflowFileAnalysis[]) {
    const credentials = new Map();
    const domains = new Map();
    const workflowCalls = new Map();
    const secrets: string[] = [];
    const metadataDiffs: any[] = [];
    const nodeDiffs: any[] = [];

    for (const result of results) {
        // Compare Metadata and Nodes if both versions exist
        if (result.base?.content && result.head?.content) {
            const mDiffs = compareMetadata(result.base.metadata, result.head.metadata);
            if (mDiffs.length > 0) {
                metadataDiffs.push({
                    filename: result.filename,
                    diffs: mDiffs
                });
            }

            const nDiffs = compareNodes(result.base.content, result.head.content);
            if (nDiffs.length > 0) {
                nodeDiffs.push({
                    filename: result.filename,
                    diffs: nDiffs
                });
            }
        }

      if (result.secrets) {
        secrets.push(...result.secrets);
      }

      // Aggregate credentials
      if (result.base?.credentials) {
        result.base.credentials.forEach((cred: any) => {
          const key = `${cred.type}-${cred.id}`;
          if (!credentials.has(key)) {
            // Map inBase -> inMain, inHead -> inStaging to match types
            credentials.set(key, {
              ...cred,
              inMain: true,
              inStaging: false,
              filename: result.filename,
              mainName: cred.name
            });
          }
        });
      }
      
      if (result.head?.credentials) {
        result.head.credentials.forEach((cred: any) => {
          const key = `${cred.type}-${cred.id}`;
          if (credentials.has(key)) {
            const existing = credentials.get(key);
            existing.inStaging = true;
            existing.stagingName = cred.name;
            // Update name to use staging name if present, as it's the "new" version
            existing.name = cred.name;
          } else {
            credentials.set(key, {
              ...cred,
              inMain: false,
              inStaging: true,
              filename: result.filename,
              stagingName: cred.name
            });
          }
        });
      }

      // Aggregate domains
      if (result.base?.domains) {
        result.base.domains.forEach((domain: any) => {
          const key = `${domain.url}`;
          if (!domains.has(key)) {
            domains.set(key, {
                ...domain,
                inMain: true,
                inStaging: false,
                mainUrl: domain.url, // Explicitly set mainUrl
                filename: result.filename
            });
          }
        });
      }

      if (result.head?.domains) {
        result.head.domains.forEach((domain: any) => {
          const key = `${domain.url}`;
          if (domains.has(key)) {
            const existing = domains.get(key);
            existing.inStaging = true;
            existing.stagingUrl = domain.url; // Explicitly set stagingUrl on existing
          } else {
            domains.set(key, {
                ...domain,
                inMain: false,
                inStaging: true,
                stagingUrl: domain.url, // Explicitly set stagingUrl
                filename: result.filename
            });
          }
        });
      }

      // Aggregate workflow calls
      if (result.base?.workflowCalls && result.base.workflowCalls.calls) {
        result.base.workflowCalls.calls.forEach((call: any) => {
          const key = `${call.sourceWorkflow}-${call.targetWorkflow}`;
          if (!workflowCalls.has(key)) {
            workflowCalls.set(key, { ...call, inMain: true, inStaging: false, filename: result.filename });
          }
        });
      }

      if (result.head?.workflowCalls && result.head.workflowCalls.calls) {
        result.head.workflowCalls.calls.forEach((call: any) => {
          const key = `${call.sourceWorkflow}-${call.targetWorkflow}`;
          if (workflowCalls.has(key)) {
            const existing = workflowCalls.get(key);
            existing.inStaging = true;
          } else {
            workflowCalls.set(key, { ...call, inMain: false, inStaging: true, filename: result.filename });
          }
        });
      }
    }

    return {
      credentials: Array.from(credentials.values()),
      domains: Array.from(domains.values()),
      workflowCalls: Array.from(workflowCalls.values()),
      secrets: Array.from(new Set(secrets)), // Deduplicate secrets
      metadata: metadataDiffs,
      nodeChanges: nodeDiffs,
    };
  }
}

export function createPRAnalyzerService(accessToken: string): PRAnalyzerService {
  return new PRAnalyzerService(accessToken);
}