import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Github,
  GitBranch,
  Key,
  Globe,
  Workflow,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  GitMerge,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { skipToken } from '@trpc/react-query';
import RepositorySelector from '@/components/RepositorySelector';
import CredentialsComparison from '@/components/CredentialsComparison';
import DomainsComparison from '@/components/DomainsComparison';
import WorkflowCallsComparison from '@/components/WorkflowCallsComparison';
import MergeDecisionSummary from '@/components/MergeDecisionSummary';
import type { MergeDecision } from '@shared/types/workflow.types';
import { toast } from 'sonner';

export default function ComparisonPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedRepo, setSelectedRepo] = useState<{
    owner: string;
    repo: string;
    stagingBranch: string;
    mainBranch: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState('credentials');
  const [mergeDecisions, setMergeDecisions] = useState<MergeDecision>({
    credentials: {},
    domains: {},
    workflowCalls: {},
  });

  // Fetch comparison data
  const comparisonQuery = trpc.workflow.compareBranches.useQuery(
    selectedRepo
      ? {
          owner: selectedRepo.owner,
          repo: selectedRepo.repo,
          stagingBranch: selectedRepo.stagingBranch,
          mainBranch: selectedRepo.mainBranch,
        }
      : skipToken,
    {
      retry: false,
    }
  );

  const handleRepositorySelected = (
    owner: string,
    repo: string,
    stagingBranch: string,
    mainBranch: string
  ) => {
    setSelectedRepo({ owner, repo, stagingBranch, mainBranch });
  };

  const handleCredentialSelected = (credentialId: string, source: 'staging' | 'main' | 'keep-both') => {
    setMergeDecisions((prev) => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [credentialId]: source,
      },
    }));
  };

  const handleDomainSelected = (url: string, selectedUrl: string) => {
    setMergeDecisions((prev) => ({
      ...prev,
      domains: {
        ...prev.domains,
        [url]: {
          selected: selectedUrl.includes('staging') ? 'staging' : 'main',
          url: selectedUrl,
        },
      },
    }));
  };

  const createMergeBranchMutation = trpc.merge.createMergeBranch.useMutation();
  const createPullRequestMutation = trpc.merge.createPullRequest.useMutation();

  const handleCreateMergeBranch = async () => {
    if (!selectedRepo) return;

    try {
      const result = await createMergeBranchMutation.mutateAsync({
        owner: selectedRepo.owner,
        repo: selectedRepo.repo,
        stagingBranch: selectedRepo.stagingBranch,
        mainBranch: selectedRepo.mainBranch,
        decisions: mergeDecisions,
      });

      toast.success('Merge branch created successfully!');

      // Show option to create PR
      const shouldCreatePR = window.confirm(
        'Merge branch created! Would you like to create a pull request?'
      );

      if (shouldCreatePR) {
        const prResult = await createPullRequestMutation.mutateAsync({
          owner: selectedRepo.owner,
          repo: selectedRepo.repo,
          mergeBranchName: result.data.name,
          targetBranch: selectedRepo.mainBranch,
        });

        toast.success('Pull request created!');
        window.open(prResult.data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to create merge branch:', error);
      toast.error('Failed to create merge branch. Please try again.');
    }
  };

  if (!selectedRepo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
        {/* Header */}
        <nav className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20 backdrop-blur-sm border border-accent/30">
                <Github className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Wingm8n FlowBridge</h1>
                <p className="text-xs text-slate-400">Workflow Comparison</p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <RepositorySelector
            onRepositorySelected={handleRepositorySelected}
            isLoading={comparisonQuery.isLoading}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
      {/* Header */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20 backdrop-blur-sm border border-accent/30">
              <GitMerge className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Workflow Comparison</h1>
              <p className="text-xs text-slate-400">
                {selectedRepo.owner}/{selectedRepo.repo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <GitBranch className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-300">{selectedRepo.stagingBranch}</span>
              <span className="text-slate-500">→</span>
              <GitBranch className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-300">{selectedRepo.mainBranch}</span>
            </div>

            <Button
              onClick={() => setSelectedRepo(null)}
              variant="ghost"
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Repo
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {comparisonQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-slate-400">Analyzing workflows...</p>
          </div>
        ) : comparisonQuery.error ? (
          <Alert className="bg-red-500/10 border-red-500/50 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to compare branches: {comparisonQuery.error.message}
            </AlertDescription>
          </Alert>
        ) : comparisonQuery.data ? (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  Comparison Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-accent">
                      {comparisonQuery.data.data.summary.credentialChanges}
                    </div>
                    <p className="text-sm text-slate-400">Credential Changes</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">
                      {comparisonQuery.data.data.summary.domainChanges}
                    </div>
                    <p className="text-sm text-slate-400">Domain Changes</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">
                      {comparisonQuery.data.data.summary.workflowCallChanges}
                    </div>
                    <p className="text-sm text-slate-400">Workflow Call Changes</p>
                  </div>
                  <div>
                    <Badge
                      className={
                        comparisonQuery.data.data.summary.hasConflicts
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      }
                    >
                      {comparisonQuery.data.data.summary.hasConflicts ? 'Has Conflicts' : 'No Conflicts'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Tabs */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle>Detailed Comparison</CardTitle>
                <CardDescription>Review and select changes to include in the merge</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-700/30 border border-slate-600/30">
                    <TabsTrigger value="credentials" className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      <span className="hidden sm:inline">Credentials</span>
                    </TabsTrigger>
                    <TabsTrigger value="domains" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      <span className="hidden sm:inline">Domains</span>
                    </TabsTrigger>
                    <TabsTrigger value="workflows" className="flex items-center gap-2">
                      <Workflow className="w-4 h-4" />
                      <span className="hidden sm:inline">Workflows</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Credentials Tab */}
                  <TabsContent value="credentials" className="mt-6">
                    <CredentialsComparison
                      credentials={comparisonQuery.data.data.comparison.credentials}
                      onCredentialSelected={handleCredentialSelected}
                    />
                  </TabsContent>

                  {/* Domains Tab */}
                  <TabsContent value="domains" className="mt-6">
                    <DomainsComparison
                      domains={comparisonQuery.data.data.comparison.domains}
                      onDomainSelected={handleDomainSelected}
                    />
                  </TabsContent>

                  {/* Workflows Tab */}
                  <TabsContent value="workflows" className="mt-6">
                    <WorkflowCallsComparison
                      workflowCalls={comparisonQuery.data.data.comparison.workflowCalls}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Merge Decision Summary */}
            <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitMerge className="w-5 h-5 text-accent" />
                  Merge Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MergeDecisionSummary
                  decisions={mergeDecisions}
                  credentialCount={comparisonQuery.data.data.comparison.credentials.length}
                  domainCount={comparisonQuery.data.data.comparison.domains.length}
                  workflowCallCount={
                    comparisonQuery.data.data.comparison.workflowCalls.differences.added.length +
                    comparisonQuery.data.data.comparison.workflowCalls.differences.removed.length +
                    comparisonQuery.data.data.comparison.workflowCalls.differences.modified.length
                  }
                  isLoading={createMergeBranchMutation.isPending}
                  onConfirm={handleCreateMergeBranch}
                  onCancel={() => setSelectedRepo(null)}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
