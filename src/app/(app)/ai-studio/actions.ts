'use server';

import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  aiCharacters,
  aiEnvironments,
  aiGenerationJobs,
  aiReferenceImages,
} from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

function cleanHandle(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function removeStorageObjects(referenceIds: string[]) {
  if (referenceIds.length === 0) return;

  const refs = await db
    .select({
      id: aiReferenceImages.id,
      bucket: aiReferenceImages.bucket,
      storagePath: aiReferenceImages.storagePath,
    })
    .from(aiReferenceImages)
    .where(inArray(aiReferenceImages.id, referenceIds));

  const supabase = await createClient();
  const byBucket = refs.reduce<Record<string, string[]>>((acc, ref) => {
    acc[ref.bucket] ??= [];
    acc[ref.bucket].push(ref.storagePath);
    return acc;
  }, {});

  await Promise.all(
    Object.entries(byBucket).map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths)),
  );
}

export async function createCharacter(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim();
  const handle = cleanHandle(formData.get('handle') || name);
  if (!name || !handle) throw new Error('Name and handle are required');

  await db.insert(aiCharacters).values({
    name,
    handle,
    modelId: String(formData.get('modelId') ?? '') || null,
    description: String(formData.get('description') ?? '') || null,
    identityPrompt: String(formData.get('identityPrompt') ?? '') || null,
    negativePrompt: String(formData.get('negativePrompt') ?? '') || null,
    notes: String(formData.get('notes') ?? '') || null,
  });

  revalidatePath('/ai-studio');
}

export async function createEnvironment(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim();
  const handle = cleanHandle(formData.get('handle') || name);
  if (!name || !handle) throw new Error('Name and handle are required');

  await db.insert(aiEnvironments).values({
    name,
    handle,
    description: String(formData.get('description') ?? '') || null,
    environmentPrompt: String(formData.get('environmentPrompt') ?? '') || null,
    negativePrompt: String(formData.get('negativePrompt') ?? '') || null,
    notes: String(formData.get('notes') ?? '') || null,
  });

  revalidatePath('/ai-studio');
}

export async function deleteCharacter(id: string): Promise<void> {
  const refs = await db
    .select({ id: aiReferenceImages.id })
    .from(aiReferenceImages)
    .where(eq(aiReferenceImages.characterId, id));
  await removeStorageObjects(refs.map((ref) => ref.id));
  await db.delete(aiCharacters).where(eq(aiCharacters.id, id));
  revalidatePath('/ai-studio');
}

export async function deleteEnvironment(id: string): Promise<void> {
  const refs = await db
    .select({ id: aiReferenceImages.id })
    .from(aiReferenceImages)
    .where(eq(aiReferenceImages.environmentId, id));
  await removeStorageObjects(refs.map((ref) => ref.id));
  await db.delete(aiEnvironments).where(eq(aiEnvironments.id, id));
  revalidatePath('/ai-studio');
}

export async function addReferenceImage(input: {
  assetType: 'character' | 'environment';
  characterId?: string | null;
  environmentId?: string | null;
  bucket: string;
  storagePath: string;
  originalName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
}): Promise<void> {
  if (input.assetType === 'character' && !input.characterId) throw new Error('Missing character');
  if (input.assetType === 'environment' && !input.environmentId) throw new Error('Missing environment');

  await db.insert(aiReferenceImages).values({
    assetType: input.assetType,
    characterId: input.assetType === 'character' ? input.characterId : null,
    environmentId: input.assetType === 'environment' ? input.environmentId : null,
    bucket: input.bucket,
    storagePath: input.storagePath,
    originalName: input.originalName ?? null,
    mimeType: input.mimeType ?? null,
    fileSizeBytes: input.fileSizeBytes ?? null,
  });

  revalidatePath('/ai-studio');
}

export async function deleteReferenceImage(id: string): Promise<void> {
  await removeStorageObjects([id]);
  await db.delete(aiReferenceImages).where(eq(aiReferenceImages.id, id));
  revalidatePath('/ai-studio');
}

export async function createGenerationDraft(formData: FormData): Promise<void> {
  const characterId = String(formData.get('characterId') ?? '');
  const environmentId = String(formData.get('environmentId') ?? '');
  const prompt = String(formData.get('prompt') ?? '').trim();
  const negativePrompt = String(formData.get('negativePrompt') ?? '').trim();

  if (!prompt) throw new Error('Prompt is required');

  await db.insert(aiGenerationJobs).values({
    characterId: characterId || null,
    environmentId: environmentId || null,
    provider: 'enhancor',
    status: 'draft',
    prompt,
    negativePrompt: negativePrompt || null,
    config: {
      mode: 'character_environment_consistency',
      referenceStrategy: 'character_and_environment_sets',
    },
  });

  revalidatePath('/ai-studio');
}
