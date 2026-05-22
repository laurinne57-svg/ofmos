import { sql, gte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { models, expenses, sourceVideos, videoVariations } from '@/lib/db/schema';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusPie } from '@/components/charts/status-pie';
import { PlatformBar } from '@/components/charts/platform-bar';
import { ExpensesChart } from '@/components/charts/expenses-chart';
import { getMonthlyExpenseTrend } from '@/lib/db/queries/dashboard';

export default async function AnalyticsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [
    modelsByStatus,
    modelsByPlatform,
    modelsByTier,
    recentModelCount,
    expensesByCategory,
    totalExpensesThisMonth,
    totalVideos,
    totalVariations,
    conversionFunnel,
    expenseTrend,
  ] = await Promise.all([
    db.select({ status: models.status, count: sql<number>`count(*)` }).from(models).groupBy(models.status),
    db.select({ platform: models.platformSource, count: sql<number>`count(*)` }).from(models).groupBy(models.platformSource),
    db.select({ tier: models.estimatedTier, count: sql<number>`count(*)` }).from(models).groupBy(models.estimatedTier),
    db.select({ count: sql<number>`count(*)` }).from(models).where(gte(models.createdAt, thirtyDaysAgo)),
    db.select({ category: expenses.category, total: sql<number>`SUM(amount_cents)` }).from(expenses).where(gte(expenses.date, firstOfMonth)).groupBy(expenses.category),
    db.select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` }).from(expenses).where(gte(expenses.date, firstOfMonth)),
    db.select({ count: sql<number>`count(*)` }).from(sourceVideos),
    db.select({ count: sql<number>`count(*)` }).from(videoVariations),
    db.select({
      signed: sql<number>`count(*) FILTER (WHERE status = 'signed')`,
      total: sql<number>`count(*)`,
      killed: sql<number>`count(*) FILTER (WHERE status = 'killed')`,
    }).from(models),
    getMonthlyExpenseTrend(),
  ]);

  const conversionRate = conversionFunnel[0].total > 0
    ? ((Number(conversionFunnel[0].signed) / Number(conversionFunnel[0].total)) * 100).toFixed(1)
    : '0';

  const killRate = conversionFunnel[0].total > 0
    ? ((Number(conversionFunnel[0].killed) / Number(conversionFunnel[0].total)) * 100).toFixed(1)
    : '0';

  const tierColors: Record<string, string> = {
    S: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    A: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    B: 'bg-green-500/10 text-green-600 dark:text-green-400',
    C: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    unknown: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  };

  const categoryColors: Record<string, string> = {
    model_payment: 'bg-violet-500',
    software: 'bg-blue-500',
    advertising: 'bg-orange-500',
    equipment: 'bg-green-500',
    outsourcing: 'bg-cyan-500',
    other: 'bg-slate-400',
  };

  const totalExpensesVal = Number(totalExpensesThisMonth[0].total) / 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance overview & key metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated card-hover relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">New Models (30d)</p>
            <p className="text-3xl font-bold tracking-tight">{Number(recentModelCount[0].count)}</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-hover relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Conversion Rate</p>
            <p className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">{conversionRate}%</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-hover relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Kill Rate</p>
            <p className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">{killRate}%</p>
          </CardContent>
        </Card>

        <Card className="card-elevated card-hover relative overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Monthly Expenses</p>
            <p className="text-3xl font-bold tracking-tight">${totalExpensesVal.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusPie data={modelsByStatus.map((r) => ({ status: r.status, count: Number(r.count) }))} />
        <PlatformBar data={modelsByPlatform.map((r) => ({ platform: r.platform, count: Number(r.count) }))} />
      </div>

      <ExpensesChart data={expenseTrend} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Models by Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modelsByTier.map((row) => {
                const tier = row.tier ?? 'unknown';
                const label = tier === 'unknown' ? '?' : tier;
                return (
                  <div key={tier} className="flex items-center justify-between rounded-lg border p-2.5">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${tierColors[tier] ?? tierColors.unknown}`}>
                      {label}
                    </span>
                    <span className="text-sm font-medium">{Number(row.count)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses this month</p>
            ) : (
              <div className="space-y-2.5">
                {expensesByCategory.map((row) => {
                  const pct = totalExpensesVal > 0 ? (Number(row.total) / 100 / totalExpensesVal) * 100 : 0;
                  return (
                    <div key={row.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs capitalize text-muted-foreground">{row.category.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-medium">${(Number(row.total) / 100).toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${categoryColors[row.category] ?? 'bg-slate-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Content Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Source Videos</span>
                <Badge variant="outline" className="font-medium">{Number(totalVideos[0].count)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Variations</span>
                <Badge variant="outline" className="font-medium">{Number(totalVariations[0].count)}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Avg per Video</span>
                <Badge variant="outline" className="font-medium">
                  {Number(totalVideos[0].count) > 0
                    ? (Number(totalVariations[0].count) / Number(totalVideos[0].count)).toFixed(1)
                    : '0'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
