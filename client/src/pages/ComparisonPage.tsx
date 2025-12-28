import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
  Github,
  GitBranch,
  Key,
  Globe,
  Workflow,
  Settings2,
  Info,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  GitMerge,
  ArrowRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { skipToken } from '@tanstack/react-query';
import RepositorySelector from '@/components/RepositorySelector';
import CredentialsComparison from '@/components/CredentialsComparison';
import DomainsComparison from '@/components/DomainsComparison';
import WorkflowCallsComparison from '@/components/WorkflowCallsComparison';
import MetadataComparison from '@/components/MetadataComparison';
import NodeChangesComparison from '@/components/NodeChangesComparison';
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
    prNumber?: number; // Add support for PR number
  } | null>(null);
  const [activeTab, setActiveTab] = useState('credentials');
  const [mergeDecisions, setMergeDecisions] = useState<MergeDecision & { metadata: Record<string, 'staging' | 'main'> }>({
    credentials: {},
    domains: {},
    workflowCalls: {},
    metadata: {},
  });
  const [showMergeSuccessDialog, setShowMergeSuccessDialog] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
      branchName: string;
      prUrl?: string;
  } | null>(null);

  // Fetch comparison data
  // Use PR comparison if prNumber is present, otherwise fallback to branch comparison (or we can switch entirely)
  // For now, let's keep the existing hook but we might need a new one for PRs if the response structure is different.
  // The PR comparison returns a different structure. Let's create a conditional query or separate component.
  
  // Actually, let's stick to the plan and add the PR input.
  
  const [prNumber, setPrNumber] = useState('');

  const prComparisonQuery = trpc.prComparison.compare.useMutation();

  // Auto-initialize decisions is currently disabled to let user choose manually.
  // Uncomment or modify if defaults are desired in future.
  /*
  useEffect(() => {
      const analysis = prComparisonQuery.data?.analysis;
      if (!analysis) return;

      // Auto-select Main for Metadata by default
      const metadataDecisions: Record<string, 'staging' | 'main'> = {};
      if (analysis.metadata) {
          analysis.metadata.forEach((file: any) => {
              file.diffs.forEach((diff: any) => {
                  const uniqueKey = `${file.filename}-${diff.key}`;
                  metadataDecisions[uniqueKey] = 'main';
              });
          });
      }

      setMergeDecisions(prev => ({
          ...prev,
          metadata: {
              ...prev.metadata,
              ...metadataDecisions
          }
      }));
  }, [prComparisonQuery.data?.analysis]);
  */

  const handleComparePR = async () => {
      if (!selectedRepo || !prNumber) return;
      try {
          const result = await prComparisonQuery.mutateAsync({
              owner: selectedRepo.owner,
              repo: selectedRepo.repo,
              prNumber: parseInt(prNumber),
          });

          // Update the selected branches based on the PR comparison
          setSelectedRepo({
              ...selectedRepo,
              stagingBranch: result.pr.head,
              mainBranch: result.pr.base
          });
          
          toast.success(`PR #${result.pr.number} analyzed. Branches updated: ${result.pr.head} → ${result.pr.base}`);
      } catch (e) {
          console.error(e);
          toast.error("Failed to analyze PR");
      }
  };

  // We are temporarily disabling the old branch comparison for this task to focus on PRs,
  // or we can allow both. The prompt asks to "load available branches and then when the user click on compare he compare the main with staging by pull requests".
  // This implies the user selects repo -> then maybe selects branches OR enters PR.
  // The prompt explicitly says: "create PR Input & Comparison Interface" and "PR Comparison Dashboard".
  
  // Let's modify handleRepositorySelected to set the repo context.
  const handleRepositorySelected = (
    owner: string,
    repo: string,
    stagingBranch: string,
    mainBranch: string
  ) => {
    // Reset state when selecting a new repository
    setPrNumber('');
    setMergeDecisions({
      credentials: {},
      domains: {},
      workflowCalls: {},
      metadata: {},
    });
    setMergeResult(null);
    prComparisonQuery.reset();
    
    setSelectedRepo({ owner, repo, stagingBranch, mainBranch });
  };

  const handleCredentialSelected = (credentialId: string, source: string | null) => {
    setMergeDecisions((prev) => {
      const newCredentials = { ...prev.credentials };
      if (source === null) {
        delete newCredentials[credentialId];
      } else {
        newCredentials[credentialId] = source;
      }
      return {
        ...prev,
        credentials: newCredentials,
      };
    });
  };

  const handleDomainSelected = (url: string, selectedUrl: string | null, source?: 'staging' | 'main' | 'custom') => {
    setMergeDecisions((prev) => {
        const newDomains = { ...prev.domains };
        if (selectedUrl === null) {
            delete newDomains[url];
        } else {
            // Determine source based on which URL was passed
            // The DomainsComparison passes either mainUrl or stagingUrl
            // We need to check which one it matches in the analysis
            const domainDiff = prComparisonQuery.data?.analysis.domains.find(d => d.url === url);
            let determinedSource: 'staging' | 'main' | 'custom' = source || 'staging';
            
            if (domainDiff && determinedSource !== 'custom') {
                if (selectedUrl === domainDiff.mainUrl) {
                    determinedSource = 'main';
                } else if (selectedUrl === domainDiff.stagingUrl) {
                    determinedSource = 'staging';
                }
            }
            
            newDomains[url] = {
                selected: determinedSource,
                url: selectedUrl,
            };
        }
        return {
            ...prev,
            domains: newDomains,
        };
    });
  };

  const n8nUtils = trpc.useContext().n8n;
  const generateSuggestionMutation = trpc.n8n.generateGraphSuggestion.useMutation();
  const createWorkflowMutation = trpc.n8n.createWorkflowFromMapping.useMutation();
  const workflowsQuery = trpc.n8n.getWorkflows.useQuery(
      { owner: selectedRepo?.owner || '', repo: selectedRepo?.repo || '' }, 
      {
          enabled: !!selectedRepo,
          // Disable aggressive refetching
          refetchOnWindowFocus: false,
          staleTime: 5 * 60 * 1000, // 5 minutes
          retry: false
      }
  );
  
  const [suggestions, setSuggestions] = useState<Record<string, { status: 'mapped' | 'missing'; targetId?: string; targetName?: string }>>({});
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState<string | null>(null);

  const handleGenerateSuggestions = async () => {
    if (!analysis?.workflowCalls) return;
    try {
        const stagingCalls = analysis.workflowCalls
             .filter(c => !c.inMain) 
             .map(c => ({
                 sourceWorkflow: c.sourceWorkflow,
                 targetWorkflow: c.targetWorkflow,
                 targetWorkflowName: c.targetWorkflowName
             }));
        
        // Ensure unique
        const uniqueCalls = Array.from(new Set(stagingCalls.map(c => JSON.stringify(c)))).map(s => JSON.parse(s));

        if (!selectedRepo) {
            toast.error("Repository not selected");
            return;
        }

        const result = await generateSuggestionMutation.mutateAsync({ 
            owner: selectedRepo.owner,
            repo: selectedRepo.repo,
            stagingCalls: uniqueCalls 
        });
        setSuggestions(result);
        toast.success("Graph suggestions generated");
    } catch(e) {
        console.error(e);
        toast.error("Failed to generate suggestions");
    }
  };

  const handleCreateWorkflow = async (call: any) => {
      if (!selectedRepo || !prNumber) return;
      if (!call.targetWorkflowName) {
          toast.error("Cannot create workflow: Missing name");
          return;
      }
      
      setIsCreatingWorkflow(call.targetWorkflow);
      try {
          const result = await createWorkflowMutation.mutateAsync({
              owner: selectedRepo.owner,
              repo: selectedRepo.repo,
              prNumber: parseInt(prNumber),
              targetName: call.targetWorkflowName,
              targetId: call.targetWorkflow // Pass ID for accurate lookup
          });
          
          toast.success(`Created workflow: ${result.name}`);
          
          // Update suggestion to mapped
          setSuggestions(prev => ({
              ...prev,
              [call.targetWorkflow]: {
                  status: 'mapped',
                  targetId: result.id,
                  targetName: result.name
              }
          }));
          
          // Automatically select map action
          handleWorkflowCallSelected(call, { 
              action: 'map', 
              targetId: result.id, 
              targetName: result.name 
          });

      } catch (e: any) {
          console.error(e);
          toast.error(`Failed to create workflow: ${e.message}`);
      } finally {
          setIsCreatingWorkflow(null);
      }
  };

  const handleWorkflowCallSelected = (call: any, action: 'add' | 'remove' | 'keep' | { action: 'map'; targetId: string; targetName?: string }) => {
       setMergeDecisions((prev) => ({
           ...prev,
           workflowCalls: {
               ...prev.workflowCalls,
               [`${call.sourceWorkflow}->${call.targetWorkflow}`]: action
           }
       }));
  };

  const handleBulkWorkflowCallSelected = (updates: Record<string, 'add' | 'remove' | 'keep' | { action: 'map'; targetId: string; targetName?: string }>) => {
       setMergeDecisions((prev) => ({
           ...prev,
           workflowCalls: {
               ...prev.workflowCalls,
               ...updates
           }
       }));
  };

  const handleMetadataSelected = (filename: string, key: string, source: 'staging' | 'main' | null) => {
      const uniqueKey = `${filename}-${key}`;
      setMergeDecisions((prev) => {
          const newMetadata = { ...prev.metadata };
          if (source === null) {
              delete newMetadata[uniqueKey];
          } else {
              newMetadata[uniqueKey] = source;
          }
          return { ...prev, metadata: newMetadata };
      });
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
        decisions: mergeDecisions as any, // Cast to any to bypass type check for now, as types are complex
      });

      setMergeResult({ branchName: result.data.name });
      setShowMergeSuccessDialog(true);
      toast.success('Merge branch created successfully!');

    } catch (error: any) {
      console.error('Failed to create merge branch:', error);
      // Extract error message if possible
      const errorMessage = error.message || error.shape?.message || 'Failed to create merge branch. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleCreatePR = async () => {
      if (!selectedRepo || !mergeResult) return;
      
      try {
        const prResult = await createPullRequestMutation.mutateAsync({
          owner: selectedRepo.owner,
          repo: selectedRepo.repo,
          mergeBranchName: mergeResult.branchName,
          targetBranch: selectedRepo.mainBranch,
        });

        toast.success('Pull request created!');
        setMergeResult(prev => prev ? ({ ...prev, prUrl: prResult.data.url }) : null);
        window.open(prResult.data.url, '_blank');
      } catch (error: any) {
          console.error('Failed to create PR:', error);
          const errorMessage = error.message || 'Failed to create PR.';
          toast.error(errorMessage);
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
            isLoading={false}
          />
        </main>
      </div>
    );
  }

  // If we have a repo selected but no PR analysis yet, show PR input
  if (!prComparisonQuery.data) {
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
                  <h1 className="text-xl font-bold text-white">PR Comparison</h1>
                  <p className="text-xs text-slate-400">
                    {selectedRepo.owner}/{selectedRepo.repo}
                  </p>
                </div>
              </div>
                <Button
                  onClick={() => {
                    setSelectedRepo(null);
                    setPrNumber('');
                    setMergeDecisions({
                      credentials: {},
                      domains: {},
                      workflowCalls: {},
                      metadata: {},
                    });
                    setMergeResult(null);
                    prComparisonQuery.reset();
                  }}
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change Repo
                </Button>
            </div>
          </nav>

          <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitMerge className="w-5 h-5 text-accent" />
                        Enter Pull Request Details
                    </CardTitle>
                    <CardDescription>
                        Analyze N8N workflow changes in a Pull Request
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Pull Request Number</label>
                        <Input
                            type="number"
                            placeholder="e.g. 42"
                            value={prNumber}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrNumber(e.target.value)}
                            className="bg-slate-900/50 border-slate-600 text-white"
                        />
                    </div>
                    <Button
                        onClick={handleComparePR}
                        disabled={!prNumber || prComparisonQuery.isPending}
                        className="w-full bg-accent hover:bg-accent-dark text-accent-foreground"
                    >
                        {prComparisonQuery.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing PR...
                            </>
                        ) : (
                            'Compare & Analyze'
                        )}
                    </Button>
                </CardContent>
            </Card>
          </main>
        </div>
      );
  }

  const analysis = prComparisonQuery.data.analysis;

  // Validation Check: Are all items decided?
  const totalCredentials = analysis.credentials.length;
  const decidedCredentials = Object.keys(mergeDecisions.credentials).length;
  
  const totalDomains = analysis.domains.length;
  const decidedDomains = Object.keys(mergeDecisions.domains).length;
  
  const totalCalls = analysis.workflowCalls.length;
  const decidedCalls = Object.keys(mergeDecisions.workflowCalls).length;

  const totalMetadata = analysis.metadata?.length || 0;
  const decidedMetadata = Object.keys(mergeDecisions.metadata).length;

  const isAllDecided =
      decidedCredentials >= totalCredentials &&
      decidedDomains >= totalDomains &&
      decidedCalls >= totalCalls &&
      decidedMetadata >= totalMetadata;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col">
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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-hidden flex flex-col">
          <div className="flex-1 flex flex-col gap-6">
            {/* PR Summary */}
            <div className="flex-shrink-0">
                <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
                <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    PR #{prComparisonQuery.data.pr.number}: {prComparisonQuery.data.pr.title}
                    </CardTitle>
                    <CardDescription>
                        {prComparisonQuery.data.pr.head} → {prComparisonQuery.data.pr.base} • {prComparisonQuery.data.filesChanged} workflow files changed
                    </CardDescription>
                </CardHeader>
                <CardContent className="py-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <div className="text-xl font-bold text-accent">
                        {analysis.credentials.length}
                        </div>
                        <p className="text-xs text-slate-400">Total Credentials</p>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-accent">
                        {analysis.domains.length}
                        </div>
                        <p className="text-xs text-slate-400">Total Domains</p>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-accent">
                        {analysis.workflowCalls.length}
                        </div>
                        <p className="text-xs text-slate-400">Total Calls</p>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-accent">
                        {(analysis.nodeChanges?.length || 0)}
                        </div>
                        <p className="text-xs text-slate-400">Node Changes</p>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-red-400">
                        {analysis.secrets.length}
                        </div>
                        <p className="text-xs text-slate-400">Secrets Detected</p>
                    </div>
                    </div>
                </CardContent>
                </Card>

                {/* Secrets Warning */}
                {analysis.secrets.length > 0 && (
                    <Alert className="mt-4 bg-red-500/10 border-red-500/50 text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Warning: {analysis.secrets.length} hardcoded secrets detected in the modified workflows!
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Comparison Tabs */}
            <Card className="bg-slate-800/50 border-slate-700 flex-1 flex flex-col overflow-hidden">
              <CardHeader className="py-4 flex-shrink-0">
                <CardTitle className="text-lg">Detailed Analysis</CardTitle>
                <CardDescription>Review extracted information from the PR</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto min-h-0 pb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5 bg-slate-700/30 border border-slate-600/30 overflow-x-auto">
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
                     <TabsTrigger value="nodes" className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Node Changes</span>
                    </TabsTrigger>
                    <TabsTrigger value="metadata" className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <span className="hidden sm:inline">Metadata</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Credentials Tab */}
                  <TabsContent value="credentials" className="mt-6">
                    <CredentialsComparison
                      credentials={analysis.credentials}
                      onCredentialSelected={handleCredentialSelected}
                      mergeDecisions={mergeDecisions.credentials}
                    />
                  </TabsContent>

                  {/* Domains Tab */}
                  <TabsContent value="domains" className="mt-6">
                    <DomainsComparison
                      domains={analysis.domains}
                      onDomainSelected={handleDomainSelected}
                      mergeDecisions={mergeDecisions.domains}
                    />
                  </TabsContent>

                  {/* Workflows Tab */}
                  <TabsContent value="workflows" className="mt-6">
                    <WorkflowCallsComparison
                      workflowCalls={analysis.workflowCalls}
                      onCallSelected={handleWorkflowCallSelected}
                      onBulkCallSelected={handleBulkWorkflowCallSelected}
                      mergeDecisions={mergeDecisions.workflowCalls}
                      onGenerateSuggestions={handleGenerateSuggestions}
                      isGeneratingSuggestions={generateSuggestionMutation.isPending}
                      suggestions={suggestions}
                      onCreateWorkflow={handleCreateWorkflow}
                      isCreatingWorkflow={isCreatingWorkflow}
                      availableWorkflows={workflowsQuery.data || []}
                    />
                  </TabsContent>
                   
                  {/* Node Changes Tab */}
                  <TabsContent value="nodes" className="mt-6">
                    <NodeChangesComparison nodeChanges={analysis.nodeChanges || []} />
                  </TabsContent>

                  {/* Metadata Tab */}
                  <TabsContent value="metadata" className="mt-6">
                    <MetadataComparison
                        metadata={analysis.metadata || []}
                        onMetadataSelected={handleMetadataSelected}
                        mergeDecisions={mergeDecisions.metadata}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex-shrink-0 flex justify-end gap-4 sticky bottom-0 bg-slate-900/95 p-4 border-t border-slate-800 backdrop-blur z-40 mt-auto">
                <div className="flex-1 text-sm text-slate-400 flex items-center">
                    {!isAllDecided && (
                        <span className="flex items-center text-amber-500">
                             <AlertCircle className="w-4 h-4 mr-2" />
                             Please select an action for all items before merging.
                        </span>
                    )}
                </div>
                <Button variant="outline" onClick={() => setSelectedRepo(null)}>
                    Cancel
                </Button>
                <Button
                    onClick={handleCreateMergeBranch}
                    disabled={createMergeBranchMutation.isPending || !isAllDecided}
                    className={`min-w-[200px] ${!isAllDecided ? 'opacity-50 cursor-not-allowed' : 'bg-accent hover:bg-accent-dark text-accent-foreground'}`}
                >
                    {createMergeBranchMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Merge Branch...
                        </>
                    ) : (
                        <>
                            <GitMerge className="w-4 h-4 mr-2" />
                            Merge Changes
                        </>
                    )}
                </Button>
            </div>
          </div>
      </main>

      <Dialog open={showMergeSuccessDialog} onOpenChange={setShowMergeSuccessDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Merge Branch Created
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                    Successfully created merge branch <strong>{mergeResult?.branchName}</strong>.
                    You can now create a pull request to review and merge these changes into {selectedRepo.mainBranch}.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowMergeSuccessDialog(false)} className="text-slate-300 border-slate-600 hover:bg-slate-800">
                    Close
                </Button>
                {mergeResult?.prUrl ? (
                    <Button
                        onClick={() => window.open(mergeResult.prUrl, '_blank')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        View Pull Request <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleCreatePR}
                        disabled={createPullRequestMutation.isPending}
                        className="bg-accent hover:bg-accent-dark text-accent-foreground"
                    >
                        {createPullRequestMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating PR...
                            </>
                        ) : (
                            'Create Pull Request'
                        )}
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
