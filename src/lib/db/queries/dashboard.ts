import { and, desc, eq, gte, lt, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { models, activities, expenses, sourceVideos } from '@/lib/db/schema';

export async function getDashboardStats() {
  const [modelStats] = await db
    .select({
      total: sql<number>`count(*)`,
      signed: sql<number>`count(*) FILTER (WHERE status = 'signed')`,
      active: sql<number>`count(*) FILTER (WHERE status NOT IN ('killed', 'on_hold', 'signed'))`,
      killed: sql<number>`count(*) FILTER (WHERE status = 'killed')`,
    })
    .from(models);

  return {
    totalModels: Number(modelStats.total),
    signedModels: Number(modelStats.signed),
    activeInPipeline: Number(modelStats.active),
    killedModels: Number(modelStats.killed),
  };
}

export async function getStaleAlerts() {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  return db
    .select({
      id: models.id,
      name: models.name,
      status: models.status,
      updatedAt: models.updatedAt,
      pseudoHandle: models.pseudoHandle,
    })
    .from(models)
    .where(
      or(
        and(eq(models.status, 'dm_sent'), lt(models.updatedAt, fiveDaysAgo)),
        and(eq(models.status, 'questionnaire_sent'), lt(models.updatedAt, threeDaysAgo)),
      ),
    )
    .orderBy(models.updatedAt);
}

export async function getTodoDMs() {
  return db
    .select({
      id: models.id,
      name: models.name,
      pseudoHandle: models.pseudoHandle,
      platformSource: models.platformSource,
      estimatedTier: models.estimatedTier,
    })
    .from(models)
    .where(eq(models.status, 'to_dm'))
    .orderBy(desc(models.createdAt))
    .limit(20);
}

export async function getRecentActivities(limit = 15) {
  return db
    .select({
      id: activities.id,
      createdAt: activities.createdAt,
      type: activities.type,
      content: activities.content,
      modelId: activities.modelId,
      modelName: models.name,
    })
    .from(activities)
    .innerJoin(models, eq(activities.modelId, models.id))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

export async function getPipelineCounts() {
  const result = await db
    .select({
      status: models.status,
      count: sql<number>`count(*)`,
    })
    .from(models)
    .groupBy(models.status);

  const counts: Record<string, number> = {};
  for (const row of result) {
    counts[row.status] = Number(row.count);
  }
  return counts;
}

export async function getMonthlyExpenseTotal() {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(amount_cents), 0)`,
    })
    .from(expenses)
    .where(gte(expenses.date, firstOfMonth));

  return Number(result.total);
}

export async function getMonthlyExpenseTrend() {
  const result = await db
    .select({
      month: sql<string>`TO_CHAR(date, 'YYYY-MM')`,
      total: sql<number>`SUM(amount_cents)`,
    })
    .from(expenses)
    .groupBy(sql`TO_CHAR(date, 'YYYY-MM')`)
    .orderBy(sql`TO_CHAR(date, 'YYYY-MM')`);

  return result.map((r) => ({
    month: r.month,
    total: Number(r.total) / 100,
  }));
}

export async function getModelsByStatusForChart() {
  const result = await db
    .select({
      status: models.status,
      count: sql<number>`count(*)`,
    })
    .from(models)
    .groupBy(models.status);

  return result.map((r) => ({
    status: r.status,
    count: Number(r.count),
  }));
}
