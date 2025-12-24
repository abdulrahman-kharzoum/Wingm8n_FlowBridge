import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe,
  Search,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DomainDiff } from '@shared/types/workflow.types';

interface DomainsComparisonProps {
  domains: DomainDiff[];
  onDomainSelected?: (url: string, selectedUrl: string) => void;
}

export default function DomainsComparison({ domains, onDomainSelected }: DomainsComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});

  const filteredDomains = domains.filter(
    (domain) =>
      domain.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      domain.stagingUrl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      domain.mainUrl?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const changedCount = domains.filter((d) => d.isDifferent).length;
  const unchangedCount = domains.filter((d) => !d.isDifferent).length;

  const handleSelection = (url: string, selectedUrl: string) => {
    setSelections((prev) => ({
      ...prev,
      [url]: selectedUrl,
    }));
    onDomainSelected?.(url, selectedUrl);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return url.startsWith('/') || url.startsWith('http');
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">{unchangedCount}</div>
              <p className="text-xs text-slate-400 mt-1">Unchanged URLs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{changedCount}</div>
              <p className="text-xs text-slate-400 mt-1">Changed URLs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5 text-accent" />
            Domains & URLs Analysis
          </CardTitle>
          <CardDescription>
            Review and select which URLs to include in the merge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search URLs, domains, or endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
            />
          </div>

          {/* Domains List */}
          <div className="space-y-2">
            {filteredDomains.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No domains found</p>
              </div>
            ) : (
              filteredDomains.map((domain) => (
                <DomainCard
                  key={domain.url}
                  domain={domain}
                  isExpanded={expandedUrl === domain.url}
                  onToggle={() => setExpandedUrl(expandedUrl === domain.url ? null : domain.url)}
                  onSelection={handleSelection}
                  selectedUrl={selections[domain.url]}
                  onCopy={copyToClipboard}
                  isValidUrl={isValidUrl}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DomainCardProps {
  domain: DomainDiff;
  isExpanded: boolean;
  onToggle: () => void;
  onSelection: (url: string, selectedUrl: string) => void;
  selectedUrl?: string;
  onCopy: (text: string) => void;
  isValidUrl: (url: string) => boolean;
}

function DomainCard({
  domain,
  isExpanded,
  onToggle,
  onSelection,
  selectedUrl,
  onCopy,
  isValidUrl,
}: DomainCardProps) {
  const getUrlStatus = (url?: string) => {
    if (!url) return 'missing';
    if (url.startsWith('http')) return 'external';
    if (url.startsWith('/')) return 'relative';
    return 'webhook';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'external':
        return 'text-blue-400';
      case 'relative':
        return 'text-purple-400';
      case 'webhook':
        return 'text-pink-400';
      default:
        return 'text-slate-400';
    }
  };

  const stagingStatus = getUrlStatus(domain.stagingUrl);
  const mainStatus = getUrlStatus(domain.mainUrl);

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left min-w-0">
          <div className="flex-shrink-0">
            {domain.isDifferent ? (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">Changed</Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                Unchanged
              </Badge>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm text-white truncate">{domain.url}</div>
            {domain.isDifferent && domain.stagingUrl && domain.mainUrl && (
              <div className="text-xs text-slate-400 mt-1">
                <span className="text-amber-400">Staging:</span> {domain.stagingUrl.substring(0, 40)}
                {domain.stagingUrl.length > 40 ? '...' : ''}
              </div>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/50 space-y-3">
          {/* URL Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase">URL Details</h4>
            <div className="grid grid-cols-2 gap-3">
              {domain.stagingUrl && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400">Staging</span>
                    <Badge variant="outline" className="text-xs">
                      {stagingStatus}
                    </Badge>
                  </div>
                  <div className="font-mono text-xs text-slate-300 break-all bg-slate-900/50 p-2 rounded border border-slate-600">
                    {domain.stagingUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCopy(domain.stagingUrl!)}
                      className="flex-1 text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    {isValidUrl(domain.stagingUrl) && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="flex-1 text-xs"
                      >
                        <a href={domain.stagingUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {domain.mainUrl && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400">Main</span>
                    <Badge variant="outline" className="text-xs">
                      {mainStatus}
                    </Badge>
                  </div>
                  <div className="font-mono text-xs text-slate-300 break-all bg-slate-900/50 p-2 rounded border border-slate-600">
                    {domain.mainUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCopy(domain.mainUrl!)}
                      className="flex-1 text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    {isValidUrl(domain.mainUrl) && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="flex-1 text-xs"
                      >
                        <a href={domain.mainUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selection */}
          {domain.isDifferent && domain.stagingUrl && domain.mainUrl && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <h4 className="text-xs font-semibold text-slate-300 uppercase">Select Version</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={selectedUrl === domain.stagingUrl ? 'default' : 'outline'}
                  onClick={() => onSelection(domain.url, domain.stagingUrl!)}
                  className="text-xs"
                >
                  {selectedUrl === domain.stagingUrl ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Use Staging
                    </>
                  ) : (
                    'Use Staging'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={selectedUrl === domain.mainUrl ? 'default' : 'outline'}
                  onClick={() => onSelection(domain.url, domain.mainUrl!)}
                  className="text-xs"
                >
                  {selectedUrl === domain.mainUrl ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Use Main
                    </>
                  ) : (
                    'Use Main'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Locations */}
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 uppercase">Locations</h4>
            <div className="space-y-1 text-xs text-slate-400">
              {domain.locations.staging.length > 0 && (
                <div>
                  <span className="text-amber-400 font-semibold">Staging:</span>
                  {domain.locations.staging.map((loc, i) => (
                    <div key={i} className="ml-2 text-slate-500">
                      • {loc.nodeName} ({loc.nodeType})
                    </div>
                  ))}
                </div>
              )}
              {domain.locations.main.length > 0 && (
                <div>
                  <span className="text-blue-400 font-semibold">Main:</span>
                  {domain.locations.main.map((loc, i) => (
                    <div key={i} className="ml-2 text-slate-500">
                      • {loc.nodeName} ({loc.nodeType})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
