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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  onManualLink?: (call: WorkflowCall, targetId: string, targetName: string) => void;
  onCreateViaWebhook?: (call: WorkflowCall, name: string) => void;
  onCreateAllMissing?: (missingCalls: WorkflowCall[]) => void;
  isCreatingAllMissing?: boolean;
  addedWorkflows?: Array<{ name: string; id?: string; filename: string }>;
  createdWorkflows?: Map<string, string>; // Name -> ID
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
  availableWorkflows = [],
  onManualLink,
  onCreateViaWebhook,
  onCreateAllMissing,
  isCreatingAllMissing,
  addedWorkflows = [],
  createdWorkflows = new Map()
}: WorkflowCallsComparisonProps) {
    const [resolvingCall, setResolvingCall] = useState<WorkflowCall | null>(null);
    const [resolveMode, setResolveMode] = useState<'manual' | 'create'>('create');
    const [manualId, setManualId] = useState('');
    const [manualName, setManualName] = useState('');
    
    // Confirmation Dialog State
    const [isConfirmingCreate, setIsConfirmingCreate] = useState(false);
    const [workflowsToCreate, setWorkflowsToCreate] = useState<Array<{name: string, source: string, originalCall?: WorkflowCall}>>([]);

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

    const missingCalls = useMemo(() => {
        // Find calls that are in Staging
        const missing: WorkflowCall[] = [];
        const seenTargets = new Set<string>();

        workflowCalls.forEach((call: any) => {
            if (call.inStaging) {
                const targetKey = call.targetWorkflow; // Usually ID (or Name if ID not found)
                if (seenTargets.has(targetKey)) return;

                // Determine the expected Production Name
                // If staging name is "staging - X", prod name should be "dev - X"
                let stagingName = call.targetWorkflowName || targetKey;
                let expectedProdName = stagingName;

                if (stagingName.startsWith('staging - ')) {
                    expectedProdName = stagingName.replace('staging - ', 'dev - ');
                } else if (!stagingName.startsWith('dev - ')) {
                    expectedProdName = `dev - ${stagingName}`;
                }

                // Check if exists in Prod (Main)
                const existsInProd = availableWorkflows.some(w => w.name === expectedProdName);
                
                // Check if exists in Created Workflows
                const existsInCreated = createdWorkflows.has(expectedProdName) || createdWorkflows.has(stagingName);

                // Check if exists in Added Workflows (New in PR) - IF NOT ALREADY CREATED
                // We match loosely by name since ID might not be known yet or strictly by Name if available
                const existsInAdded = addedWorkflows.some(w => w.name === expectedProdName || w.name === stagingName);

                // Also check if mapped already
                const isMapped = suggestions?.[targetKey]?.status === 'mapped';

                // If created, it's not missing anymore (we have an ID map for it)
                if (!existsInProd && !existsInCreated && !existsInAdded && !isMapped) {
                    missing.push(call);
                    seenTargets.add(targetKey);
                }
            }
        });
        return missing;
    }, [workflowCalls, availableWorkflows, suggestions, addedWorkflows, createdWorkflows]);

    // Calculate actual missing workflows to CREATE (including those from Added Workflows that aren't in Prod yet)
    // The user wants to see "Create Missing" for workflows that are detected as NEW in this PR (Added Files)
    // AND missing targets from calls that don't match anything.
    // Actually, "Missing" implies they need to be created.
    // Added workflows ARE the source of truth for what needs to be created if they are new files.
    
    // Combines unique missing items from Call Graph + Added Workflows
    const allMissingWorkflowsToCreate = useMemo(() => {
        const toCreate: Array<{ name: string; source: string; originalCall?: WorkflowCall }> = [];
        const seenNames = new Set<string>();
        
        // 1. From Added Workflows (High Confidence)
        addedWorkflows.forEach(w => {
            // Check if already exists in Prod (unlikely if status is added, but possible if name collision)
            // Or if we want to rename it to 'dev - ...' ?
            // User requirement: "get the name of these files from the json inside of them"
            let name = w.name;
            // Apply naming convention if needed? Usually we want to map Staging Name -> Dev Name
             if (name.startsWith('staging - ')) {
                name = name.replace('staging - ', 'dev - ');
            } else if (!name.startsWith('dev - ')) {
                 name = `dev - ${name}`;
            }

            // Exclude if already created or in available workflows
            const existsInCreated = createdWorkflows.has(name);
            const existsInProd = availableWorkflows.some(aw => aw.name === name);

            if (!existsInProd && !existsInCreated) {
                 if (!seenNames.has(name)) {
                     toCreate.push({ name, source: 'New File in PR' });
                     seenNames.add(name);
                 }
            }
        });

        // 2. From Missing Calls (Inferred)
        missingCalls.forEach(call => {
             let name = call.targetWorkflowName || call.targetWorkflow;
             if (name.startsWith('staging - ')) {
                name = name.replace('staging - ', 'dev - ');
            } else if (!name.startsWith('dev - ')) {
                 name = `dev - ${name}`;
            }
            
            const existsInCreated = createdWorkflows.has(name);
            const existsInProd = availableWorkflows.some(aw => aw.name === name);

            if (!seenNames.has(name) && !existsInProd && !existsInCreated) {
                toCreate.push({ name, source: 'Missing Call Target', originalCall: call });
                seenNames.add(name);
            }
        });

        return toCreate;
    }, [addedWorkflows, missingCalls, availableWorkflows, createdWorkflows]);

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
         // Check available workflows first
         const targetWf = availableWorkflows.find(w => w.id === targetId);
         if (targetWf) {
             onCallSelected?.(call, {
                 action: 'map',
                 targetId: targetWf.id,
                 targetName: targetWf.name
             });
             return;
         }
         
         // Check created workflows (reverse lookup by ID)
         // Actually targetId IS the ID.
         // We might not have the name easily if it's not in availableWorkflows map efficiently.
         // But we can iterate createdWorkflows.
         let createdName = '';
         Array.from(createdWorkflows.entries()).forEach(([name, id]) => {
             if (id === targetId) {
                 createdName = name;
             }
         });
         
         if (createdName) {
             onCallSelected?.(call, {
                 action: 'map',
                 targetId: targetId,
                 targetName: createdName
             });
             return;
         }
         
         // Fallback for Added Workflows pseudo-selection
         // If it starts with "pending-", extract name?
         // Or if we allowed selecting "pending-" items, we probably can't MAP them yet?
         // Actually, newly created workflows WILL have an ID in 'createdWorkflows'.
         // "Added Workflows" that are NOT created don't have an ID yet.
         // If user selects them, what happens? "Create" then map?
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
                <div className="flex gap-2">
                    {allMissingWorkflowsToCreate.length > 0 && onCreateAllMissing && (
                        <Button
                            onClick={() => {
                                setWorkflowsToCreate(allMissingWorkflowsToCreate);
                                setIsConfirmingCreate(true);
                            }}
                            disabled={isCreatingAllMissing}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        >
                             {isCreatingAllMissing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <PlusCircle className="w-4 h-4 mr-2" />
                            )}
                            Create {allMissingWorkflowsToCreate.length} Missing
                        </Button>
                    )}
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
                             
                             {Object.entries(relationships).map(([source, calls]) => {
                                 const targets = Array.from(new Set(calls.filter((c: any) => c.inStaging).map(c => c.targetWorkflow)));
                                 if (targets.length === 0) return null;

                                 return (
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
                                            
                                            // Determine Target Name for suggestion logic display
                                            let targetDisplayName = callObj.targetWorkflowName || target;

                                            // Determine if created
                                            let createdId: string | undefined;
                                            if (createdWorkflows.has(targetDisplayName)) {
                                                createdId = createdWorkflows.get(targetDisplayName);
                                            } else if (createdWorkflows.has(target)) {
                                                createdId = createdWorkflows.get(target);
                                            } else {
                                                // Try normalized
                                                let normName = targetDisplayName;
                                                 if (normName.startsWith('staging - ')) {
                                                    normName = normName.replace('staging - ', 'dev - ');
                                                } else if (!normName.startsWith('dev - ')) {
                                                     normName = `dev - ${normName}`;
                                                }
                                                if (createdWorkflows.has(normName)) {
                                                    createdId = createdWorkflows.get(normName);
                                                }
                                            }

                                            if (isMappedDecision) {
                                                currentMappingId = decision.targetId;
                                            } else {
                                                // If no decision yet, check if we have a suggestion or it was just Created
                                                const suggestion = suggestions?.[target];
                                                if (suggestion?.status === 'mapped' && suggestion.targetId) {
                                                     currentMappingId = suggestion.targetId || target;
                                                 } else if (createdId) {
                                                     currentMappingId = createdId;
                                                 }
                                            }
                                            
                                            const suggestion = suggestions?.[target];
                                            const isMissing = suggestion?.status === 'missing' && !createdId;
                                            const inMain = calls.some((c: any) => c.targetWorkflow === target && c.inMain);
                                            const inStaging = calls.some((c: any) => c.targetWorkflow === target && c.inStaging);

                                            // Ensure controlled component by never passing undefined
                                            const selectValue = currentMappingId || '';

                                            return (
                                                <div
                                                    key={target}
                                                    className="group flex flex-col p-3 rounded transition-all gap-3 bg-slate-800 border border-slate-700 hover:border-slate-600"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-white">
                                                                    {targetDisplayName}
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    {inMain && <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">Main</Badge>}
                                                                    {inStaging && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Staging</Badge>}
                                                                    {createdId && <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Created</Badge>}
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
                                                                value={selectValue} 
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
                                                                    {/* Include Created Workflows */}
                                                                    {Array.from(createdWorkflows.entries()).map(([name, id]) => (
                                                                        <SelectItem key={id} value={id}>
                                                                             <span className="flex flex-col text-left">
                                                                                <span className="flex items-center gap-2">
                                                                                    {name}
                                                                                    <Badge variant="outline" className="text-[8px] h-3 px-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Created</Badge>
                                                                                </span>
                                                                                <span className="text-[10px] text-slate-500 font-mono">{id}</span>
                                                                            </span>
                                                                        </SelectItem>
                                                                    ))}
                                                                    
                                                                    {/* Include Added Workflows as options - Only if NOT created yet */}
                                                                    {addedWorkflows.map((w, idx) => {
                                                                         let devName = w.name;
                                                                         if (devName.startsWith('staging - ')) {
                                                                            devName = devName.replace('staging - ', 'dev - ');
                                                                        } else if (!devName.startsWith('dev - ')) {
                                                                             devName = `dev - ${devName}`;
                                                                        }
                                                                         
                                                                         // If already created, don't show as "New in PR"
                                                                         if (createdWorkflows.has(devName) || createdWorkflows.has(w.name)) return null;

                                                                         const val = w.id || `pending-${w.name}`;
                                                                         if (availableWorkflows.some(aw => aw.id === val)) return null;

                                                                         return (
                                                                             <SelectItem key={`added-${idx}`} value={val}>
                                                                                <span className="flex flex-col text-left">
                                                                                    <span className="flex items-center gap-2">
                                                                                        {w.name}
                                                                                        <Badge variant="outline" className="text-[8px] h-3 px-1 border-emerald-500/30 text-emerald-400">New in PR</Badge>
                                                                                    </span>
                                                                                    <span className="text-[10px] text-slate-500 font-mono">{w.filename}</span>
                                                                                </span>
                                                                            </SelectItem>
                                                                         );
                                                                    })}
                                                                    {/* Include current ID if not in list */}
                                                                    {!availableWorkflows.some(w => w.id === target) && !createdId && (
                                                                        <SelectItem value={target}>{callObj.targetWorkflowName || target} (Current)</SelectItem>
                                                                    )}
                                                                    {/* Include selected mapped ID if different from target and not in list */}
                                                                    {selectValue && selectValue !== target && !availableWorkflows.some(w => w.id === selectValue) && !createdId && (
                                                                        <SelectItem value={selectValue}>
                                                                            {(typeof decision === 'object' ? decision.targetName : null) || suggestion?.targetName || selectValue} (Mapped)
                                                                        </SelectItem>
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
                                                    
                                                    {isMissing && !isCreatingWorkflow && !isMappedDecision && (
                                                        <div className="text-[10px] text-red-500 flex flex-col gap-1 mt-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                                                            <div className="flex items-center gap-1 font-medium">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Workflow not found in Production
                                                            </div>
                                                            <div className="pl-4 flex gap-3">
                                                                 <button 
                                                                    className="underline hover:text-red-300 cursor-pointer"
                                                                    onClick={() => {
                                                                        setResolvingCall(callObj);
                                                                        // Pre-fill name if available
                                                                        setManualName(callObj.targetWorkflowName || ''); 
                                                                        setManualId(''); 
                                                                        setResolveMode('manual');
                                                                    }}
                                                                 >
                                                                    Link manually
                                                                 </button>
                                                                 <button 
                                                                    className="underline hover:text-red-300 cursor-pointer"
                                                                    onClick={() => {
                                                                        setResolvingCall(callObj);
                                                                        // Suggest dev name
                                                                        let suggestedName = callObj.targetWorkflowName || '';
                                                                        if (suggestedName.startsWith('staging - ')) {
                                                                            suggestedName = suggestedName.replace('staging - ', 'dev - ');
                                                                        } else {
                                                                            suggestedName = `dev - ${suggestedName}`;
                                                                        }
                                                                        setManualName(suggestedName);
                                                                        setResolveMode('create');
                                                                    }}
                                                                 >
                                                                    create structure (Webhook)
                                                                 </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                );
                             })}
                        </div>
                      </div>
                </div>
            )}
        </CardContent>
      </Card>
      <Dialog open={!!resolvingCall} onOpenChange={(open) => !open && setResolvingCall(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
                <DialogTitle>Resolve Missing Workflow</DialogTitle>
                <DialogDescription className="text-slate-400">
                    {resolveMode === 'manual' ? 'Manually link to an existing production workflow.' : 'Create a new workflow structure in production via Webhook.'}
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
                <Tabs value={resolveMode} onValueChange={(v) => setResolveMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="manual">Link Manually</TabsTrigger>
                        <TabsTrigger value="create">Create via Webhook</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="manual" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Workflow Name</Label>
                            <Input 
                                value={manualName} 
                                onChange={(e) => setManualName(e.target.value)} 
                                className="bg-slate-800 border-slate-600"
                                placeholder="e.g. My Workflow" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Workflow ID</Label>
                            <Input 
                                value={manualId} 
                                onChange={(e) => setManualId(e.target.value)} 
                                className="bg-slate-800 border-slate-600 font-mono"
                                placeholder="e.g. Qc392pmwG6SSFBKF" 
                            />
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="create" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>New Workflow Name</Label>
                            <Input 
                                value={manualName} 
                                onChange={(e) => setManualName(e.target.value)} 
                                className="bg-slate-800 border-slate-600"
                                placeholder="e.g. dev - My Workflow" 
                            />
                            <p className="text-xs text-slate-500">
                                This will create a basic workflow structure using the configured N8N Webhook.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setResolvingCall(null)} className="border-slate-600 text-slate-300">
                    Cancel
                </Button>
                {resolveMode === 'manual' ? (
                     <Button 
                        onClick={() => {
                            if (resolvingCall && manualId && manualName) {
                                onManualLink?.(resolvingCall, manualId, manualName);
                                setResolvingCall(null);
                            }
                        }}
                        disabled={!manualId || !manualName}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Link Workflow
                    </Button>
                ) : (
                    <Button 
                        onClick={() => {
                            if (resolvingCall && manualName) {
                                onCreateViaWebhook?.(resolvingCall, manualName);
                                setResolvingCall(null);
                            }
                        }}
                        disabled={!manualName}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Create Workflow
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Bulk Create */}
      <Dialog open={isConfirmingCreate} onOpenChange={setIsConfirmingCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
            <DialogHeader>
                <DialogTitle>Create Missing Workflows</DialogTitle>
                <DialogDescription className="text-slate-400">
                    The following {workflowsToCreate.length} workflows will be created in Production.
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                {workflowsToCreate.map((wf, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded bg-slate-800 border border-slate-700">
                        <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm text-white">{wf.name}</span>
                            <span className="text-[10px] text-slate-500">{wf.source}</span>
                        </div>
                        {wf.source === 'New File in PR' ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Added File</Badge>
                        ) : (
                             <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">Call Graph</Badge>
                        )}
                    </div>
                ))}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmingCreate(false)} className="border-slate-600 text-slate-300">
                    Cancel
                </Button>
                <Button 
                    onClick={() => {
                        // Extract just the calls or names needed for the handler
                        // The original handler expects missingCalls (calls)
                        // But we might be creating from Added Files which don't have a call object.
                        // We need to adapt the handler or pass a mixed list?
                        
                        // Current page handler: handleBulkCreateMissingWorkflows(missingCalls: any[])
                        // It iterates and calls createWorkflowViaWebhookMutation
                        
                        // We can construct dummy "calls" for the Added Files so the handler works, 
                        // or better, pass the list of items to create directly if we update the handler interface.
                        
                        // For now, let's map back to the expected format.
                        // The handler uses: call.targetWorkflowName || call.targetWorkflow
                        
                        const payload = workflowsToCreate.map(w => ({
                            targetWorkflowName: w.name,
                            targetWorkflow: w.name, // Temporary ID
                            // If it was from a real call, include it?
                            ...w.originalCall
                        }));
                        
                        onCreateAllMissing?.(payload as any);
                        setIsConfirmingCreate(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                >
                    Confirm & Create
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
