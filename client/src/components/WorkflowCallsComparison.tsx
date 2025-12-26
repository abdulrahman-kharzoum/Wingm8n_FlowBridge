import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Workflow,
  ArrowRight,
  GitGraph,
  RefreshCw,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { WorkflowCallDiff, WorkflowCall } from '@shared/types/workflow.types';

interface WorkflowCallsComparisonProps {
  workflowCalls: (WorkflowCall & { filename?: string })[]; // Adapted to receive flat list but we might want to process it into chains if not already
  onCallSelected?: (call: WorkflowCall, action: 'add' | 'remove' | 'keep') => void;
}

// Helper to visualize a simple chain node
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

// Helper to visualize a connection arrow
const ChainArrow = () => (
    <div className="text-slate-600 flex items-center justify-center px-1">
        <ArrowRight className="w-4 h-4" />
    </div>
);

export default function WorkflowCallsComparison({
  workflowCalls,
  onCallSelected,
}: WorkflowCallsComparisonProps) {
    // Process flat calls into a map of relationships for visualization
    // We want to group by Source Workflow to show "Graph" snippets
    const relationships = useMemo(() => {
        const groups: Record<string, typeof workflowCalls> = {};
        workflowCalls.forEach(call => {
            // Filter out unchanged workflow calls (present in both branches)
            // We assume that if it's in both, it's the same call.
            // Check 'inMain' and 'inStaging' properties which are added by the analyzer
            if ((call as any).inMain && (call as any).inStaging) {
                return;
            }

            if (!groups[call.sourceWorkflow]) {
                groups[call.sourceWorkflow] = [];
            }
            groups[call.sourceWorkflow].push(call);
        });
        return groups;
    }, [workflowCalls]);

    // State for the "Result" graph builder (simplified)
    // We allow users to "toggle" active calls for the final merge
    const [activeCalls, setActiveCalls] = useState<Set<string>>(new Set());

    // Initialize with existing calls if needed, or let user build from scratch
    // For now, let's pre-select "Head" (Staging) calls as the default proposal
    useState(() => {
        const initial = new Set<string>();
        workflowCalls.forEach(call => {
            // Assuming we have some way to know if it's staging or main from the flat list mapped in parent
            // But here we receive just the list.
            // Let's assume the parent maps 'inStaging' property (mapped from inHead).
            if ((call as any).inStaging) {
                initial.add(`${call.sourceWorkflow}->${call.targetWorkflow}`);
            }
        });
        setActiveCalls(initial);
    });

    const toggleCall = (call: WorkflowCall) => {
        const key = `${call.sourceWorkflow}->${call.targetWorkflow}`;
        const newSet = new Set(activeCalls);
        if (newSet.has(key)) {
            newSet.delete(key);
            onCallSelected?.(call, 'remove');
        } else {
            newSet.add(key);
            onCallSelected?.(call, 'add');
        }
        setActiveCalls(newSet);
    };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitGraph className="w-5 h-5 text-accent" />
                Workflow Call Graph
              </CardTitle>
              <CardDescription>
                Visualize and manage workflow execution chains
              </CardDescription>
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
                                        {/* Diff Indicator */}
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
                             <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
                                 <RefreshCw className="w-3 h-3" />
                             </Button>
                        </div>
                        
                        <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 min-h-[300px]">
                            <p className="text-xs text-slate-500 mb-4 text-center">
                                Select active connections from Main or Staging to build the final workflow graph.
                            </p>
                            
                             {Object.entries(relationships).map(([source, calls]) => (
                                <div key={`result-${source}`} className="p-3 rounded-lg border border-slate-700 bg-slate-800/80">
                                    <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <Workflow className="w-4 h-4 text-accent" />
                                        {source} triggers:
                                    </div>
                                    <div className="space-y-2 pl-4 border-l-2 border-slate-700 ml-2">
                                        {/* Unique targets from both lists */}
                                        {Array.from(new Set(calls.map(c => c.targetWorkflow))).map(target => {
                                            const callObj = calls.find(c => c.targetWorkflow === target);
                                            if (!callObj) return null;
                                            
                                            const key = `${source}->${target}`;
                                            const isActive = activeCalls.has(key);
                                            const inMain = calls.some((c: any) => c.targetWorkflow === target && c.inMain);
                                            const inStaging = calls.some((c: any) => c.targetWorkflow === target && c.inStaging);

                                            return (
                                                <div
                                                    key={target}
                                                    className={`
                                                        group flex items-center justify-between p-2 rounded transition-all
                                                        ${isActive
                                                            ? 'bg-accent/10 border border-accent/30'
                                                            : 'bg-slate-800 border border-slate-700'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`call-${source}-${target}`}
                                                            checked={isActive}
                                                            onCheckedChange={() => toggleCall(callObj)}
                                                        />
                                                        <div className="flex flex-col">
                                                            <label
                                                                htmlFor={`call-${source}-${target}`}
                                                                className={`text-sm cursor-pointer select-none font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}
                                                            >
                                                                {callObj.targetWorkflowName || target}
                                                            </label>
                                                            <span className="text-[10px] text-slate-500 font-mono">{target}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-1">
                                                        {inMain && <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Main</Badge>}
                                                        {inStaging && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Staging</Badge>}
                                                    </div>
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
