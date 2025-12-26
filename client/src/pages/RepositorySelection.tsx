import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useRepository } from '@/contexts/RepositoryContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Github,
  Search,
  Lock,
  Globe,
  Star,
  Code2,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';

type RepositoryType = 'all' | 'personal' | 'organization' | 'collaborative';

export default function RepositorySelection() {
  const [, navigate] = useLocation();
  const { setSelectedRepository } = useRepository();
  const [searchTerm, setSearchTerm] = useState('');
  const [repoType, setRepoType] = useState<RepositoryType>('all');
  const [page, setPage] = useState(1);

  // Default to fetching all accessible repos
  const { data: reposData, isLoading, error } = trpc.github.listRepositories.useQuery(
    {
      page,
      perPage: 100, // Fetch more to allow client-side filtering if needed, or pagination
      affiliation: 'owner,collaborator,organization_member',
    },
    {
      enabled: true,
    }
  );

  // Filter repositories based on search term
  const filteredRepositories = useMemo(() => {
    if (!reposData?.repositories) return [];
    return reposData.repositories.filter((repo: any) => {
      const matchesSearch =
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      if (!matchesSearch) return false;

      if (repoType === 'all') return true;
      return repo.repoType === repoType;
    });
  }, [reposData?.repositories, searchTerm, repoType]);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'organization': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'collaborative': return 'bg-teal-100 text-teal-700 border-teal-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSelectRepository = async (repo: any) => {
    // Set the selected repository
    setSelectedRepository({
      repo,
      stagingBranch: 'staging',
      mainBranch: 'main',
    });

    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-accent hover:bg-slate-800"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-white">Select Repository</h1>
              <p className="text-xs text-slate-400">Choose a repository to analyze</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Search and filter section */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              placeholder="Search repositories by name or description..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          <Tabs value={repoType} onValueChange={(value) => {
            setRepoType(value as RepositoryType);
            setPage(1);
          }}>
            <TabsList className="bg-slate-700/30 border border-slate-600/30">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="organization" className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                Organization
              </TabsTrigger>
              <TabsTrigger value="collaborative" className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                Collaborative
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Error state */}
        {error && (
          <Card className="bg-red-900/20 border-red-700/50 mb-8">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-200">Failed to load repositories</h3>
                <p className="text-sm text-red-300 mt-1">
                  {error instanceof Error ? error.message : 'An error occurred while fetching repositories'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
              <p className="text-slate-400">Loading repositories...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredRepositories.length === 0 && (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="pt-12 pb-12 text-center">
              <Github className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No repositories found</h3>
              <p className="text-slate-400">
                {searchTerm ? 'Try adjusting your search terms' : 'You don\'t have any repositories yet'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Repositories grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepositories.map((repo) => (
            <Card
              key={repo.id}
              className="bg-slate-800/50 border-slate-700/50 hover:border-accent/50 transition-all cursor-pointer group"
              onClick={() => handleSelectRepository(repo)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Github className="w-4 h-4 text-accent flex-shrink-0" />
                      <h3 className="font-semibold text-white truncate group-hover:text-accent transition-colors">
                        {repo.name}
                      </h3>
                    </div>
                    {(repo as any).repoType && (
                       <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getBadgeColor((repo as any).repoType)}`}>
                        {(repo as any).repoType}
                      </span>
                    )}
                    <p className="text-xs text-slate-400 truncate">{repo.full_name}</p>
                  </div>
                  {repo.private ? (
                    <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {repo.description && (
                  <p className="text-sm text-slate-300 line-clamp-2">{repo.description}</p>
                )}

                <div className="flex items-center gap-4 pt-2 border-t border-slate-700/50">
                  {repo.language && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Code2 className="w-3 h-3" />
                      {repo.language}
                    </div>
                  )}
                  {repo.stargazers_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Star className="w-3 h-3" />
                      {repo.stargazers_count}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full mt-2 bg-accent hover:bg-accent-dark text-accent-foreground flex items-center justify-center gap-2 group-hover:gap-3 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectRepository(repo);
                  }}
                >
                  Select
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        {reposData && reposData.total > reposData.perPage && (
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-700/50">
            <p className="text-sm text-slate-400">
              Showing {(page - 1) * reposData.perPage + 1} to{' '}
              {Math.min(page * reposData.perPage, reposData.total)} of {reposData.total} repositories
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page * reposData.perPage >= reposData.total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
