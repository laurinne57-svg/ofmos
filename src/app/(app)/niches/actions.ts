'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { niches, nichesDifferenciants } from '@/lib/db/schema';

export async function createNiche(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const targetAudience = formData.get('targetAudience') as string;
  const saturationLevel = formData.get('saturationLevel') as string;
  const notes = formData.get('notes') as string;
  const estimatedRevenuePerModel = formData.get('estimatedRevenuePerModel') as string;
  const keywordsRaw = formData.get('keywords') as string;

  if (!name) throw new Error('Name is required');

  await db.insert(niches).values({
    name,
    description: description || null,
    targetAudience: targetAudience || null,
    saturationLevel: (saturationLevel as any) || 'medium',
    notes: notes || null,
    estimatedRevenuePerModel: estimatedRevenuePerModel ? parseInt(estimatedRevenuePerModel) : null,
    keywords: keywordsRaw ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean) : null,
  });

  revalidatePath('/niches');
}

export async function updateNiche(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const targetAudience = formData.get('targetAudience') as string;
  const saturationLevel = formData.get('saturationLevel') as string;
  const notes = formData.get('notes') as string;
  const estimatedRevenuePerModel = formData.get('estimatedRevenuePerModel') as string;
  const keywordsRaw = formData.get('keywords') as string;

  if (!id || !name) throw new Error('Missing required fields');

  await db
    .update(niches)
    .set({
      name,
      description: description || null,
      targetAudience: targetAudience || null,
      saturationLevel: (saturationLevel as any) || 'medium',
      notes: notes || null,
      estimatedRevenuePerModel: estimatedRevenuePerModel ? parseInt(estimatedRevenuePerModel) : null,
      keywords: keywordsRaw ? keywordsRaw.split(',').map((k) => k.trim()).filter(Boolean) : null,
      updatedAt: new Date(),
    })
    .where(eq(niches.id, id));

  revalidatePath('/niches');
}

export async function deleteNiche(id: string): Promise<void> {
  await db.delete(niches).where(eq(niches.id, id));
  revalidatePath('/niches');
}

export async function linkDifferenciant(nicheId: string, differenciantId: string): Promise<void> {
  await db.insert(nichesDifferenciants).values({ nicheId, differenciantId });
  revalidatePath('/niches');
}

export async function unlinkDifferenciant(nicheId: string, differenciantId: string): Promise<void> {
  const rows = await db
    .select()
    .from(nichesDifferenciants)
    .where(eq(nichesDifferenciants.nicheId, nicheId));

  const match = rows.find((r) => r.differenciantId === differenciantId);
  if (match) {
    await db.delete(nichesDifferenciants).where(eq(nichesDifferenciants.id, match.id));
  }

  revalidatePath('/niches');
}
