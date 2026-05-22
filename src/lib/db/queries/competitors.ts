import { and, desc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  competitors,
  competitorSnapshots,
  competitorWinningFormats,
  niches,
} from '@/lib/db/schema';

export async function getCompetitors(filters: { search?: string; nicheId?: string } = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(competitors.name, `%${filters.search}%`));
  }
  if (filters.nicheId) {
    conditions.push(eq(competitors.nicheId, filters.nicheId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: competitors.id,
      createdAt: competitors.createdAt,
      updatedAt: competitors.updatedAt,
      name: competitors.name,
      platform: competitors.platform,
      profileUrl: competitors.profileUrl,
      nicheId: competitors.nicheId,
      followersCount: competitors.followersCount,
      estimatedRevenueMonthly: competitors.estimatedRevenueMonthly,
      postingFrequencyPerWeek: competitors.postingFrequencyPerWeek,
      screenshotExamples: competitors.screenshotExamples,
      notes: competitors.notes,
      nicheName: niches.name,
    })
    .from(competitors)
    .leftJoin(niches, eq(competitors.nicheId, niches.id))
    .where(where)
    .orderBy(desc(competitors.createdAt));
}

export async function getCompetitorById(id: string) {
  const result = await db
    .select({
      id: competitors.id,
      createdAt: competitors.createdAt,
      updatedAt: competitors.updatedAt,
      name: competitors.name,
      platform: competitors.platform,
      profileUrl: competitors.profileUrl,
      nicheId: competitors.nicheId,
      followersCount: competitors.followersCount,
      estimatedRevenueMonthly: competitors.estimatedRevenueMonthly,
      postingFrequencyPerWeek: competitors.postingFrequencyPerWeek,
      screenshotExamples: competitors.screenshotExamples,
      notes: competitors.notes,
      nicheName: niches.name,
    })
    .from(competitors)
    .leftJoin(niches, eq(competitors.nicheId, niches.id))
    .where(eq(competitors.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getCompetitorSnapshots(competitorId: string) {
  return db
    .select()
    .from(competitorSnapshots)
    .where(eq(competitorSnapshots.competitorId, competitorId))
    .orderBy(desc(competitorSnapshots.capturedAt));
}

export async function getCompetitorWinningFormats(competitorId: string) {
  return db
    .select()
    .from(competitorWinningFormats)
    .where(eq(competitorWinningFormats.competitorId, competitorId))
    .orderBy(desc(competitorWinningFormats.createdAt));
}
