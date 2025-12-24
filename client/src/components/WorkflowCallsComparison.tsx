import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Workflow,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { WorkflowCallDiff, WorkflowCall } from '@shared/types/workflow.types';

interface WorkflowCallsComparisonProps {
  workflowCalls: WorkflowCallDiff;
  onCallSelected?: (call: WorkflowCall, action: 'add' | 'remove' | 'keep') => void;
}

export default function WorkflowCallsComparison({
  workflowCalls,
  onCallSelected,
}: WorkflowCallsComparisonProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, 'add' | 'remove' | 'keep'>>({});

  const filteredAdded = workflowCalls.differences.added.filter(
    (call) =>
      call.sourceWorkflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.targetWorkflow.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRemoved = workflowCalls.differences.removed.filter(
    (call) =>
      call.sourceWorkflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.targetWorkflow.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModified = workflowCalls.differences.modified.filter(
    (mod) =>
      mod.staging.sourceWorkflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.staging.targetWorkflow.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelection = (call: WorkflowCall, action: 'add' | 'remove' | 'keep') => {
    const key = `${call.sourceWorkflow}-${call.targetWorkflow}`;
    setSelections((prev) => ({
      ...prev,
      [key]: action,
    }));
    onCallSelected?.(call, action);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">
                {workflowCalls.stagingChains.length}
              </div>
              <p className="text-xs text-slate-400 mt-1">Staging Workflows</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {workflowCalls.mainChains.length}
              </div>
              <p className="text-xs text-slate-400 mt-1">Main Workflows</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">
                {workflowCalls.differences.added.length +
                  workflowCalls.differences.removed.length +
                  workflowCalls.differences.modified.length}
              </div>
              <p className="text-xs text-slate-400 mt-1">Changes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Workflow className="w-5 h-5 text-accent" />
            Workflow Call Chains
          </CardTitle>
          <CardDescription>
            Review and select workflow-to-workflow call changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search workflow names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-500"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="changes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700/30 border border-slate-600/30">
              <TabsTrigger value="changes" className="text-xs">
                Changes (
                {workflowCalls.differences.added.length +
                  workflowCalls.differences.removed.length +
                  workflowCalls.differences.modified.length}
                )
              </TabsTrigger>
              <TabsTrigger value="added" className="text-xs">
                Added ({filteredAdded.length})
              </TabsTrigger>
              <TabsTrigger value="removed" className="text-xs">
                Removed ({filteredRemoved.length})
              </TabsTrigger>
            </TabsList>

            {/* All Changes */}
            <TabsContent value="changes" className="space-y-2 mt-4">
              {filteredAdded.length === 0 &&
              filteredRemoved.length === 0 &&
              filteredModified.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No workflow call changes</p>
                </div>
              ) : (
                <>
                  {filteredAdded.map((call) => (
                    <WorkflowCallCard
                      key={`${call.sourceWorkflow}-${call.targetWorkflow}`}
                      call={call}
                      type="added"
                      isExpanded={expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`}
                      onToggle={() =>
                        setExpandedCall(
                          expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`
                            ? null
                            : `${call.sourceWorkflow}-${call.targetWorkflow}`
                        )
                      }
                      onSelection={handleSelection}
                      selectedAction={
                        selections[`${call.sourceWorkflow}-${call.targetWorkflow}`]
                      }
                    />
                  ))}

                  {filteredRemoved.map((call) => (
                    <WorkflowCallCard
                      key={`${call.sourceWorkflow}-${call.targetWorkflow}`}
                      call={call}
                      type="removed"
                      isExpanded={expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`}
                      onToggle={() =>
                        setExpandedCall(
                          expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`
                            ? null
                            : `${call.sourceWorkflow}-${call.targetWorkflow}`
                        )
                      }
                      onSelection={handleSelection}
                      selectedAction={
                        selections[`${call.sourceWorkflow}-${call.targetWorkflow}`]
                      }
                    />
                  ))}

                  {filteredModified.map((mod) => (
                    <WorkflowCallCard
                      key={`${mod.staging.sourceWorkflow}-${mod.staging.targetWorkflow}`}
                      call={mod.staging}
                      type="modified"
                      isExpanded={
                        expandedCall ===
                        `${mod.staging.sourceWorkflow}-${mod.staging.targetWorkflow}`
                      }
                      onToggle={() =>
                        setExpandedCall(
                          expandedCall ===
                            `${mod.staging.sourceWorkflow}-${mod.staging.targetWorkflow}`
                            ? null
                            : `${mod.staging.sourceWorkflow}-${mod.staging.targetWorkflow}`
                        )
                      }
                      onSelection={handleSelection}
                      selectedAction={
                        selections[
                          `${mod.staging.sourceWorkflow}-${mod.staging.targetWorkflow}`
                        ]
                      }
                      modifiedVersion={mod.main}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            {/* Added */}
            <TabsContent value="added" className="space-y-2 mt-4">
              {filteredAdded.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No added workflow calls</p>
                </div>
              ) : (
                filteredAdded.map((call) => (
                  <WorkflowCallCard
                    key={`${call.sourceWorkflow}-${call.targetWorkflow}`}
                    call={call}
                    type="added"
                    isExpanded={expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`}
                    onToggle={() =>
                      setExpandedCall(
                        expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`
                          ? null
                          : `${call.sourceWorkflow}-${call.targetWorkflow}`
                      )
                    }
                    onSelection={handleSelection}
                    selectedAction={
                      selections[`${call.sourceWorkflow}-${call.targetWorkflow}`]
                    }
                  />
                ))
              )}
            </TabsContent>

            {/* Removed */}
            <TabsContent value="removed" className="space-y-2 mt-4">
              {filteredRemoved.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No removed workflow calls</p>
                </div>
              ) : (
                filteredRemoved.map((call) => (
                  <WorkflowCallCard
                    key={`${call.sourceWorkflow}-${call.targetWorkflow}`}
                    call={call}
                    type="removed"
                    isExpanded={expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`}
                    onToggle={() =>
                      setExpandedCall(
                        expandedCall === `${call.sourceWorkflow}-${call.targetWorkflow}`
                          ? null
                          : `${call.sourceWorkflow}-${call.targetWorkflow}`
                      )
                    }
                    onSelection={handleSelection}
                    selectedAction={
                      selections[`${call.sourceWorkflow}-${call.targetWorkflow}`]
                    }
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface WorkflowCallCardProps {
  call: WorkflowCall;
  type: 'added' | 'removed' | 'modified';
  isExpanded: boolean;
  onToggle: () => void;
  onSelection: (call: WorkflowCall, action: 'add' | 'remove' | 'keep') => void;
  selectedAction?: 'add' | 'remove' | 'keep';
  modifiedVersion?: WorkflowCall;
}

function WorkflowCallCard({
  call,
  type,
  isExpanded,
  onToggle,
  onSelection,
  selectedAction,
  modifiedVersion,
}: WorkflowCallCardProps) {
  const getTypeColor = (t: string) => {
    switch (t) {
      case 'added':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'removed':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'modified':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'added':
        return <Plus className="w-4 h-4" />;
      case 'removed':
        return <Minus className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <Badge className={getTypeColor(type)}>
            {getTypeIcon(type)}
            <span className="ml-1 capitalize">{type}</span>
          </Badge>
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-white">{call.sourceWorkflow}</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-white">{call.targetWorkflow}</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/50 space-y-3">
          {/* Call Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase">Details</h4>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                <span className="font-semibold">Node ID:</span>
                <div className="font-mono text-slate-300 mt-1">{call.nodeId}</div>
              </div>
              <div>
                <span className="font-semibold">Node Name:</span>
                <div className="text-slate-300 mt-1">{call.nodeName}</div>
              </div>
            </div>
          </div>

          {/* Modified Version */}
          {modifiedVersion && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <h4 className="text-xs font-semibold text-slate-300 uppercase">Modified Version</h4>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{modifiedVersion.sourceWorkflow}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-white">{modifiedVersion.targetWorkflow}</span>
                </div>
              </div>
            </div>
          )}

          {/* Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <h4 className="text-xs font-semibold text-slate-300 uppercase">Action</h4>
            <div className="grid grid-cols-2 gap-2">
              {type === 'added' ? (
                <>
                  <Button
                    size="sm"
                    variant={selectedAction === 'add' ? 'default' : 'outline'}
                    onClick={() => onSelection(call, 'add')}
                    className="text-xs"
                  >
                    {selectedAction === 'add' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Keep
                      </>
                    ) : (
                      'Keep'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedAction === 'remove' ? 'default' : 'outline'}
                    onClick={() => onSelection(call, 'remove')}
                    className="text-xs"
                  >
                    {selectedAction === 'remove' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Remove
                      </>
                    ) : (
                      'Remove'
                    )}
                  </Button>
                </>
              ) : type === 'removed' ? (
                <>
                  <Button
                    size="sm"
                    variant={selectedAction === 'add' ? 'default' : 'outline'}
                    onClick={() => onSelection(call, 'add')}
                    className="text-xs"
                  >
                    {selectedAction === 'add' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Restore
                      </>
                    ) : (
                      'Restore'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedAction === 'remove' ? 'default' : 'outline'}
                    onClick={() => onSelection(call, 'remove')}
                    className="text-xs"
                  >
                    {selectedAction === 'remove' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Keep Removed
                      </>
                    ) : (
                      'Keep Removed'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant={selectedAction === 'keep' ? 'default' : 'outline'}
                  onClick={() => onSelection(call, 'keep')}
                  className="col-span-2 text-xs"
                >
                  {selectedAction === 'keep' ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Keep Modified
                    </>
                  ) : (
                    'Keep Modified'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
