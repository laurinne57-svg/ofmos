import { getDifferenciants } from '@/lib/db/queries/differenciants';
import { DifferenciantsClient } from './differenciants-client';

export default async function DifferenciantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const params = await searchParams;
  const data = await getDifferenciants({
    search: params.search,
    category: params.category,
  });

  return <DifferenciantsClient data={data} />;
}
