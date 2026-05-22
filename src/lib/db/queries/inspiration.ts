import { and, desc, eq, ilike } from 'drizzle-orm';

import { db } from '@/lib/db';
import { inspirationItems, niches } from '@/lib/db/schema';

export async function getInspirationItems(filters: { search?: string; nicheId?: string; formatType?: string } = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(inspirationItems.hookPattern, `%${filters.search}%`));
  }
  if (filters.nicheId) {
    conditions.push(eq(inspirationItems.nicheId, filters.nicheId));
  }
  if (filters.formatType) {
    conditions.push(eq(inspirationItems.formatType, filters.formatType as any));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: inspirationItems.id,
      createdAt: inspirationItems.createdAt,
      url: inspirationItems.url,
      screenshotUrl: inspirationItems.screenshotUrl,
      nicheId: inspirationItems.nicheId,
      hookPattern: inspirationItems.hookPattern,
      formatType: inspirationItems.formatType,
      notes: inspirationItems.notes,
      tags: inspirationItems.tags,
      nicheName: niches.name,
    })
    .from(inspirationItems)
    .leftJoin(niches, eq(inspirationItems.nicheId, niches.id))
    .where(where)
    .orderBy(desc(inspirationItems.createdAt));
}
