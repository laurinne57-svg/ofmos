import { getNiches } from '@/lib/db/queries/niches';
import { NichesClient } from './niches-client';

export default async function NichesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const data = await getNiches({ search: params.search });

  return <NichesClient data={data} />;
}
