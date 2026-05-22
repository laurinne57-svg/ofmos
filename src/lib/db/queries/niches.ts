import { and, desc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { niches, nichesDifferenciants, differenciants, competitors } from '@/lib/db/schema';

export async function getNiches(filters: { search?: string } = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(niches.name, `%${filters.search}%`));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(niches)
    .where(where)
    .orderBy(desc(niches.createdAt));
}

export async function getNicheById(id: string) {
  const result = await db.select().from(niches).where(eq(niches.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getNicheDifferenciants(nicheId: string) {
  return db
    .select({
      id: differenciants.id,
      name: differenciants.name,
      category: differenciants.category,
      description: differenciants.description,
    })
    .from(nichesDifferenciants)
    .innerJoin(differenciants, eq(nichesDifferenciants.differenciantId, differenciants.id))
    .where(eq(nichesDifferenciants.nicheId, nicheId));
}

export async function getNicheCompetitors(nicheId: string) {
  return db
    .select()
    .from(competitors)
    .where(eq(competitors.nicheId, nicheId))
    .orderBy(desc(competitors.followersCount));
}

export async function getNicheStats() {
  const result = await db
    .select({
      id: niches.id,
      name: niches.name,
      competitorCount: sql<number>`(SELECT count(*) FROM competitors WHERE competitors.niche_id = niches.id)`,
      differenciantCount: sql<number>`(SELECT count(*) FROM niches_differenciants WHERE niches_differenciants.niche_id = niches.id)`,
    })
    .from(niches)
    .orderBy(niches.name);

  return result;
}
