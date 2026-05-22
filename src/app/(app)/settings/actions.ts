'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { expenses, inspirationItems } from '@/lib/db/schema';

export async function createExpense(formData: FormData): Promise<void> {
  const date = formData.get('date') as string;
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;
  const amountCents = formData.get('amountCents') as string;
  const modelId = formData.get('modelId') as string;
  const recurring = formData.get('recurring') === 'true';
  const notes = formData.get('notes') as string;

  if (!date || !category || !description || !amountCents) throw new Error('Missing required fields');

  await db.insert(expenses).values({
    date,
    category: category as any,
    description,
    amountCents: parseInt(amountCents),
    modelId: modelId || null,
    recurring,
    notes: notes || null,
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

export async function deleteExpense(id: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

export async function createInspiration(formData: FormData): Promise<void> {
  const url = formData.get('url') as string;
  const screenshotUrl = formData.get('screenshotUrl') as string;
  const nicheId = formData.get('nicheId') as string;
  const hookPattern = formData.get('hookPattern') as string;
  const formatType = formData.get('formatType') as string;
  const notes = formData.get('notes') as string;
  const tagsRaw = formData.get('tags') as string;

  await db.insert(inspirationItems).values({
    url: url || null,
    screenshotUrl: screenshotUrl || null,
    nicheId: nicheId || null,
    hookPattern: hookPattern || null,
    formatType: formatType ? (formatType as any) : null,
    notes: notes || null,
    tags: tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : null,
  });

  revalidatePath('/settings');
}

export async function deleteInspiration(id: string): Promise<void> {
  await db.delete(inspirationItems).where(eq(inspirationItems.id, id));
  revalidatePath('/settings');
}
