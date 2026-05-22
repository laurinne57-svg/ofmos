import { desc, eq } from 'drizzle-orm';

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

export async function getAiStudioData() {
  const [characters, environments, references, jobs, modelRows] = await Promise.all([
    db
      .select({
        id: aiCharacters.id,
        createdAt: aiCharacters.createdAt,
        updatedAt: aiCharacters.updatedAt,
        modelId: aiCharacters.modelId,
        modelName: models.name,
        name: aiCharacters.name,
        handle: aiCharacters.handle,
        description: aiCharacters.description,
        identityPrompt: aiCharacters.identityPrompt,
        negativePrompt: aiCharacters.negativePrompt,
        notes: aiCharacters.notes,
      })
      .from(aiCharacters)
      .leftJoin(models, eq(aiCharacters.modelId, models.id))
      .orderBy(desc(aiCharacters.createdAt)),
    db.select().from(aiEnvironments).orderBy(desc(aiEnvironments.createdAt)),
    db.select().from(aiReferenceImages).orderBy(desc(aiReferenceImages.createdAt)),
    db.select().from(aiGenerationJobs).orderBy(desc(aiGenerationJobs.createdAt)).limit(20),
    db.select({ id: models.id, name: models.name }).from(models).orderBy(models.name),
  ]);

  const signedReferences = await Promise.all(
    references.map(async (reference) => ({
      ...reference,
      signedUrl: await signedReferenceUrl(reference.bucket, reference.storagePath),
    })),
  );

  return {
    characters,
    environments,
    references: signedReferences,
    jobs,
    models: modelRows,
  };
}
