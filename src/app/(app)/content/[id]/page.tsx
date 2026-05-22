import { notFound } from 'next/navigation';

import { getSourceVideoById, getVideoVariations } from '@/lib/db/queries/content';
import { VideoDetailClient } from './video-detail-client';

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, variations] = await Promise.all([
    getSourceVideoById(id),
    getVideoVariations(id),
  ]);

  if (!video) notFound();

  return <VideoDetailClient video={video} variations={variations} />;
}
