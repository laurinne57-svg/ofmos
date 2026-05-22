'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { competitors, competitorSnapshots, competitorWinningFormats } from '@/lib/db/schema';

export async function createCompetitor(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;
  const platform = formData.get('platform') as string;
  const profileUrl = formData.get('profileUrl') as string;
  const nicheId = formData.get('nicheId') as string;
  const followersCount = formData.get('followersCount') as string;
  const estimatedRevenueMonthly = formData.get('estimatedRevenueMonthly') as string;
  const postingFrequencyPerWeek = formData.get('postingFrequencyPerWeek') as string;
  const notes = formData.get('notes') as string;

  if (!name || !platform) throw new Error('Name and platform are required');

  await db.insert(competitors).values({
    name,
    platform,
    profileUrl: profileUrl || null,
    nicheId: nicheId || null,
    followersCount: followersCount ? parseInt(followersCount) : null,
    estimatedRevenueMonthly: estimatedRevenueMonthly ? parseInt(estimatedRevenueMonthly) : null,
    postingFrequencyPerWeek: postingFrequencyPerWeek || null,
    notes: notes || null,
  });

  revalidatePath('/competitors');
}

export async function updateCompetitor(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const platform = formData.get('platform') as string;
  const profileUrl = formData.get('profileUrl') as string;
  const nicheId = formData.get('nicheId') as string;
  const followersCount = formData.get('followersCount') as string;
  const estimatedRevenueMonthly = formData.get('estimatedRevenueMonthly') as string;
  const postingFrequencyPerWeek = formData.get('postingFrequencyPerWeek') as string;
  const notes = formData.get('notes') as string;

  if (!id || !name || !platform) throw new Error('Missing required fields');

  await db
    .update(competitors)
    .set({
      name,
      platform,
      profileUrl: profileUrl || null,
      nicheId: nicheId || null,
      followersCount: followersCount ? parseInt(followersCount) : null,
      estimatedRevenueMonthly: estimatedRevenueMonthly ? parseInt(estimatedRevenueMonthly) : null,
      postingFrequencyPerWeek: postingFrequencyPerWeek || null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(competitors.id, id));

  revalidatePath('/competitors');
}

export async function deleteCompetitor(id: string): Promise<void> {
  await db.delete(competitors).where(eq(competitors.id, id));
  revalidatePath('/competitors');
}

export async function addSnapshot(formData: FormData): Promise<void> {
  const competitorId = formData.get('competitorId') as string;
  const followersCount = formData.get('followersCount') as string;
  const likesAvg = formData.get('likesAvg') as string;
  const postsCount = formData.get('postsCount') as string;

  if (!competitorId) throw new Error('Competitor ID is required');

  await db.insert(competitorSnapshots).values({
    competitorId,
    followersCount: followersCount ? parseInt(followersCount) : null,
    likesAvg: likesAvg ? parseInt(likesAvg) : null,
    postsCount: postsCount ? parseInt(postsCount) : null,
  });

  revalidatePath(`/competitors/${competitorId}`);
}

export async function addWinningFormat(formData: FormData): Promise<void> {
  const competitorId = formData.get('competitorId') as string;
  const formatType = formData.get('formatType') as string;
  const description = formData.get('description') as string;
  const exampleUrl = formData.get('exampleUrl') as string;
  const estimatedEngagement = formData.get('estimatedEngagement') as string;
  const notes = formData.get('notes') as string;

  if (!competitorId || !formatType || !description) throw new Error('Missing required fields');

  await db.insert(competitorWinningFormats).values({
    competitorId,
    formatType: formatType as any,
    description,
    exampleUrl: exampleUrl || null,
    estimatedEngagement: estimatedEngagement || null,
    notes: notes || null,
  });

  revalidatePath(`/competitors/${competitorId}`);
}

export async function deleteWinningFormat(id: string, competitorId: string): Promise<void> {
  await db.delete(competitorWinningFormats).where(eq(competitorWinningFormats.id, id));
  revalidatePath(`/competitors/${competitorId}`);
}
