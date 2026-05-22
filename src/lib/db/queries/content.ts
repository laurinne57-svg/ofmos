import { and, desc, eq, ilike, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  sourceVideos,
  videoVariations,
  variationPostings,
  models,
  niches,
} from '@/lib/db/schema';

export async function getSourceVideos(filters: { search?: string; modelId?: string; nicheId?: string } = {}) {
  const conditions = [];
  if (filters.search) {
    conditions.push(ilike(sourceVideos.title, `%${filters.search}%`));
  }
  if (filters.modelId) {
    conditions.push(eq(sourceVideos.modelId, filters.modelId));
  }
  if (filters.nicheId) {
    conditions.push(eq(sourceVideos.nicheId, filters.nicheId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: sourceVideos.id,
      createdAt: sourceVideos.createdAt,
      modelId: sourceVideos.modelId,
      title: sourceVideos.title,
      storageUrl: sourceVideos.storageUrl,
      thumbnailUrl: sourceVideos.thumbnailUrl,
      durationSeconds: sourceVideos.durationSeconds,
      fileSizeBytes: sourceVideos.fileSizeBytes,
      nicheId: sourceVideos.nicheId,
      tags: sourceVideos.tags,
      notes: sourceVideos.notes,
      modelName: models.name,
      nicheName: niches.name,
      variationCount: sql<number>`(SELECT count(*) FROM video_variations WHERE video_variations.source_video_id = source_videos.id)`,
    })
    .from(sourceVideos)
    .leftJoin(models, eq(sourceVideos.modelId, models.id))
    .leftJoin(niches, eq(sourceVideos.nicheId, niches.id))
    .where(where)
    .orderBy(desc(sourceVideos.createdAt));
}

export async function getSourceVideoById(id: string) {
  const result = await db
    .select({
      id: sourceVideos.id,
      createdAt: sourceVideos.createdAt,
      modelId: sourceVideos.modelId,
      title: sourceVideos.title,
      storageUrl: sourceVideos.storageUrl,
      thumbnailUrl: sourceVideos.thumbnailUrl,
      durationSeconds: sourceVideos.durationSeconds,
      fileSizeBytes: sourceVideos.fileSizeBytes,
      nicheId: sourceVideos.nicheId,
      tags: sourceVideos.tags,
      notes: sourceVideos.notes,
      modelName: models.name,
      nicheName: niches.name,
    })
    .from(sourceVideos)
    .leftJoin(models, eq(sourceVideos.modelId, models.id))
    .leftJoin(niches, eq(sourceVideos.nicheId, niches.id))
    .where(eq(sourceVideos.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function getVideoVariations(sourceVideoId: string) {
  return db
    .select()
    .from(videoVariations)
    .where(eq(videoVariations.sourceVideoId, sourceVideoId))
    .orderBy(desc(videoVariations.createdAt));
}

export async function getVariationPostings(variationId: string) {
  return db
    .select()
    .from(variationPostings)
    .where(eq(variationPostings.variationId, variationId))
    .orderBy(desc(variationPostings.postedAt));
}
