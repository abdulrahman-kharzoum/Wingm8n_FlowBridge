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
    });
  }

  /**
   * Fetch all repositories accessible to the authenticated user
   * Includes both owned and collaborated repositories
   */
  async getUserRepositories(
    page: number = 1,
    perPage: number = 30,
    affiliation: 'owner' | 'collaborator' | 'organization_member' = 'owner'
  ): Promise<{ repos: Repository[]; total: number }> {
    try {
      const response = await (this.octokit.rest.repos as any).listForAuthenticatedUser({
        page,
        per_page: perPage,
        affiliation,
        sort: 'pushed',
        direction: 'desc',
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
          workflowFiles.push(file);
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
  workflowPath: string = '/'
): Promise<BranchWorkflows> {
  try {
    const workflows: Array<{
      name: string;
      path: string;
      content: N8NWorkflow;
    }> = [];

    // Find all JSON files that could be N8N workflows
    const workflowFiles = await service.findWorkflowFiles(owner, repo, branch, workflowPath);

    // Fetch content of each workflow file
    for (const file of workflowFiles) {
      try {
        const fileContent = await service.getFileContent(owner, repo, branch, file.path);
        const workflowData = JSON.parse(fileContent.content) as N8NWorkflow;

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
