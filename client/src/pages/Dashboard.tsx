import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { useRepository } from '@/contexts/RepositoryContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Workflow, 
  GitBranch, 
  Key, 
  Globe, 
  ChevronRight,
  LogOut,
  Settings,
  RefreshCw,
  AlertCircle,
  Github
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const { selectedRepository } = useRepository();
  const [activeTab, setActiveTab] = useState('credentials');
  const [selectedBranch, setSelectedBranch] = useState<'staging' | 'main'>('staging');

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
              <Workflow className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Wingm8n FlowBridge</h1>
              <p className="text-xs text-slate-400">
                {selectedRepository ? selectedRepository.repo.full_name : 'N8N Workflow Merge Tool'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-slate-300">{user?.name || 'User'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/select-repository')}
              className="text-slate-400 hover:text-accent hover:bg-slate-800 flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              Change Repo
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-400 hover:text-accent hover:bg-slate-800"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Welcome section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.name}</h2>
          <p className="text-slate-400">Manage your N8N workflow merges between staging and production</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-accent" />
                Credentials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">—</div>
              <p className="text-xs text-slate-500 mt-1">Unique IDs detected</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                Domains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">—</div>
              <p className="text-xs text-slate-500 mt-1">URLs detected</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Workflow className="w-4 h-4 text-accent" />
                Workflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">—</div>
              <p className="text-xs text-slate-500 mt-1">Call chains analyzed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-accent" />
                Branches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">2</div>
              <p className="text-xs text-slate-500 mt-1">staging & main</p>
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700/50 sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Repository</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Branch selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Branch</label>
                  <div className="space-y-2">
                    {(['staging', 'main'] as const).map((branch) => (
                      <button
                        key={branch}
                        onClick={() => setSelectedBranch(branch)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          selectedBranch === branch
                            ? 'bg-accent/20 border border-accent/50 text-accent'
                            : 'bg-slate-700/30 border border-slate-600/30 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <GitBranch className="w-4 h-4" />
                        <span className="text-sm font-medium capitalize">{branch}</span>
                        {selectedBranch === branch && <ChevronRight className="w-4 h-4 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sync status */}
                <div className="pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-xs font-semibold text-slate-400">Repository</span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono break-all">
                    {selectedRepository?.repo.full_name || 'No repository selected'}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Last synced: Just now</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Settings */}
                <div className="pt-4 border-t border-slate-700/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-slate-400 hover:text-accent hover:bg-slate-700/30"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main panel */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle>Workflow Analysis</CardTitle>
                <CardDescription>Compare and merge N8N workflows between branches</CardDescription>
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
                  <TabsContent value="credentials" className="space-y-4 mt-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Connect GitHub Repository</h4>
                        <p className="text-sm text-slate-300 mt-1">
                          To get started, connect your GitHub repository containing N8N workflows. We'll analyze credentials across branches.
                        </p>
                        <Button className="mt-3 bg-accent hover:bg-accent-dark text-accent-foreground">
                          Connect Repository
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Domains Tab */}
                  <TabsContent value="domains" className="space-y-4 mt-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Analyze Domain Differences</h4>
                        <p className="text-sm text-slate-300 mt-1">
                          Once connected, we'll detect and compare all HTTP endpoints, webhooks, and API URLs between branches.
                        </p>
                        <Button className="mt-3 bg-accent hover:bg-accent-dark text-accent-foreground" disabled>
                          Analyze Domains
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Workflows Tab */}
                  <TabsContent value="workflows" className="space-y-4 mt-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
                      <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-white text-sm">Visualize Call Chains</h4>
                        <p className="text-sm text-slate-300 mt-1">
                          We'll analyze workflow-to-workflow calls and show you how they differ between staging and production.
                        </p>
                        <Button className="mt-3 bg-accent hover:bg-accent-dark text-accent-foreground" disabled>
                          View Call Chains
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center text-sm text-slate-400">
          <p>Wingm8n FlowBridge • Intelligent N8N Workflow Merging • v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
