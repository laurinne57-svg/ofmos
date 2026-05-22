'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';

export async function createAccount(formData: FormData): Promise<void> {
  const modelId = formData.get('modelId') as string;
  const platform = formData.get('platform') as string;
  const handle = formData.get('handle') as string;
  const profileUrl = formData.get('profileUrl') as string;
  const status = formData.get('status') as string;
  const followersCount = formData.get('followersCount') as string;
  const nicheId = formData.get('nicheId') as string;
  const notes = formData.get('notes') as string;

  if (!modelId || !platform || !handle) throw new Error('Missing required fields');

  await db.insert(accounts).values({
    modelId,
    platform,
    handle,
    profileUrl: profileUrl || null,
    status: (status as any) || 'warming',
    followersCount: followersCount ? parseInt(followersCount) : null,
    nicheId: nicheId || null,
    notes: notes || null,
  });

  revalidatePath('/accounts');
}

export async function updateAccount(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const platform = formData.get('platform') as string;
  const handle = formData.get('handle') as string;
  const profileUrl = formData.get('profileUrl') as string;
  const status = formData.get('status') as string;
  const followersCount = formData.get('followersCount') as string;
  const nicheId = formData.get('nicheId') as string;
  const notes = formData.get('notes') as string;

  if (!id || !platform || !handle) throw new Error('Missing required fields');

  await db
    .update(accounts)
    .set({
      platform,
      handle,
      profileUrl: profileUrl || null,
      status: (status as any) || 'warming',
      followersCount: followersCount ? parseInt(followersCount) : null,
      nicheId: nicheId || null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id));

  revalidatePath('/accounts');
}

export async function deleteAccount(id: string): Promise<void> {
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidatePath('/accounts');
}
