import { desc, eq } from 'drizzle-orm';

import { getEnhancorCreditBalance } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import {
  aiCharacters,
  aiEnvironments,
  aiGenerationJobs,
  aiReferenceImages,
  models,
} from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

async function signedReferenceUrl(bucket: string, path: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function getCreationData() {
  const [characters, decors, references, jobs, creditBalance] = await Promise.all([
    db
      .select({
        id: aiCharacters.id,
        name: aiCharacters.name,
        handle: aiCharacters.handle,
        modelId: aiCharacters.modelId,
        modelName: models.name,
        description: aiCharacters.description,
        identityPrompt: aiCharacters.identityPrompt,
        negativePrompt: aiCharacters.negativePrompt,
      })
      .from(aiCharacters)
      .leftJoin(models, eq(aiCharacters.modelId, models.id))
      .orderBy(desc(aiCharacters.createdAt)),
    db.select().from(aiEnvironments).orderBy(desc(aiEnvironments.createdAt)),
    db.select().from(aiReferenceImages).orderBy(desc(aiReferenceImages.createdAt)),
    db.select().from(aiGenerationJobs).orderBy(desc(aiGenerationJobs.createdAt)).limit(60),
    getEnhancorCreditBalance(),
  ]);

  const signedReferences = await Promise.all(
    references.map(async (reference) => ({
      ...reference,
      signedUrl: await signedReferenceUrl(reference.bucket, reference.storagePath),
    })),
  );

  const signedJobs = await Promise.all(
    jobs.map(async (job) => {
      const config = job.config as { outputs?: Array<{ bucket: string; path: string; sourceUrl?: string }> } | null;
      if (!config?.outputs?.length) return { ...job, signedOutputs: [] };

      const signedOutputs = await Promise.all(
        config.outputs.map(async (output) => ({
          ...output,
          signedUrl: await signedReferenceUrl(output.bucket, output.path),
        })),
      );

      return { ...job, signedOutputs };
    }),
  );

  return {
    characters,
    decors,
    references: signedReferences,
    jobs: signedJobs,
    creditBalance,
  };
}
