'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { dmTemplates } from '@/lib/db/schema';

export async function createTemplate(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;
  const platform = formData.get('platform') as string;
  const content = formData.get('content') as string;

  if (!name || !platform || !content) throw new Error('Missing required fields');

  const variables = extractVariables(content);

  await db.insert(dmTemplates).values({
    name,
    platform: platform as any,
    content,
    variables,
  });

  revalidatePath('/templates');
}

export async function updateTemplate(formData: FormData): Promise<void> {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const platform = formData.get('platform') as string;
  const content = formData.get('content') as string;

  if (!id || !name || !platform || !content) throw new Error('Missing required fields');

  const variables = extractVariables(content);

  await db
    .update(dmTemplates)
    .set({ name, platform: platform as any, content, variables, updatedAt: new Date() })
    .where(eq(dmTemplates.id, id));

  revalidatePath('/templates');
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.delete(dmTemplates).where(eq(dmTemplates.id, id));
  revalidatePath('/templates');
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  const template = await db.select().from(dmTemplates).where(eq(dmTemplates.id, id)).limit(1);
  if (!template[0]) return;

  await db
    .update(dmTemplates)
    .set({ timesUsed: (template[0].timesUsed ?? 0) + 1 })
    .where(eq(dmTemplates.id, id));

  revalidatePath('/templates');
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}
