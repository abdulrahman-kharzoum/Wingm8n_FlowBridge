import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, FileCode } from 'lucide-react';
import type { MetadataDiff } from '@shared/types/workflow.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

import { Button } from '@/components/ui/button'; // Ensure Button is imported

interface MetadataComparisonProps {
  metadata: { filename: string; diffs: MetadataDiff[] }[];
  onMetadataSelected?: (filename: string, key: string, source: 'staging' | 'main' | null) => void;
  onBulkMetadataSelected?: (updates: Record<string, 'staging' | 'main'>) => void;
  mergeDecisions?: Record<string, 'staging' | 'main'>;
}

export default function MetadataComparison({ metadata, onMetadataSelected, onBulkMetadataSelected, mergeDecisions = {} }: MetadataComparisonProps) {
  const [selections, setSelections] = useState<Record<string, 'staging' | 'main'>>({});

  // Initialize selections from parent mergeDecisions
  useEffect(() => {
    setSelections(mergeDecisions);
  }, [mergeDecisions]);

  const handleSelection = (filename: string, key: string, source: 'staging' | 'main') => {
    const uniqueKey = `${filename}-${key}`;
    
    setSelections((prev) => {
        if (prev[uniqueKey] === source) {
            const newState = { ...prev };
            delete newState[uniqueKey];
            onMetadataSelected?.(filename, key, null);
            return newState;
        }

        const newState = {
            ...prev,
            [uniqueKey]: source,
        };
        onMetadataSelected?.(filename, key, source);
        return newState;
    });
  };

  const selectAllMain = () => {
      const updates: Record<string, 'main'> = {};
      metadata.forEach(fileMeta => {
          fileMeta.diffs.forEach(diff => {
              const uniqueKey = `${fileMeta.filename}-${diff.key}`;
              updates[uniqueKey] = 'main';
          });
      });
      
      onBulkMetadataSelected?.(updates);
  };

  if (metadata.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="w-5 h-5 text-accent" />
                Workflow Metadata Changes
              </CardTitle>
              <CardDescription>
                Changes to workflow identity, versioning, and settings
              </CardDescription>
            </div>
            {onBulkMetadataSelected && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllMain}
                    className="border-slate-600 hover:bg-slate-700 text-slate-200"
                >
                    Select All Main
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
            {metadata.map((fileMeta, idx) => (
                <div key={idx} className="mb-6 last:mb-0">
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                        <FileCode className="w-4 h-4" />
                        <span className="font-mono">{fileMeta.filename}</span>
                    </div>
                    <div className="rounded-lg border border-slate-700 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-900/80">
                                <TableRow className="border-slate-700">
                                    <TableHead className="w-[15%] text-slate-300">Property</TableHead>
                                    <TableHead className="w-[35%] text-slate-300">Main Branch (Base)</TableHead>
                                    <TableHead className="w-[35%] text-slate-300">Staging Branch (Head)</TableHead>
                                    <TableHead className="w-[15%] text-slate-300">Selection</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fileMeta.diffs.map((diff, i) => {
                                    const uniqueKey = `${fileMeta.filename}-${diff.key}`;
                                    const selection = selections[uniqueKey];
                                     
                                    return (
                                    <TableRow key={i} className="border-slate-700 hover:bg-slate-800/30">
                                        <TableCell className="font-medium text-slate-200">{diff.key}</TableCell>
                                         
                                        {/* Main Value */}
                                        <TableCell>
                                            <div 
                                                className={`p-2 rounded font-mono text-xs transition-colors cursor-pointer border ${selection === 'main' ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' : 'bg-red-900/10 border-transparent text-red-300/80 hover:bg-slate-700/50'}`}
                                                onClick={() => handleSelection(fileMeta.filename, diff.key, 'main')}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Checkbox 
                                                        checked={selection === 'main'}
                                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 h-3 w-3"
                                                    />
                                                    <span className="text-[10px] uppercase font-semibold text-slate-500">Main</span>
                                                </div>
                                                {typeof diff.mainValue === 'object' 
                                                    ? JSON.stringify(diff.mainValue) 
                                                    : String(diff.mainValue ?? 'undefined')}
                                            </div>
                                        </TableCell>

                                        {/* Staging Value */}
                                        <TableCell>
                                            <div 
                                                className={`p-2 rounded font-mono text-xs transition-colors cursor-pointer border ${selection === 'staging' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-emerald-900/10 border-transparent text-emerald-300/80 hover:bg-slate-700/50'}`}
                                                onClick={() => handleSelection(fileMeta.filename, diff.key, 'staging')}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Checkbox 
                                                        checked={selection === 'staging'}
                                                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 h-3 w-3"
                                                    />
                                                    <span className="text-[10px] uppercase font-semibold text-slate-500">Staging</span>
                                                </div>
                                                {typeof diff.stagingValue === 'object' 
                                                    ? JSON.stringify(diff.stagingValue) 
                                                    : String(diff.stagingValue ?? 'undefined')}
                                            </div>
                                        </TableCell>

                                        {/* Selection Indicator */}
                                        <TableCell>
                                            {selection ? (
                                                <Badge variant="outline" className={`${selection === 'main' ? 'border-blue-500/50 text-blue-400' : 'border-amber-500/50 text-amber-400'}`}>
                                                    Keep {selection === 'main' ? 'Main' : 'Staging'}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No change selected</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}