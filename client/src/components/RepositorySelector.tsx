import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, GitBranch, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { skipToken } from '@trpc/react-query';

interface RepositorySelectorProps {
  onRepositorySelected: (owner: string, repo: string, stagingBranch: string, mainBranch: string) => void;
  isLoading?: boolean;
}

export default function RepositorySelector({ onRepositorySelected, isLoading = false }: RepositorySelectorProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [stagingBranch, setStagingBranch] = useState<string>('staging');
  const [mainBranch, setMainBranch] = useState<string>('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch repositories
  const repositoriesQuery = trpc.github.listRepositories.useQuery(
    { page: 1, perPage: 50 },
    { retry: false }
  );

  // Fetch branches for selected repository
  const branchesQuery = trpc.github.getBranches.useQuery(
    selectedRepo
      ? {
          owner: selectedRepo.split('/')[0],
          repo: selectedRepo.split('/')[1],
        }
      : skipToken,
    {
      retry: false,
    }
  );

  // Update branches list when query completes
  useEffect(() => {
    if (branchesQuery.data) {
      const branchNames = branchesQuery.data.branches.map((b: any) => b.name);
      setBranches(branchNames);

      // Auto-select staging and main if they exist
      if (branchNames.includes('staging')) {
        setStagingBranch('staging');
      }
      if (branchNames.includes('main')) {
        setMainBranch('main');
      }
    }
  }, [branchesQuery.data]);

  const handleCompare = () => {
    if (!selectedRepo || !stagingBranch || !mainBranch) {
      setError('Please select a repository and both branches');
      return;
    }

    if (stagingBranch === mainBranch) {
      setError('Staging and main branches must be different');
      return;
    }

    const [owner, repo] = selectedRepo.split('/');
    onRepositorySelected(owner, repo, stagingBranch, mainBranch);
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5 text-accent" />
          Select Repository & Branches
        </CardTitle>
        <CardDescription>
          Choose the repository and branches to compare N8N workflows
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository Selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Repository</label>
          <Select value={selectedRepo} onValueChange={(value) => {
            setSelectedRepo(value);
            setError(null);
          }}>
            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
              <SelectValue placeholder="Select a repository..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {repositoriesQuery.isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading repositories...
                </SelectItem>
              ) : repositoriesQuery.data?.repositories && repositoriesQuery.data.repositories.length > 0 ? (
                repositoriesQuery.data.repositories.map((repo) => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      {repo.full_name}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="empty" disabled>
                  No repositories found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Branches Selection */}
        {selectedRepo && (
          <div className="grid grid-cols-2 gap-4">
            {/* Staging Branch */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-accent" />
                Staging Branch
              </label>
              <Select value={stagingBranch} onValueChange={(value) => {
                setStagingBranch(value);
                setError(null);
              }}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {branchesQuery.isLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading branches...
                    </SelectItem>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>
                      No branches found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="w-full justify-center text-xs text-accent border-accent/50">
                Development Branch
              </Badge>
            </div>

            {/* Main Branch */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-500" />
                Main Branch
              </label>
              <Select value={mainBranch} onValueChange={(value) => {
                setMainBranch(value);
                setError(null);
              }}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {branchesQuery.isLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading branches...
                    </SelectItem>
                  ) : branches.length > 0 ? (
                    branches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="empty" disabled>
                      No branches found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Badge variant="outline" className="w-full justify-center text-xs text-emerald-500 border-emerald-500/50">
                Production Branch
              </Badge>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="bg-red-500/10 border-red-500/50 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {selectedRepo && stagingBranch && mainBranch && stagingBranch !== mainBranch && !error && (
          <Alert className="bg-emerald-500/10 border-emerald-500/50 text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Ready to compare {selectedRepo} ({stagingBranch} → {mainBranch})
            </AlertDescription>
          </Alert>
        )}

        {/* Compare Button */}
        <Button
          onClick={handleCompare}
          disabled={!selectedRepo || !stagingBranch || !mainBranch || isLoading}
          className="w-full bg-accent hover:bg-accent-dark text-accent-foreground font-semibold h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Workflows...
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4 mr-2" />
              Compare Branches
            </>
          )}
        </Button>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-2">
          <h4 className="font-semibold text-white text-sm">What happens next?</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>✓ We'll fetch all N8N workflows from both branches</li>
            <li>✓ Extract and compare credentials, domains, and workflow calls</li>
            <li>✓ Show you the differences in an easy-to-understand interface</li>
            <li>✓ Help you create a merge branch with your selected changes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
