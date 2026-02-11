import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Key,
  Search,
  AlertCircle,
  Copy,
  FileCode,
  Files,
  Box,
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { CredentialDiff } from '@shared/types/workflow.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CredentialsComparisonProps {
  credentials: CredentialDiff[];
  onCredentialSelected?: (credentialId: string, source: 'staging' | 'main' | 'keep-both' | string | null) => void;
  mergeDecisions?: Record<string, 'staging' | 'main' | 'keep-both' | string>;
}

export default function CredentialsComparison({
  credentials,
  onCredentialSelected,
  mergeDecisions = {},
}: CredentialsComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selections, setSelections] = useState<Record<string, 'staging' | 'main' | 'keep-both' | string>>({});

  // Initialize selections from parent mergeDecisions
  useEffect(() => {
    setSelections(mergeDecisions);
  }, [mergeDecisions]);

  const filteredCredentials = credentials.filter((cred) => {
    return (
      cred.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSelection = (credentialId: string, value: string) => {
    // Update local state
    setSelections((prev) => ({
      ...prev,
      [credentialId]: value,
    }));
    // Propagate change
    onCredentialSelected?.(credentialId, value);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-accent" />
                Credentials Analysis
              </CardTitle>
              <CardDescription>
                Compare credentials between branches and select the version to keep
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search credentials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCredentials.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No credentials found</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="border-slate-700 hover:bg-slate-900/80">
                    <TableHead className="w-[35%] text-slate-300 font-semibold">
                      Main Branch (Base)
                    </TableHead>
                    <TableHead className="w-[35%] text-slate-300 font-semibold">
                      Staging Branch (Head)
                    </TableHead>
                    <TableHead className="w-[30%] text-slate-300 font-semibold">
                      Result Selection
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.map((cred) => (
                    <TableRow key={cred.id} className="border-slate-700 hover:bg-slate-800/30">
                      {/* Main Column */}
                      <TableCell className="align-top py-4">
                        {cred.inMain ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                <Key className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <div className="font-medium text-white">{cred.mainName || cred.name}</div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">{cred.mainId || cred.id}</div>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                    {/* Show type from Main if possible, otherwise generic type */}
                                    {cred.mainType || cred.type}
                                  </Badge>
                                  {cred.mainNodeAuthType && (
                                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-none">
                                      {cred.mainNodeAuthType}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Files Display */}
                            {cred.files && cred.files.length > 0 && (
                              <div className="pl-11">
                                {cred.files.length === 1 ? (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <FileCode className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">{cred.files[0]}</span>
                                  </div>
                                ) : (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors w-fit">
                                        <Files className="w-3 h-3 flex-shrink-0" />
                                        <span>Found in {cred.files.length} workflows</span>
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80 bg-slate-900 border-slate-700">
                                      <div className="space-y-2">
                                        <div className="text-xs font-semibold text-slate-400 uppercase">Affected Workflows</div>
                                        <div className="text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                                          {cred.files.map((file, idx) => (
                                            <div key={idx} className="flex items-start gap-2 break-all">
                                              <FileCode className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
                                              {file}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">
                            Not present in Main
                          </div>
                        )}
                      </TableCell>

                      {/* Staging Column */}
                      <TableCell className="align-top py-4 border-l border-slate-700/50">
                        {cred.inStaging ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                <Key className="w-4 h-4 text-amber-400" />
                              </div>
                              <div>
                                <div className="font-medium text-white">{cred.stagingName || cred.name}</div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">{cred.stagingId || cred.id}</div>
                                <div className="flex gap-2 mt-2">
                                  <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                    {cred.stagingType || cred.type}
                                  </Badge>
                                  {cred.stagingNodeAuthType && (
                                    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-400 border-none">
                                      {cred.stagingNodeAuthType}
                                    </Badge>
                                  )}
                                  {!cred.inMain && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/50 text-[10px]">
                                      New
                                    </Badge>
                                  )}
                                  {cred.inMain && cred.stagingNodeAuthType !== cred.mainNodeAuthType && (
                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-[10px]">
                                      Auth Changed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Files Display */}
                            {cred.files && cred.files.length > 0 && (
                              <div className="pl-11">
                                {cred.files.length === 1 ? (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <FileCode className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">{cred.files[0]}</span>
                                  </div>
                                ) : (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors w-fit">
                                        <Files className="w-3 h-3 flex-shrink-0" />
                                        <span>Found in {cred.files.length} workflows</span>
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80 bg-slate-900 border-slate-700">
                                      <div className="space-y-2">
                                        <div className="text-xs font-semibold text-slate-400 uppercase">Affected Workflows</div>
                                        <div className="text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                                          {cred.files.map((file, idx) => (
                                            <div key={idx} className="flex items-start gap-2 break-all">
                                              <FileCode className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
                                              {file}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">
                            Not present in Staging
                          </div>
                        )}
                      </TableCell>

                      {/* Results Column */}
                      <TableCell className="align-top py-4 border-l border-slate-700/50 bg-slate-900/30">
                        <div className="space-y-3">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Credential</div>
                              <Select
                                value={selections[cred.id] || ''}
                                onValueChange={(value) => handleSelection(cred.id, value)}
                              >
                                <SelectTrigger className="w-full bg-slate-800 border-slate-600 text-slate-200">
                                  <SelectValue placeholder="Choose credential..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                  {cred.inStaging && (
                                    <SelectItem value="staging" className="focus:bg-slate-700 focus:text-white">
                                      <span className="flex items-center gap-2">
                                        <span className="truncate max-w-[200px]">{cred.stagingName || cred.name}</span>
                                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Staging</Badge>
                                        {!cred.inMain && <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-none">New</Badge>}
                                      </span>
                                    </SelectItem>
                                  )}
                                  {cred.inMain && (
                                    <SelectItem value="main" className="focus:bg-slate-700 focus:text-white">
                                      <span className="flex items-center gap-2">
                                        <span className="truncate max-w-[200px]">{cred.mainName || cred.name}</span>
                                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Main</Badge>
                                      </span>
                                    </SelectItem>
                                  )}
                                  {/* Alternatives with node usage info */}
                                  {cred.alternatives && cred.alternatives.length > 0 && (
                                    <>
                                      <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Existing Options</div>
                                      {cred.alternatives.map(alt => (
                                        <SelectItem key={alt.id} value={alt.id} className="focus:bg-slate-700 focus:text-white">
                                          <span className="flex items-center gap-2">
                                            <span className="truncate max-w-[200px]">{alt.name}</span>
                                            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">Main (Unchanged)</Badge>
                                          </span>
                                        </SelectItem>
                                      ))}
                                      {/* Show node usage info in a tooltip */}
                                      <HoverCard>
                                        <HoverCardTrigger asChild>
                                          <div className="px-2 py-1 text-xs text-slate-500 cursor-help hover:text-slate-300 flex items-center gap-1">
                                            <Box className="w-3 h-3" />
                                            <span>Where these credentials are used</span>
                                          </div>
                                        </HoverCardTrigger>
                                        <HoverCardContent className="w-80 bg-slate-900 border-slate-700">
                                          <div className="space-y-2">
                                            <div className="text-xs font-semibold text-slate-400 uppercase">Credential Usage</div>
                                            {cred.alternatives.map(alt => (
                                              <div key={alt.id} className="space-y-1">
                                                <div className="text-xs text-white font-medium">{alt.name}</div>
                                                {alt.usedByNodes && alt.usedByNodes.length > 0 ? (
                                                  <div className="text-xs text-slate-300 space-y-1 max-h-32 overflow-y-auto">
                                                    {alt.usedByNodes.map((node, idx) => (
                                                      <div key={idx} className="flex items-start gap-2">
                                                        <Box className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
                                                        <div>
                                                          <div className="text-slate-400">{node.nodeName}</div>
                                                          <div className="text-slate-500 text-[10px]">{node.nodeType}</div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="text-xs text-slate-500 italic">No node usage data</div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </HoverCardContent>
                                      </HoverCard>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Result ID Display */}
                            {selections[cred.id] && (
                              <div className="pt-2 border-t border-slate-700/50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Final Result ID</div>
                                <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                                  <code className="text-xs font-mono text-white flex-1 truncate">
                                    {
                                      selections[cred.id] === 'staging' ? (cred.stagingId || cred.id) :
                                        selections[cred.id] === 'main' ? (cred.mainId || cred.id) :
                                          selections[cred.id] // It's an explicit ID
                                    }
                                  </code>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-slate-500 hover:text-white"
                                    onClick={() => copyToClipboard(
                                      selections[cred.id] === 'staging' ? (cred.stagingId || cred.id) :
                                        selections[cred.id] === 'main' ? (cred.mainId || cred.id) :
                                          selections[cred.id]
                                    )}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
