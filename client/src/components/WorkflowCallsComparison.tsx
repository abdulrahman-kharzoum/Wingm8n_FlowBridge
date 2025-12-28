import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Workflow,
  ArrowRight,
  GitGraph,
  RefreshCw,
  Wand2,
  PlusCircle,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WorkflowCallDiff, WorkflowCall } from '@shared/types/workflow.types';
import { Loader2 } from 'lucide-react';

export type WorkflowCallDecision = 'add' | 'remove' | 'keep' | { action: 'map'; targetId: string; targetName?: string };

interface WorkflowCallsComparisonProps {
  workflowCalls: (WorkflowCall & { filename?: string })[]; 
  onCallSelected?: (call: WorkflowCall, decision: WorkflowCallDecision) => void;
  onBulkCallSelected?: (updates: Record<string, WorkflowCallDecision>) => void;
  mergeDecisions?: Record<string, WorkflowCallDecision>;
  
  // Suggestion Props
  onGenerateSuggestions?: () => void;
  isGeneratingSuggestions?: boolean;
  suggestions?: Record<string, { status: 'mapped' | 'missing'; targetId?: string; targetName?: string }>;
  onCreateWorkflow?: (call: WorkflowCall) => void;
  isCreatingWorkflow?: string | null; // ID of workflow being created
  availableWorkflows?: Array<{ id: string; name: string }>; // For manual mapping dropdown
}

const ChainNode = ({ name, id, type = 'default' }: { name: string; id?: string; type?: 'default' | 'source' | 'target' | 'new' }) => {
    let bgClass = "bg-slate-800 border-slate-700 text-slate-200";
    if (type === 'source') bgClass = "bg-blue-500/10 border-blue-500/30 text-blue-300";
    if (type === 'target') bgClass = "bg-purple-500/10 border-purple-500/30 text-purple-300";
    if (type === 'new') bgClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";

    return (
        <div className={`px-3 py-1.5 rounded-md border text-xs font-mono font-medium shadow-sm flex flex-col gap-0.5 ${bgClass}`}>
            <div className="flex items-center gap-2">
                <Workflow className="w-3 h-3 opacity-50" />
                <span>{name}</span>
            </div>
            {id && <span className="text-[10px] opacity-60 pl-5 break-all">{id}</span>}
        </div>
    );
};

const ChainArrow = () => (
    <div className="text-slate-600 flex items-center justify-center px-1">
        <ArrowRight className="w-4 h-4" />
    </div>
);

export default function WorkflowCallsComparison({
  workflowCalls,
  onCallSelected,
  onBulkCallSelected,
  mergeDecisions = {},
  onGenerateSuggestions,
  isGeneratingSuggestions,
  suggestions,
  onCreateWorkflow,
  isCreatingWorkflow,
  availableWorkflows = []
}: WorkflowCallsComparisonProps) {
    const relationships = useMemo(() => {
        const groups: Record<string, typeof workflowCalls> = {};
        workflowCalls.forEach(call => {
            if (!groups[call.sourceWorkflow]) {
                groups[call.sourceWorkflow] = [];
            }
            groups[call.sourceWorkflow].push(call);
        });
        return groups;
    }, [workflowCalls]);

    const [activeCalls, setActiveCalls] = useState<Set<string>>(new Set());

    useEffect(() => {
        const initial = new Set<string>();
        Object.keys(mergeDecisions).forEach(key => {
            const decision = mergeDecisions[key];
            if (decision === 'add' || (typeof decision === 'object' && decision.action === 'map')) {
                initial.add(key);
            }
        });
        setActiveCalls(initial);
    }, [mergeDecisions]);

    const toggleCall = (call: WorkflowCall) => {
        const key = `${call.sourceWorkflow}->${call.targetWorkflow}`;
        const newSet = new Set(activeCalls);
        
        // If unchecking
        if (newSet.has(key)) {
            newSet.delete(key);
            onCallSelected?.(call, 'remove');
        } else {
            // If checking
            newSet.add(key);
            
            // Check if we have a suggestion or existing mapping for this call
            const suggestion = suggestions?.[call.targetWorkflow];
            if (suggestion?.status === 'mapped' && suggestion.targetId) {
                // Apply mapping automatically if available
                onCallSelected?.(call, { 
                    action: 'map', 
                    targetId: suggestion.targetId, 
                    targetName: suggestion.targetName 
                });
            } else {
                // Default to 'add' (keep existing ID)
                 onCallSelected?.(call, 'add');
            }
        }
        setActiveCalls(newSet);
    };
    
    const handleManualMappingChange = (call: WorkflowCall, targetId: string) => {
         const targetWf = availableWorkflows.find(w => w.id === targetId);
         if (targetWf) {
             onCallSelected?.(call, {
                 action: 'map',
                 targetId: targetWf.id,
                 targetName: targetWf.name
             });
         }
    };

    const selectAll = () => {
        const newSet = new Set(activeCalls);
        const updates: Record<string, WorkflowCallDecision> = {};
        
        workflowCalls.forEach(call => {
             const key = `${call.sourceWorkflow}->${call.targetWorkflow}`;
             if (!newSet.has(key)) {
                 newSet.add(key);
                 
                 // Apply suggestion if present
                 const suggestion = suggestions?.[call.targetWorkflow];
                 if (suggestion?.status === 'mapped' && suggestion.targetId) {
                     updates[key] = { 
                        action: 'map', 
                        targetId: suggestion.targetId, 
                        targetName: suggestion.targetName 
                    };
                 } else {
                     updates[key] = 'add';
                 }
             }
        });
        
        setActiveCalls(newSet);
        if (Object.keys(updates).length > 0) {
            onBulkCallSelected?.(updates);
        }
    };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GitGraph className="w-5 h-5 text-accent" />
                    Workflow Call Graph
                  </CardTitle>
                  <CardDescription>
                    Visualize and manage workflow execution chains
                  </CardDescription>
                </div>
                {onGenerateSuggestions && (
                    <Button 
                        onClick={onGenerateSuggestions} 
                        disabled={isGeneratingSuggestions}
                        className="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20"
                    >
                        {isGeneratingSuggestions ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Wand2 className="w-4 h-4 mr-2" />
                        )}
                        Suggest Graph
                    </Button>
                )}
            </div>
        </CardHeader>
        <CardContent>
            {Object.keys(relationships).length === 0 ? (
                 <div className="text-center py-12 text-slate-400">
                    <Workflow className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No workflow calls detected</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                     {/* Column 1: Main Graph (Base) */}
                     <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">Main Branch</Badge>
                            <span className="text-xs text-slate-500">Current Flow</span>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(relationships).map(([source, calls]) => {
                                const mainCalls = calls.filter((c: any) => c.inMain);
                                if (mainCalls.length === 0) return null;
                                return (
                                    <div key={`main-${source}`} className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/50">
                                        <div className="flex items-center flex-wrap gap-2">
                                            <ChainNode name={source} type="source" />
                                            {mainCalls.map((call, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <ChainArrow />
                                                    <ChainNode name={call.targetWorkflowName || call.targetWorkflow} id={call.targetWorkflow} type="target" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      </div>

                      {/* Column 2: Staging Graph (Head) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                             <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">Staging Branch</Badge>
                             <span className="text-xs text-slate-500">Proposed Flow</span>
                        </div>
                        <div className="space-y-4">
                            {Object.entries(relationships).map(([source, calls]) => {
                                const stagingCalls = calls.filter((c: any) => c.inStaging);
                                if (stagingCalls.length === 0) return null;
                                return (
                                    <div key={`staging-${source}`} className="p-4 rounded-lg bg-slate-900/30 border border-slate-700/50 relative">
                                        {!calls.some((c: any) => c.inMain) && (
                                            <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px]">New Chain</Badge>
                                        )}
                                        <div className="flex items-center flex-wrap gap-2">
                                            <ChainNode name={source} type="source" />
                                            {stagingCalls.map((call, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <ChainArrow />
                                                    <ChainNode
                                                        name={call.targetWorkflowName || call.targetWorkflow}
                                                        id={call.targetWorkflow}
                                                        type={calls.find((c: any) => c.targetWorkflow === call.targetWorkflow && c.inMain) ? 'target' : 'new'}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                      </div>

                      {/* Column 3: Result Builder */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                             <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Result</Badge>
                                <span className="text-xs text-slate-500">Final Graph</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] text-slate-400 hover:text-white"
                                    onClick={selectAll}
                                >
                                    Select All
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
                                    <RefreshCw className="w-3 h-3" />
                                </Button>
                             </div>
                        </div>
                         
                        <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 min-h-[300px]">
                            <p className="text-xs text-slate-500 mb-4 text-center">
                                Map staging calls to production workflows.
                            </p>
                             
                             {Object.entries(relationships).map(([source, calls]) => (
                                <div key={`result-${source}`} className="p-3 rounded-lg border border-slate-700 bg-slate-800/80">
                                    <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <Workflow className="w-4 h-4 text-accent" />
                                        {source} triggers:
                                    </div>
                                    <div className="space-y-2 pl-4 border-l-2 border-slate-700 ml-2">
                                        {/* Show triggers only available in Staging (exclude ones that are Main only) */}
                                        {Array.from(new Set(calls.filter((c: any) => c.inStaging).map(c => c.targetWorkflow))).map(target => {
                                            const callObj = calls.find(c => c.targetWorkflow === target);
                                            if (!callObj) return null;
                                             
                                            const key = `${source}->${target}`;
                                            // Assume active by default, or check if explicitly removed? 
                                            // For now, we assume user wants to Map everything.
                                            const decision = mergeDecisions?.[key];
                                            
                                            // Determine current mapping state
                                            const isMappedDecision = typeof decision === 'object' && decision.action === 'map';
                                            let currentMappingId = target;
                                            
                                            if (isMappedDecision) {
                                                currentMappingId = decision.targetId;
                                            } else {
                                                // If no decision yet, check if we have a suggestion
                                                const suggestion = suggestions?.[target];
                                                if (suggestion?.status === 'mapped' && suggestion.targetId) {
                                                     currentMappingId = suggestion.targetId;
                                                     // If not already in decision, we might want to trigger update? 
                                                     // But render-time derivation is safer for display.
                                                }
                                            }
                                            
                                            const suggestion = suggestions?.[target];
                                            const isMissing = suggestion?.status === 'missing';
                                            const inMain = calls.some((c: any) => c.targetWorkflow === target && c.inMain);
                                            const inStaging = calls.some((c: any) => c.targetWorkflow === target && c.inStaging);

                                            return (
                                                <div
                                                    key={target}
                                                    className="group flex flex-col p-3 rounded transition-all gap-3 bg-slate-800 border border-slate-700 hover:border-slate-600"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-white">
                                                                    {callObj.targetWorkflowName || target}
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    {inMain && <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Main</Badge>}
                                                                    {inStaging && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Staging</Badge>}
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">{target}</span>
                                                        </div>
                                                    </div>

                                                    {/* Mapping Controls - Always Visible */}
                                                    <div className="flex items-center gap-2 w-full">
                                                        <LinkIcon className={`w-3 h-3 flex-shrink-0 ${isMissing ? 'text-red-400' : 'text-slate-400'}`} />
                                                        <div className="flex-1">
                                                            <Select 
                                                                value={currentMappingId} 
                                                                onValueChange={(val) => handleManualMappingChange(callObj, val)}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 w-full">
                                                                    <SelectValue placeholder="Select target workflow..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-slate-800 border-slate-700 text-white max-h-[300px]">
                                                                    {isMissing && <SelectItem value={target} disabled>Missing: {suggestion?.targetName || 'Unknown'}</SelectItem>}
                                                                    {availableWorkflows.map(w => (
                                                                        <SelectItem key={w.id} value={w.id}>
                                                                            <span className="flex flex-col text-left">
                                                                                <span>{w.name}</span>
                                                                                <span className="text-[10px] text-slate-500 font-mono">{w.id}</span>
                                                                            </span>
                                                                        </SelectItem>
                                                                    ))}
                                                                    {/* Include current ID if not in list */}
                                                                    {!availableWorkflows.some(w => w.id === target) && (
                                                                        <SelectItem value={target}>{callObj.targetWorkflowName || target} (Current)</SelectItem>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        
                                                        {isMissing && onCreateWorkflow && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="h-8 text-xs border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 whitespace-nowrap"
                                                                onClick={() => onCreateWorkflow(callObj)}
                                                                disabled={isCreatingWorkflow === callObj.targetWorkflow}
                                                            >
                                                                {isCreatingWorkflow === callObj.targetWorkflow ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <PlusCircle className="w-3 h-3 mr-1" />
                                                                        Create
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                    
                                                    {isMissing && !isCreatingWorkflow && (
                                                        <div className="text-[10px] text-red-400 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Workflow not found in Production. Link manually or create structure.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                             ))}
                        </div>
                      </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
