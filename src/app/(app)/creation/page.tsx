import { getCreationData } from '@/lib/db/queries/creation';
import { CreationClient } from './creation-client';

export default async function CreationPage() {
  const data = await getCreationData();

  return <CreationClient data={data} />;
}
