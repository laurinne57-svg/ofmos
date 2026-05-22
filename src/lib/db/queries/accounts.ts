import { and, desc, eq, ilike } from 'drizzle-orm';

import { db } from '@/lib/db';
import { accounts, models, niches } from '@/lib/db/schema';

export async function getAccounts(filters: { search?: string; modelId?: string; status?: string } = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(accounts.handle, `%${filters.search}%`));
  }
  if (filters.modelId) {
    conditions.push(eq(accounts.modelId, filters.modelId));
  }
  if (filters.status) {
    conditions.push(eq(accounts.status, filters.status as any));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: accounts.id,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      modelId: accounts.modelId,
      platform: accounts.platform,
      handle: accounts.handle,
      profileUrl: accounts.profileUrl,
      status: accounts.status,
      followersCount: accounts.followersCount,
      nicheId: accounts.nicheId,
      notes: accounts.notes,
      modelName: models.name,
      nicheName: niches.name,
    })
    .from(accounts)
    .innerJoin(models, eq(accounts.modelId, models.id))
    .leftJoin(niches, eq(accounts.nicheId, niches.id))
    .where(where)
    .orderBy(desc(accounts.createdAt));
}
