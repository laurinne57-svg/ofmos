import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { videoVariations, sourceVideos, variationPostings } from '@/lib/db/schema';
import { VideoToolsClient } from './video-tools-client';

export default async function VideoToolsPage() {
  const [sources, variations] = await Promise.all([
    db
      .select({
        id: sourceVideos.id,
        title: sourceVideos.title,
        storageUrl: sourceVideos.storageUrl,
        durationSeconds: sourceVideos.durationSeconds,
      })
      .from(sourceVideos)
      .orderBy(desc(sourceVideos.createdAt)),

    db
      .select({
        id: videoVariations.id,
        createdAt: videoVariations.createdAt,
        status: videoVariations.status,
        storageUrl: videoVariations.storageUrl,
        config: videoVariations.config,
        errorMessage: videoVariations.errorMessage,
        sourceVideoId: videoVariations.sourceVideoId,
        sourceTitle: sourceVideos.title,
        postingCount: sql<number>`(SELECT count(*) FROM variation_postings WHERE variation_postings.variation_id = video_variations.id)`,
      })
      .from(videoVariations)
      .innerJoin(sourceVideos, eq(videoVariations.sourceVideoId, sourceVideos.id))
      .orderBy(desc(videoVariations.createdAt)),
  ]);

  return <VideoToolsClient sources={sources} variations={variations} />;
}
