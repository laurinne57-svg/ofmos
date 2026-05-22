import Link from 'next/link';

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
} from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PipelineFunnel } from '@/components/charts/pipeline-funnel';
import { ExpensesChart } from '@/components/charts/expenses-chart';
import { StatusBadge } from '@/components/models/status-badge';
import {
  getDashboardStats,
  getStaleAlerts,
  getTodoDMs,
  getRecentActivities,
  getPipelineCounts,
  getMonthlyExpenseTotal,
  getMonthlyExpenseTrend,
} from '@/lib/db/queries/dashboard';
import { formatDistanceToNow } from '@/lib/utils';

const activityLabels: Record<string, string> = {
  dm_sent: 'DM Sent',
  response_received: 'Reply',
  questionnaire_sent: 'Quest. Sent',
  questionnaire_received: 'Quest. Recv',
  call_scheduled: 'Call Sched.',
  call_done: 'Call Done',
  note: 'Note',
  status_change: 'Status',
  photo_uploaded: 'Photo',
};

const activityDots: Record<string, string> = {
  dm_sent: 'bg-blue-500',
  response_received: 'bg-green-500',
  questionnaire_sent: 'bg-violet-500',
  questionnaire_received: 'bg-purple-500',
  call_scheduled: 'bg-amber-500',
  call_done: 'bg-orange-500',
  note: 'bg-slate-400',
  status_change: 'bg-cyan-500',
  photo_uploaded: 'bg-pink-500',
};

export default async function DashboardPage() {
  const [stats, stale, todoDMs, recentActivities, pipelineCounts, monthlyExpenses, expenseTrend] =
    await Promise.all([
      getDashboardStats(),
      getStaleAlerts(),
      getTodoDMs(),
      getRecentActivities(),
      getPipelineCounts(),
      getMonthlyExpenseTotal(),
      getMonthlyExpenseTrend(),
    ]);

  const conversionRate = stats.totalModels > 0
    ? ((stats.signedModels / stats.totalModels) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl gradient-blue p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute -right-10 -bottom-10 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
        <svg className="absolute right-6 top-8 hidden h-20 w-32 opacity-[0.08] lg:block" viewBox="0 0 128 80" fill="none">
          <path d="M0 65 L16 52 L32 58 L48 35 L64 42 L80 25 L96 30 L112 12 L128 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M0 65 L16 52 L32 58 L48 35 L64 42 L80 25 L96 30 L112 12 L128 18 V80 H0 Z" fill="white" opacity="0.06" />
        </svg>
        <div className="relative z-10 text-white">
          <p className="text-sm font-medium text-white/70">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">Here&apos;s what&apos;s happening with your agency</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight md:text-3xl">{stats.totalModels}</p>
              <p className="mt-0.5 text-xs text-white/60">Total Models</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight text-emerald-300 md:text-3xl">{conversionRate}%</p>
              <p className="mt-0.5 text-xs text-white/60">Signed Rate</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight md:text-3xl">{stats.activeInPipeline}</p>
              <p className="mt-0.5 text-xs text-white/60">In Pipeline</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-2xl font-bold tracking-tight md:text-3xl">${(monthlyExpenses / 100).toFixed(0)}</p>
              <p className="mt-0.5 text-xs text-white/60">Monthly Spend</p>
            </div>
          </div>
        </div>
      </div>

      {stale.length > 0 && (
        <Card className="card-elevated border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10">
          <CardContent className="py-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                {stale.length} stale model{stale.length > 1 ? 's' : ''} need attention
              </span>
            </div>
            <div className="space-y-2">
              {stale.map((model) => (
                <Link key={model.id} href={`/models/${model.id}`} className="block">
                  <div className="flex items-center justify-between rounded-lg border border-amber-200/50 bg-card p-2.5 text-sm transition-colors hover:bg-accent dark:border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      <StatusBadge status={model.status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(model.updatedAt))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineFunnel counts={pipelineCounts} />
        <ExpensesChart data={expenseTrend} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">To DM</CardTitle>
                <p className="text-xs text-muted-foreground">{todoDMs.length} models waiting</p>
              </div>
              <Link href="/models?status=to_dm">
                <Button variant="ghost" size="sm" className="gap-1 text-xs hover:text-primary">
                  View All <ArrowUpRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {todoDMs.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle className="mb-2 h-8 w-8 text-green-500/50" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {todoDMs.slice(0, 8).map((model) => (
                  <Link key={model.id} href={`/models/${model.id}`} className="block">
                    <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm transition-colors hover:bg-accent">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-xs font-semibold text-primary">
                          {model.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium">{model.name}</p>
                          {model.pseudoHandle && (
                            <p className="text-xs text-muted-foreground">@{model.pseudoHandle}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{model.platformSource}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <p className="text-xs text-muted-foreground">Latest updates across models</p>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="relative space-y-0">
                {recentActivities.slice(0, 8).map((activity, i) => (
                  <div key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < Math.min(recentActivities.length, 8) - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />
                    )}
                    <div className={`relative z-10 mt-0.5 h-[19px] w-[19px] shrink-0 rounded-full border-2 border-card ${activityDots[activity.type] ?? 'bg-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-tight">
                        <Link href={`/models/${activity.modelId}`} className="font-medium hover:underline">
                          {activity.modelName}
                        </Link>
                        <span className="mx-1.5 text-muted-foreground/50">·</span>
                        <span className="text-muted-foreground">{activityLabels[activity.type] ?? activity.type}</span>
                      </p>
                      {activity.content && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{activity.content}</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted-foreground/60">{formatDistanceToNow(new Date(activity.createdAt))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
