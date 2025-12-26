import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings2, FileCode, Plus, Minus, RefreshCw } from 'lucide-react';
import type { NodeDiff, ParameterDiff } from '@shared/types/workflow.types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NodeChangesComparisonProps {
  nodeChanges: { filename: string; diffs: NodeDiff[] }[];
}

export default function NodeChangesComparison({ nodeChanges }: NodeChangesComparisonProps) {
  if (nodeChanges.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5 text-accent" />
                Node Parameter Changes
              </CardTitle>
              <CardDescription>
                Detailed analysis of changes in node parameters and configurations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {nodeChanges.map((fileNodes, idx) => (
                <div key={idx} className="mb-8 last:mb-0">
                    <div className="flex items-center gap-2 mb-4 text-sm text-slate-400 pb-2 border-b border-slate-700/50">
                        <FileCode className="w-4 h-4" />
                        <span className="font-mono">{fileNodes.filename}</span>
                    </div>
                    
                    <div className="space-y-4">
                        {fileNodes.diffs.map((nodeDiff, i) => (
                            <div key={i} className="bg-slate-900/30 rounded-lg border border-slate-700/50 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-900/50 flex items-center justify-between border-b border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-mono text-[10px] text-slate-400 border-slate-600">
                                            {nodeDiff.nodeType}
                                        </Badge>
                                        <span className="font-medium text-slate-200">{nodeDiff.nodeName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {nodeDiff.changeType === 'added' && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Added</Badge>}
                                        {nodeDiff.changeType === 'removed' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Removed</Badge>}
                                        {nodeDiff.changeType === 'modified' && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Modified</Badge>}
                                    </div>
                                </div>
                                
                                {nodeDiff.parameterChanges && nodeDiff.parameterChanges.length > 0 && (
                                    <div className="p-0">
                                        <Table>
                                            <TableHeader className="bg-slate-950/30">
                                                <TableRow className="border-slate-700/50 text-xs">
                                                    <TableHead className="w-[30%] text-slate-400 h-8">Parameter</TableHead>
                                                    <TableHead className="w-[35%] text-slate-400 h-8">Old Value (Main)</TableHead>
                                                    <TableHead className="w-[35%] text-slate-400 h-8">New Value (Staging)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {nodeDiff.parameterChanges.map((param, pIdx) => (
                                                    <TableRow key={pIdx} className="border-slate-700/30 hover:bg-slate-800/20 text-xs font-mono">
                                                        <TableCell className="text-slate-300 align-top py-2">{param.key}</TableCell>
                                                        <TableCell className="text-red-300/70 align-top py-2 break-all">
                                                            {typeof param.mainValue === 'object' 
                                                                ? JSON.stringify(param.mainValue) 
                                                                : String(param.mainValue ?? '-')}
                                                        </TableCell>
                                                        <TableCell className="text-emerald-300/70 align-top py-2 break-all">
                                                            {typeof param.stagingValue === 'object' 
                                                                ? JSON.stringify(param.stagingValue) 
                                                                : String(param.stagingValue ?? '-')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}