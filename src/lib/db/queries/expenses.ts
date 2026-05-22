import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { expenses, models } from '@/lib/db/schema';

export async function getExpenses(filters: { category?: string; from?: string; to?: string } = {}) {
  const conditions = [];
  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category as any));
  }
  if (filters.from) {
    conditions.push(gte(expenses.date, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(expenses.date, filters.to));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: expenses.id,
      createdAt: expenses.createdAt,
      date: expenses.date,
      category: expenses.category,
      description: expenses.description,
      amountCents: expenses.amountCents,
      modelId: expenses.modelId,
      recurring: expenses.recurring,
      notes: expenses.notes,
      modelName: models.name,
    })
    .from(expenses)
    .leftJoin(models, eq(expenses.modelId, models.id))
    .where(where)
    .orderBy(desc(expenses.date));
}

export async function getExpenseStats() {
  const thisMonth = new Date();
  const firstOfMonth = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const [totalThisMonth] = await db
    .select({
      total: sql<number>`COALESCE(SUM(amount_cents), 0)`,
    })
    .from(expenses)
    .where(gte(expenses.date, firstOfMonth));

  const byCategory = await db
    .select({
      category: expenses.category,
      total: sql<number>`SUM(amount_cents)`,
    })
    .from(expenses)
    .where(gte(expenses.date, firstOfMonth))
    .groupBy(expenses.category);

  return {
    totalThisMonthCents: Number(totalThisMonth.total),
    byCategory,
  };
}
