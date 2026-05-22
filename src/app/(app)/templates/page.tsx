import { getTemplates } from '@/lib/db/queries/templates';
import { TemplatesClient } from './templates-client';

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const data = await getTemplates({
    search: params.search,
    platform: params.platform,
  });

  return <TemplatesClient data={data} />;
}
