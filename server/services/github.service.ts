import { Octokit } from '@octokit/rest';
import type { N8NWorkflow, BranchWorkflows } from '@shared/types/workflow.types';

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  html_url: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  pushed_at: string;
  stargazers_count: number;
  language: string | null;
  permissions?: {
    admin: boolean;
    maintain?: boolean;
    push: boolean;
    triage?: boolean;
    pull: boolean;
  };
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface WorkflowFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  url: string;
  download_url: string | null;
}

export interface WorkflowContent {
  name: string;
  path: string;
  content: string;
  sha: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      request: {
        headers: {
          'If-None-Match': '', // Prevent caching
          'Cache-Control': 'no-cache',
        },
      },
    });
  }

  /**
   * Fetch all repositories accessible to the authenticated user
   * Includes both owned and collaborated repositories
   */
  async getUserRepositories(
    page: number = 1,
    perPage: number = 30,
    affiliation: string = 'owner,collaborator,organization_member'
  ): Promise<{ repos: Repository[]; total: number }> {
    try {
      const response = await (this.octokit.rest.repos as any).listForAuthenticatedUser({
        page,
        per_page: perPage,
        affiliation,
        sort: 'updated',
        direction: 'desc',
        visibility: 'all',
      });

      return {
        repos: response.data as Repository[],
        total: response.headers['x-total-count'] ? parseInt(response.headers['x-total-count']) : 0,
      };
    } catch (error: any) {
      console.error('[GitHub] Failed to fetch repositories:', error.message, error.status, error.response?.data);
      throw new Error(`Failed to fetch repositories from GitHub: ${error.message}`);
    }
  }

  /**
   * Get all branches in a repository
   */
  async getRepositoryBranches(owner: string, repo: string): Promise<Branch[]> {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return response.data as Branch[];
    } catch (error) {
      console.error(`[GitHub] Failed to fetch branches for ${owner}/${repo}:`, error);
      throw new Error('Failed to fetch branches');
    }
  }

  /**
   * Search for a specific branch (staging or main)
   */
  async findBranch(owner: string, repo: string, branchName: string): Promise<Branch | null> {
    try {
      const response = await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: branchName,
      });

      return response.data as Branch;
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      console.error(`[GitHub] Failed to fetch branch ${branchName}:`, error);
      throw error;
    }
  }

  /**
   * Get the SHA for a branch
   */
  async getBranchSha(owner: string, repo: string, branchName: string): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getBranch({
        owner,
        repo,
        branch: branchName,
      });
      return response.data.commit.sha;
    } catch (error) {
      console.error(`[GitHub] Failed to get SHA for branch ${branchName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new branch from a base branch
   */
  async createBranch(owner: string, repo: string, newBranch: string, baseBranch: string): Promise<void> {
    try {
      // Get the SHA of the base branch
      const baseRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });

      const sha = baseRef.data.object.sha;

      // Create the new branch
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha,
      });
    } catch (error: any) {
      console.error(`[GitHub] Failed to create branch ${newBranch}:`, error);
      // Enhance error message for common issues
      if (error.status === 422 && error.message.includes('Reference already exists')) {
          throw new Error(`Branch '${newBranch}' already exists. Please delete it or wait a moment before trying again.`);
      }
      throw error;
    }
  }

  /**
   * Update or create a file in the repository
   */
  async updateFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<void> {
    try {
      // Check if file exists to get its SHA (for update)
      let sha: string | undefined;
      try {
        const file = await this.getFileContent(owner, repo, branch, path);
        sha = file.sha;
      } catch (e) {
        // File doesn't exist, will be created
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha,
      });
    } catch (error) {
      console.error(`[GitHub] Failed to update file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific pull request
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return response.data;
    } catch (error) {
      console.error(`[GitHub] Failed to fetch PR #${pullNumber}:`, error);
      throw error;
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string
  ): Promise<{ number: number; url: string; state: string }> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
      });

      return {
        number: response.data.number,
        url: response.data.html_url,
        state: response.data.state,
      };
    } catch (error) {
      console.error(`[GitHub] Failed to create PR:`, error);
      throw error;
    }
  }

  /**
   * List all files in a directory recursively
   */
  async listFilesInDirectory(
    owner: string,
    repo: string,
    branch: string,
    path: string = ''
  ): Promise<WorkflowFile[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: path || '.',
        ref: branch,
      });

      if (!Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((item: any) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        type: item.type,
        url: item.url,
        download_url: item.download_url,
      }));
    } catch (error) {
      if ((error as any).status === 404) {
        return [];
      }
      console.error(`[GitHub] Failed to list files in ${path}:`, error);
      throw error;
    }
  }

  /**
   * Recursively find all N8N workflow JSON files in a branch
   */
  async findWorkflowFiles(
    owner: string,
    repo: string,
    branch: string,
    path: string = '',
    maxDepth: number = 5,
    currentDepth: number = 0
  ): Promise<WorkflowFile[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const files = await this.listFilesInDirectory(owner, repo, branch, path);
      let workflowFiles: WorkflowFile[] = [];

      for (const file of files) {
        // Skip node_modules and hidden directories
        if (file.path.includes('node_modules') || file.path.includes('/.')) {
          continue;
        }

        if (file.type === 'file' && file.name.endsWith('.json')) {
          // Could be an N8N workflow file
          // Filter out obviously non-workflow files to reduce noise
          if (!file.name.includes('tsconfig') &&
              !file.name.includes('package') &&
              !file.name.includes('.eslintrc') &&
              !file.name.includes('vercel.json')) {
              workflowFiles.push(file);
          }
        } else if (file.type === 'dir') {
          // Recursively search subdirectories
          const nestedFiles = await this.findWorkflowFiles(
            owner,
            repo,
            branch,
            file.path,
            maxDepth,
            currentDepth + 1
          );
          workflowFiles = workflowFiles.concat(nestedFiles);
        }
      }

      return workflowFiles;
    } catch (error) {
      console.error(`[GitHub] Error finding workflow files in ${path}:`, error);
      return [];
    }
  }

  /**
   * Get the content of a file from a specific branch
   */
  async getFileContent(
    owner: string,
    repo: string,
    branch: string,
    path: string
  ): Promise<WorkflowContent> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(response.data)) {
        throw new Error('Path points to a directory, not a file');
      }

      const fileData = response.data as any;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

      return {
        name: response.data.name,
        path: response.data.path,
        content,
        sha: response.data.sha,
      };
    } catch (error) {
      console.error(`[GitHub] Failed to get file content from ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get file content blob by SHA
   */
  async getBlob(owner: string, repo: string, fileSha: string): Promise<string> {
    try {
      const response = await this.octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: fileSha,
      });

      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    } catch (error) {
      console.error(`[GitHub] Failed to get blob ${fileSha}:`, error);
      throw error;
    }
  }

  /**
   * Compare two branches and get the diff
   */
  async compareBranches(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<any> {
    try {
      const response = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      });

      return response.data;
    } catch (error) {
      console.error(`[GitHub] Failed to compare branches ${base}...${head}:`, error);
      throw error;
    }
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return response.data;
    } catch (error) {
      console.error('[GitHub] Failed to get authenticated user:', error);
      throw error;
    }
  }
}

/**
 * Fetch all N8N workflow files from a specific branch
 */
export async function fetchBranchWorkflows(
  service: GitHubService,
  owner: string,
  repo: string,
  branch: string,
  workflowPath: string = ''
): Promise<BranchWorkflows> {
  try {
    const workflows: Array<{
      name: string;
      path: string;
      content: N8NWorkflow;
    }> = [];

    // Find all JSON files that could be N8N workflows
    const workflowFiles = await service.findWorkflowFiles(owner, repo, branch, workflowPath);

    // Resolve branch to specific SHA to ensure we're reading the exact state
    // This avoids race conditions or caching issues with mutable branch refs
    let branchSha = branch;
    try {
      branchSha = await service.getBranchSha(owner, repo, branch);
      console.log(`[GitHub] Resolved branch ${branch} to commit ${branchSha}`);
    } catch (e) {
      console.warn(`[GitHub] Could not resolve SHA for branch ${branch}, using ref directly`);
    }

    // Fetch content of each workflow file
    for (const file of workflowFiles) {
      try {
        // Use getBlob with the specific file SHA to ensure we get the exact version for this branch
        // This prevents issues where getContent might return cached or incorrect ref versions
        const contentStr = await service.getBlob(owner, repo, file.sha);
        const workflowData = JSON.parse(contentStr) as N8NWorkflow;

        // Verify it's a valid N8N workflow by checking for nodes
        if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
          workflows.push({
            name: file.name,
            path: file.path,
            content: workflowData,
          });
        }
      } catch (error) {
        console.error(`Failed to parse workflow ${file.name}:`, error);
      }
    }

    return {
      branch,
      workflows,
    };
  } catch (error) {
    console.error(`Failed to fetch workflows from ${branch}:`, error);
    throw error;
  }
}

export function createGitHubService(accessToken: string): GitHubService {
  return new GitHubService(accessToken);
}
