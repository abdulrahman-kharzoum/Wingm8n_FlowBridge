import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Search,
  CheckCircle,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CredentialDiff } from '@shared/types/workflow.types';

interface CredentialsComparisonProps {
  credentials: CredentialDiff[];
  onCredentialSelected?: (credentialId: string, source: 'staging' | 'main' | 'keep-both') => void;
}

export default function CredentialsComparison({
  credentials,
  onCredentialSelected,
}: CredentialsComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, 'staging' | 'main' | 'keep-both'>>({});

  const filteredCredentials = credentials.filter(
    (cred) =>
      cred.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stagingOnlyCount = credentials.filter((c) => c.stagingOnly).length;
  const mainOnlyCount = credentials.filter((c) => c.mainOnly).length;
  const sharedCount = credentials.filter((c) => c.inStaging && c.inMain).length;

  const handleSelection = (credentialId: string, source: 'staging' | 'main' | 'keep-both') => {
    setSelections((prev) => ({
      ...prev,
      [credentialId]: source,
    }));
    onCredentialSelected?.(credentialId, source);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{sharedCount}</div>
              <p className="text-xs text-slate-400 mt-1">Shared Credentials</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{stagingOnlyCount}</div>
              <p className="text-xs text-slate-400 mt-1">Staging Only</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{mainOnlyCount}</div>
              <p className="text-xs text-slate-400 mt-1">Main Only</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="w-5 h-5 text-accent" />
            Credentials Analysis
          </CardTitle>
          <CardDescription>
            Review and select which credentials to include in the merge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search credentials by ID, name, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-700/30 border border-slate-600/30">
              <TabsTrigger value="all" className="text-xs">
                All ({filteredCredentials.length})
              </TabsTrigger>
              <TabsTrigger value="shared" className="text-xs">
                Shared ({filteredCredentials.filter((c) => c.inStaging && c.inMain).length})
              </TabsTrigger>
              <TabsTrigger value="staging" className="text-xs">
                Staging ({filteredCredentials.filter((c) => c.stagingOnly).length})
              </TabsTrigger>
              <TabsTrigger value="main" className="text-xs">
                Main ({filteredCredentials.filter((c) => c.mainOnly).length})
              </TabsTrigger>
            </TabsList>

            {/* All Credentials */}
            <TabsContent value="all" className="space-y-2 mt-4">
              {filteredCredentials.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No credentials found</p>
                </div>
              ) : (
                filteredCredentials.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isExpanded={expandedId === cred.id}
                    onToggle={() => setExpandedId(expandedId === cred.id ? null : cred.id)}
                    onSelection={handleSelection}
                    selectedSource={selections[cred.id]}
                    onCopy={copyToClipboard}
                  />
                ))
              )}
            </TabsContent>

            {/* Shared Credentials */}
            <TabsContent value="shared" className="space-y-2 mt-4">
              {filteredCredentials
                .filter((c) => c.inStaging && c.inMain)
                .map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isExpanded={expandedId === cred.id}
                    onToggle={() => setExpandedId(expandedId === cred.id ? null : cred.id)}
                    onSelection={handleSelection}
                    selectedSource={selections[cred.id]}
                    onCopy={copyToClipboard}
                  />
                ))}
            </TabsContent>

            {/* Staging Only */}
            <TabsContent value="staging" className="space-y-2 mt-4">
              {filteredCredentials
                .filter((c) => c.stagingOnly)
                .map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isExpanded={expandedId === cred.id}
                    onToggle={() => setExpandedId(expandedId === cred.id ? null : cred.id)}
                    onSelection={handleSelection}
                    selectedSource={selections[cred.id]}
                    onCopy={copyToClipboard}
                  />
                ))}
            </TabsContent>

            {/* Main Only */}
            <TabsContent value="main" className="space-y-2 mt-4">
              {filteredCredentials
                .filter((c) => c.mainOnly)
                .map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isExpanded={expandedId === cred.id}
                    onToggle={() => setExpandedId(expandedId === cred.id ? null : cred.id)}
                    onSelection={handleSelection}
                    selectedSource={selections[cred.id]}
                    onCopy={copyToClipboard}
                  />
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface CredentialCardProps {
  credential: CredentialDiff;
  isExpanded: boolean;
  onToggle: () => void;
  onSelection: (credentialId: string, source: 'staging' | 'main' | 'keep-both') => void;
  selectedSource?: 'staging' | 'main' | 'keep-both';
  onCopy: (text: string) => void;
}

function CredentialCard({
  credential,
  isExpanded,
  onToggle,
  onSelection,
  selectedSource,
  onCopy,
}: CredentialCardProps) {
  return (
    <div className="border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className="flex-shrink-0">
            {credential.stagingOnly ? (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Staging</Badge>
            ) : credential.mainOnly ? (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Main</Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                Both
              </Badge>
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white text-sm">{credential.name}</div>
            <div className="text-xs text-slate-400 font-mono">{credential.id}</div>
          </div>
          <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
            {credential.type}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/50 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {credential.inStaging && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-xs font-semibold text-amber-400 mb-2">In Staging</div>
                <Button
                  size="sm"
                  variant={selectedSource === 'staging' ? 'default' : 'outline'}
                  onClick={() => onSelection(credential.id, 'staging')}
                  className="w-full text-xs"
                >
                  {selectedSource === 'staging' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Selected
                    </>
                  ) : (
                    'Select'
                  )}
                </Button>
              </div>
            )}

            {credential.inMain && (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-xs font-semibold text-blue-400 mb-2">In Main</div>
                <Button
                  size="sm"
                  variant={selectedSource === 'main' ? 'default' : 'outline'}
                  onClick={() => onSelection(credential.id, 'main')}
                  className="w-full text-xs"
                >
                  {selectedSource === 'main' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Selected
                    </>
                  ) : (
                    'Select'
                  )}
                </Button>
              </div>
            )}
          </div>

          {credential.inStaging && credential.inMain && (
            <Button
              size="sm"
              variant={selectedSource === 'keep-both' ? 'default' : 'outline'}
              onClick={() => onSelection(credential.id, 'keep-both')}
              className="w-full text-xs"
            >
              {selectedSource === 'keep-both' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Keep Both
                </>
              ) : (
                'Keep Both'
              )}
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCopy(credential.id)}
            className="w-full text-xs text-slate-400 hover:text-slate-300"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy ID
          </Button>
        </div>
      )}
    </div>
  );
}
