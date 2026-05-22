import { getAiStudioData } from '@/lib/db/queries/ai-studio';
import { AiStudioClient } from './ai-studio-client';

export default async function AiStudioPage() {
  const data = await getAiStudioData();

  return <AiStudioClient data={data} />;
}
