import { notFound } from 'next/navigation';

import { getCompetitorById, getCompetitorSnapshots, getCompetitorWinningFormats } from '@/lib/db/queries/competitors';
import { CompetitorDetailClient } from './competitor-detail-client';

export default async function CompetitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [competitor, snapshots, winningFormats] = await Promise.all([
    getCompetitorById(id),
    getCompetitorSnapshots(id),
    getCompetitorWinningFormats(id),
  ]);

  if (!competitor) notFound();

  return (
    <CompetitorDetailClient
      competitor={competitor}
      snapshots={snapshots}
      winningFormats={winningFormats}
    />
  );
}
