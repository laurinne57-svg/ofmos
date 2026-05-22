import { getAccounts } from '@/lib/db/queries/accounts';
import { getNiches } from '@/lib/db/queries/niches';
import { db } from '@/lib/db';
import { models } from '@/lib/db/schema';
import { AccountsClient } from './accounts-client';

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [data, niches, allModels] = await Promise.all([
    getAccounts({ search: params.search, status: params.status }),
    getNiches(),
    db.select({ id: models.id, name: models.name }).from(models).where(undefined),
  ]);

  return <AccountsClient data={data} niches={niches} models={allModels} />;
}
