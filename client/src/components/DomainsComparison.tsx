import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Globe,
  Search,
  AlertCircle,
  Copy,
  ExternalLink,
  FileCode,
} from 'lucide-react';
import type { DomainDiff } from '@shared/types/workflow.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DomainsComparisonProps {
  domains: (DomainDiff & { filename?: string })[];
  onDomainSelected?: (url: string, selectedUrl: string | null) => void;
  mergeDecisions?: Record<string, { selected: 'staging' | 'main'; url: string }>;
}

export default function DomainsComparison({ domains, onDomainSelected, mergeDecisions = {} }: DomainsComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Initialize selections from parent mergeDecisions
  useEffect(() => {
    const initial: Record<string, string> = {};
    Object.entries(mergeDecisions).forEach(([url, decision]) => {
      if (decision && decision.url) {
        initial[url] = decision.url;
      }
    });
    setSelections(initial);
  }, [mergeDecisions]);

  // Filter out non-http/https URLs and apply search
  const filteredDomains = domains.filter((domain) => {
    // Allow non-empty URLs (including Webhooks)
    const isValid = (url?: string) => url && url.length > 0;
    
    // Check if at least one version is valid
    const relevant = isValid(domain.url) || isValid(domain.stagingUrl) || isValid(domain.mainUrl);
    
    if (!relevant) return false;

    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    return (
      domain.url.toLowerCase().includes(searchLower) ||
      domain.stagingUrl?.toLowerCase().includes(searchLower) ||
      domain.mainUrl?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelection = (url: string, selectedUrl: string) => {
    setSelections((prev) => {
       if (prev[url] === selectedUrl) {
            const newState = { ...prev };
            delete newState[url];
            onDomainSelected?.(url, null);
            return newState;
        }

        const newState = {
            ...prev,
            [url]: selectedUrl,
        };
        onDomainSelected?.(url, selectedUrl);
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
                <Globe className="w-5 h-5 text-accent" />
                Domains & URLs Analysis
              </CardTitle>
              <CardDescription>
                Compare external HTTP/HTTPS endpoints between branches
              </CardDescription>
            </div>
             <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDomains.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No HTTP/HTTPS domains found</p>
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
                  {filteredDomains.map((domain) => (
                    <TableRow key={domain.url} className="border-slate-700 hover:bg-slate-800/30">
                      {/* Main Column */}
                      <TableCell className="align-top py-4">
                         {domain.mainUrl ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-mono text-xs text-white break-all bg-slate-900/50 p-2 rounded border border-slate-600/50">
                                        {domain.mainUrl}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                         <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                            {domain.mainUrl?.match(/^(GET|POST|PUT|DELETE|PATCH)\s/) ? domain.mainUrl.split(' ')[0] : 'GET'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            {domain.filename && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-11">
                                    <FileCode className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">{domain.filename}</span>
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
                         {domain.stagingUrl ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                                    <Globe className="w-4 h-4 text-amber-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-mono text-xs text-white break-all bg-slate-900/50 p-2 rounded border border-slate-600/50">
                                        {domain.stagingUrl}
                                    </div>
                                     <div className="flex gap-2 mt-2">
                                         <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                                            {domain.stagingUrl?.match(/^(GET|POST|PUT|DELETE|PATCH)\s/) ? domain.stagingUrl.split(' ')[0] : 'GET'}
                                        </Badge>
                                        {!domain.mainUrl && (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/50 text-[10px]">
                                                New
                                            </Badge>
                                        )}
                                        {domain.mainUrl && domain.mainUrl !== domain.stagingUrl && (
                                             <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 border-amber-500/50 text-[10px]">
                                                Changed
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {domain.filename && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 pl-11">
                                    <FileCode className="w-3 h-3 flex-shrink-0" />
                                    <span className="break-all">{domain.filename}</span>
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
                                    {domain.mainUrl && (
                                        <div className={`flex items-center space-x-2 p-2 rounded border ${selections[domain.url] === domain.mainUrl ? 'bg-blue-500/10 border-blue-500/50' : 'border-transparent hover:bg-slate-800/50'}`}>
                                            <Checkbox
                                                id={`main-${domain.url}`}
                                                checked={selections[domain.url] === domain.mainUrl}
                                                onCheckedChange={() => handleSelection(domain.url, domain.mainUrl!)}
                                                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                            />
                                            <label
                                                htmlFor={`main-${domain.url}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-200"
                                            >
                                                Main Branch
                                            </label>
                                        </div>
                                    )}
                                     
                                    {domain.stagingUrl && (
                                        <div className={`flex items-center space-x-2 p-2 rounded border ${selections[domain.url] === domain.stagingUrl ? 'bg-amber-500/10 border-amber-500/50' : 'border-transparent hover:bg-slate-800/50'}`}>
                                            <Checkbox
                                                id={`staging-${domain.url}`}
                                                checked={selections[domain.url] === domain.stagingUrl}
                                                onCheckedChange={() => handleSelection(domain.url, domain.stagingUrl!)}
                                                className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                            />
                                            <label
                                                htmlFor={`staging-${domain.url}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-slate-200"
                                            >
                                                Staging Branch
                                                {(!domain.mainUrl) && <Badge className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 border-none">New</Badge>}
                                                 {domain.mainUrl && domain.mainUrl !== domain.stagingUrl && <Badge className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 border-none">Changed</Badge>}
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Result Display */}
                                {selections[domain.url] && (
                                    <div className="pt-2 border-t border-slate-700/50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Final Result URL</div>
                                        <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                                            <code className="text-xs font-mono text-white flex-1 truncate break-all">
                                                {selections[domain.url]}
                                            </code>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-slate-500 hover:text-white flex-shrink-0"
                                                onClick={() => copyToClipboard(selections[domain.url])}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-slate-500 hover:text-white flex-shrink-0"
                                                asChild
                                            >
                                                <a href={selections[domain.url]} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
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
