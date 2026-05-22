'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { videoVariations } from '@/lib/db/schema';

export async function saveVariation(data: {
  sourceVideoId: string;
  storageUrl: string;
  config: object;
}): Promise<string> {
  const [row] = await db.insert(videoVariations).values({
    sourceVideoId: data.sourceVideoId,
    status: 'done',
    storageUrl: data.storageUrl,
    config: data.config,
  }).returning({ id: videoVariations.id });

  revalidatePath('/video-tools');
  revalidatePath(`/content/${data.sourceVideoId}`);
  return row.id;
}
