import { getSourceVideos } from '@/lib/db/queries/content';
import { getNiches } from '@/lib/db/queries/niches';
import { ContentClient } from './content-client';

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; nicheId?: string }>;
}) {
  const params = await searchParams;
  const [data, niches] = await Promise.all([
    getSourceVideos({ search: params.search, nicheId: params.nicheId }),
    getNiches(),
  ]);

  return <ContentClient data={data} niches={niches} />;
}
