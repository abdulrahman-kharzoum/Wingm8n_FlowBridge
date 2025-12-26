import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Key,
  Search,
  AlertCircle,
  Copy,
  FileCode,
} from 'lucide-react';
import type { CredentialDiff } from '@shared/types/workflow.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CredentialsComparisonProps {
  credentials: (CredentialDiff & { filename?: string })[];
  onCredentialSelected?: (credentialId: string, source: 'staging' | 'main' | 'keep-both' | null) => void;
}

export default function CredentialsComparison({
  credentials,
  onCredentialSelected,
}: CredentialsComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selections, setSelections] = useState<Record<string, 'staging' | 'main' | 'keep-both'>>({});

  const filteredCredentials = credentials.filter((cred) => {
    return (
      cred.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSelection = (credentialId: string, source: 'staging' | 'main' | 'keep-both') => {
    setSelections((prev) => {
      // If unchecking the currently selected one
      if (prev[credentialId] === source) {
        const newState = { ...prev };
        delete newState[credentialId];
        onCredentialSelected?.(credentialId, null);
        return newState;
      }

      const newState = {
        ...prev,
        [credentialId]: source,
      };
      onCredentialSelected?.(credentialId, source);
      return newState;
    });
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
                                    <Badge variant="outline" className="mt-2 text-[10px] border-slate-600 text-slate-400">
                                        {/* Show type from Main if possible, otherwise generic type */}
                                        {cred.mainType || cred.type}
                                    </Badge>
                                </div>
                            </div>
                            {cred.filename && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-11">
                                    <FileCode className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">{cred.filename}</span>
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
                                        {!cred.inMain && (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/50 text-[10px]">
                                                New
                                            </Badge>
                                        )}
                                     </div>
                                </div>
                            </div>
                             {cred.filename && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-11">
                                    <FileCode className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">{cred.filename}</span>
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
                                     <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Source Selection</div>
                                     {cred.inMain && (
                                        <div className={`flex items-center space-x-2 p-2 rounded border ${selections[cred.id] === 'main' ? 'bg-blue-500/10 border-blue-500/50' : 'border-transparent hover:bg-slate-800/50'}`}>
                                            <Checkbox
                                                id={`main-${cred.id}`}
                                                checked={selections[cred.id] === 'main'}
                                                onCheckedChange={() => handleSelection(cred.id, 'main')}
                                                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                            />
                                            <label
                                                htmlFor={`main-${cred.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-200"
                                            >
                                                Main Branch
                                            </label>
                                        </div>
                                     )}
                                     
                                     {cred.inStaging && (
                                        <div className={`flex items-center space-x-2 p-2 rounded border ${selections[cred.id] === 'staging' ? 'bg-amber-500/10 border-amber-500/50' : 'border-transparent hover:bg-slate-800/50'}`}>
                                            <Checkbox
                                                id={`staging-${cred.id}`}
                                                checked={selections[cred.id] === 'staging'}
                                                onCheckedChange={() => handleSelection(cred.id, 'staging')}
                                                className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                            />
                                            <label
                                                htmlFor={`staging-${cred.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-200"
                                            >
                                                Staging Branch
                                                {(!cred.inMain) && <Badge className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 border-none">New</Badge>}
                                            </label>
                                        </div>
                                     )}
                                </div>

                                {/* Result ID Display */}
                               {selections[cred.id] && (
                                   <div className="pt-2 border-t border-slate-700/50 animate-in fade-in zoom-in-95 duration-200">
                                       <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Final Result ID</div>
                                       <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                                           <code className="text-xs font-mono text-white flex-1 truncate">
                                               {selections[cred.id] === 'staging' ? (cred.stagingId || cred.id) : (cred.mainId || cred.id)}
                                           </code>
                                           <Button
                                               size="icon"
                                               variant="ghost"
                                               className="h-6 w-6 text-slate-500 hover:text-white"
                                               onClick={() => copyToClipboard(selections[cred.id] === 'staging' ? (cred.stagingId || cred.id) : (cred.mainId || cred.id))}
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
