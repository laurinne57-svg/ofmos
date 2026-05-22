'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { differenciants } from '@/lib/db/schema';

export async function createDifferenciant(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;
  const notes = formData.get('notes') as string;

  if (!name || !category) throw new Error('Name and category are required');

  await db.insert(differenciants).values({
    name,
    category: category as any,
    description: description || null,
    notes: notes || null,
  });

  revalidatePath('/differenciants');
}

export async function updateDifferenciant(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const description = formData.get('description') as string;
  const notes = formData.get('notes') as string;

  if (!id || !name || !category) throw new Error('Missing required fields');

  await db
    .update(differenciants)
    .set({
      name,
      category: category as any,
      description: description || null,
      notes: notes || null,
      updatedAt: new Date(),
    })
    .where(eq(differenciants.id, id));

  revalidatePath('/differenciants');
}

export async function deleteDifferenciant(id: string): Promise<void> {
  await db.delete(differenciants).where(eq(differenciants.id, id));
  revalidatePath('/differenciants');
}
