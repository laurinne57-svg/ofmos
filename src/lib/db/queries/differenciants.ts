import { and, desc, eq, ilike } from 'drizzle-orm';

import { db } from '@/lib/db';
import { differenciants, nichesDifferenciants, niches } from '@/lib/db/schema';

export async function getDifferenciants(filters: { search?: string; category?: string } = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(differenciants.name, `%${filters.search}%`));
  }
  if (filters.category) {
    conditions.push(eq(differenciants.category, filters.category as any));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(differenciants)
    .where(where)
    .orderBy(desc(differenciants.createdAt));
}

export async function getDifferenciantById(id: string) {
  const result = await db.select().from(differenciants).where(eq(differenciants.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getDifferenciantNiches(differenciantId: string) {
  return db
    .select({
      id: niches.id,
      name: niches.name,
    })
    .from(nichesDifferenciants)
    .innerJoin(niches, eq(nichesDifferenciants.nicheId, niches.id))
    .where(eq(nichesDifferenciants.differenciantId, differenciantId));
}
