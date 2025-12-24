import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Globe,
  Workflow,
  CheckCircle,
  AlertCircle,
  GitMerge,
  Loader2,
} from 'lucide-react';
import type { MergeDecision } from '@shared/types/workflow.types';

interface MergeDecisionSummaryProps {
  decisions: MergeDecision;
  credentialCount: number;
  domainCount: number;
  workflowCallCount: number;
  isLoading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function MergeDecisionSummary({
  decisions,
  credentialCount,
  domainCount,
  workflowCallCount,
  isLoading = false,
  onConfirm,
  onCancel,
}: MergeDecisionSummaryProps) {
  const credentialDecisions = Object.entries(decisions.credentials);
  const domainDecisions = Object.entries(decisions.domains);
  const workflowCallDecisions = Object.entries(decisions.workflowCalls);

  const credentialsMade = credentialDecisions.length;
  const domainsMade = domainDecisions.length;
  const workflowCallsMade = workflowCallDecisions.length;

  const credentialsRemaining = credentialCount - credentialsMade;
  const domainsRemaining = domainCount - domainsMade;
  const workflowCallsRemaining = workflowCallCount - workflowCallsMade;

  const allDecisionsMade =
    credentialsRemaining === 0 && domainsRemaining === 0 && workflowCallsRemaining === 0;

  return (
    <div className="space-y-4">
      {/* Warning if not all decisions made */}
      {!allDecisionsMade && (
        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have not made decisions for all items. Remaining items will use default values.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Credentials */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-accent" />
              Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Decisions Made:</span>
                <span className="font-semibold text-white">{credentialsMade}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Remaining:</span>
                <span className="font-semibold text-amber-400">{credentialsRemaining}</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mt-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{
                    width: `${credentialCount > 0 ? (credentialsMade / credentialCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domains */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-accent" />
              Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Decisions Made:</span>
                <span className="font-semibold text-white">{domainsMade}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Remaining:</span>
                <span className="font-semibold text-amber-400">{domainsRemaining}</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mt-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{
                    width: `${domainCount > 0 ? (domainsMade / domainCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Calls */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Workflow className="w-4 h-4 text-accent" />
              Workflow Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Decisions Made:</span>
                <span className="font-semibold text-white">{workflowCallsMade}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Remaining:</span>
                <span className="font-semibold text-amber-400">{workflowCallsRemaining}</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 mt-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all"
                  style={{
                    width: `${workflowCallCount > 0 ? (workflowCallsMade / workflowCallCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Decisions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">Decision Details</CardTitle>
          <CardDescription>Review your merge decisions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credentials Decisions */}
          {credentialDecisions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-accent" />
                Credentials ({credentialDecisions.length})
              </h3>
              <div className="space-y-1 ml-6">
                {credentialDecisions.slice(0, 3).map(([credId, decision]) => (
                  <div key={credId} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-mono truncate">{credId}</span>
                    <Badge
                      variant="outline"
                      className={
                        decision === 'staging'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                          : decision === 'main'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      }
                    >
                      {decision === 'keep-both' ? 'Keep Both' : `Use ${decision}`}
                    </Badge>
                  </div>
                ))}
                {credentialDecisions.length > 3 && (
                  <div className="text-xs text-slate-500 mt-1">
                    +{credentialDecisions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Domains Decisions */}
          {domainDecisions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-accent" />
                Domains ({domainDecisions.length})
              </h3>
              <div className="space-y-1 ml-6">
                {domainDecisions.slice(0, 3).map(([url, decision]) => (
                  <div key={url} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-mono truncate max-w-xs">{url}</span>
                    <Badge variant="outline" className="text-xs bg-accent/20 text-accent border-accent/50">
                      {decision.selected}
                    </Badge>
                  </div>
                ))}
                {domainDecisions.length > 3 && (
                  <div className="text-xs text-slate-500 mt-1">
                    +{domainDecisions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workflow Calls Decisions */}
          {workflowCallDecisions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Workflow className="w-4 h-4 text-accent" />
                Workflow Calls ({workflowCallDecisions.length})
              </h3>
              <div className="space-y-1 ml-6">
                {workflowCallDecisions.slice(0, 3).map(([call, decision]) => (
                  <div key={call} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-mono truncate">{call}</span>
                    <Badge
                      variant="outline"
                      className={
                        decision === 'add'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : decision === 'remove'
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : 'bg-slate-500/20 text-slate-400 border-slate-500/50'
                      }
                    >
                      {decision === 'add' ? 'Add' : decision === 'remove' ? 'Remove' : 'Keep'}
                    </Badge>
                  </div>
                ))}
                {workflowCallDecisions.length > 3 && (
                  <div className="text-xs text-slate-500 mt-1">
                    +{workflowCallDecisions.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {credentialDecisions.length === 0 &&
            domainDecisions.length === 0 &&
            workflowCallDecisions.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No decisions made yet. All items will use default values.</p>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end pt-4 border-t border-slate-700">
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          className="bg-accent hover:bg-accent-dark text-accent-foreground font-semibold"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Merge Branch...
            </>
          ) : (
            <>
              <GitMerge className="w-4 h-4 mr-2" />
              Create Merge Branch
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
