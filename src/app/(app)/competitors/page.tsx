import { getNiches } from '@/lib/db/queries/niches';
import { getCompetitors } from '@/lib/db/queries/competitors';
import { CompetitorsClient } from './competitors-client';

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; nicheId?: string }>;
}) {
  const params = await searchParams;
  const [data, niches] = await Promise.all([
    getCompetitors({ search: params.search, nicheId: params.nicheId }),
    getNiches(),
  ]);

  return <CompetitorsClient data={data} niches={niches} />;
}
