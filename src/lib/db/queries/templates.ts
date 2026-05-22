import { and, desc, eq, ilike, or } from 'drizzle-orm';

import { db } from '@/lib/db';
import { dmTemplates } from '@/lib/db/schema';

export async function getTemplates(filters: { search?: string; platform?: string } = {}) {
  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(ilike(dmTemplates.name, `%${filters.search}%`), ilike(dmTemplates.content, `%${filters.search}%`)),
    );
  }
  if (filters.platform) {
    conditions.push(eq(dmTemplates.platform, filters.platform as any));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(dmTemplates)
    .where(where)
    .orderBy(desc(dmTemplates.createdAt));
}

export async function getTemplateById(id: string) {
  const result = await db.select().from(dmTemplates).where(eq(dmTemplates.id, id)).limit(1);
  return result[0] ?? null;
}
