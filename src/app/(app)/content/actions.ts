'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { sourceVideos, videoVariations, variationPostings } from '@/lib/db/schema';

export async function createSourceVideo(formData: FormData): Promise<void> {
  const title = formData.get('title') as string;
  const storageUrl = formData.get('storageUrl') as string;
  const modelId = formData.get('modelId') as string;
  const nicheId = formData.get('nicheId') as string;
  const durationSeconds = formData.get('durationSeconds') as string;
  const notes = formData.get('notes') as string;
  const tagsRaw = formData.get('tags') as string;

  if (!title || !storageUrl) throw new Error('Title and storage URL are required');

  await db.insert(sourceVideos).values({
    title,
    storageUrl,
    modelId: modelId || null,
    nicheId: nicheId || null,
    durationSeconds: durationSeconds ? parseInt(durationSeconds) : null,
    notes: notes || null,
    tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : null,
  });

  revalidatePath('/content');
}

export async function updateSourceVideo(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const storageUrl = formData.get('storageUrl') as string;
  const modelId = formData.get('modelId') as string;
  const nicheId = formData.get('nicheId') as string;
  const durationSeconds = formData.get('durationSeconds') as string;
  const notes = formData.get('notes') as string;
  const tagsRaw = formData.get('tags') as string;

  if (!id || !title || !storageUrl) throw new Error('Missing required fields');

  await db
    .update(sourceVideos)
    .set({
      title,
      storageUrl,
      modelId: modelId || null,
      nicheId: nicheId || null,
      durationSeconds: durationSeconds ? parseInt(durationSeconds) : null,
      notes: notes || null,
      tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : null,
    })
    .where(eq(sourceVideos.id, id));

  revalidatePath('/content');
}

export async function deleteSourceVideo(id: string): Promise<void> {
  await db.delete(sourceVideos).where(eq(sourceVideos.id, id));
  revalidatePath('/content');
}

export async function createVariation(formData: FormData): Promise<void> {
  const sourceVideoId = formData.get('sourceVideoId') as string;
  const configRaw = formData.get('config') as string;

  if (!sourceVideoId) throw new Error('Source video ID is required');

  await db.insert(videoVariations).values({
    sourceVideoId,
    status: 'pending',
    config: configRaw ? JSON.parse(configRaw) : null,
  });

  revalidatePath('/video-tools');
  revalidatePath(`/content/${sourceVideoId}`);
}

export async function addPosting(formData: FormData): Promise<void> {
  const variationId = formData.get('variationId') as string;
  const platform = formData.get('platform') as string;
  const accountHandle = formData.get('accountHandle') as string;
  const postUrl = formData.get('postUrl') as string;

  if (!variationId || !platform) throw new Error('Missing required fields');

  await db.insert(variationPostings).values({
    variationId,
    platform,
    accountHandle: accountHandle || null,
    postUrl: postUrl || null,
  });

  revalidatePath('/video-tools');
}
