'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { activities, aiCharacters, models } from '@/lib/db/schema';
import { createModelSchema, updateModelSchema } from '@/lib/validations/models';

async function logActivity(
  modelId: string,
  type: typeof activities.$inferInsert['type'],
  content?: string,
  metadata?: Record<string, unknown>,
) {
  await db.insert(activities).values({ modelId, type, content, metadata });
}

async function updateStatus(
  modelId: string,
  status: typeof models.$inferInsert['status'],
  extra: Partial<typeof models.$inferInsert> = {},
) {
  await db
    .update(models)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(models.id, modelId));
}

function cleanHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createModel(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const elementDiff = raw.ed_category || raw.ed_description
    ? {
        category: raw.ed_category as string || undefined,
        description: raw.ed_description as string || undefined,
        photoUrl: raw.ed_photoUrl as string || undefined,
      }
    : undefined;

  const parsed = createModelSchema.safeParse({
    ...raw,
    followersCount: raw.followersCount || undefined,
    elementDifferentiel: elementDiff,
  });

  if (!parsed.success) {
    throw new Error('Validation failed');
  }

  const [model] = await db
    .insert(models)
    .values({
      name: parsed.data.name,
      pseudoHandle: parsed.data.pseudoHandle || null,
      platformSource: parsed.data.platformSource,
      profileUrl: parsed.data.profileUrl || null,
      followersCount: parsed.data.followersCount ?? null,
      elementDifferentiel: parsed.data.elementDifferentiel ?? null,
    })
    .returning({ id: models.id });

  redirect(`/models/${model.id}`);
}

export async function updateModel(formData: FormData): Promise<void> {
  const raw = Object.fromEntries(formData);
  const parsed = updateModelSchema.safeParse({
    ...raw,
    followersCount: raw.followersCount || undefined,
    age: raw.age || undefined,
    disponibilityHoursPerDay: raw.disponibilityHoursPerDay || undefined,
    financialExpectationsMonthly: raw.financialExpectationsMonthly || undefined,
    previousAgenciesCount: raw.previousAgenciesCount || undefined,
  });

  if (!parsed.success) {
    return;
  }

  const { id, ...data } = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }

  await db.update(models).set(updateData).where(eq(models.id, id));
  revalidatePath(`/models/${id}`);
}

export async function markAsDMSent(modelId: string) {
  await updateStatus(modelId, 'dm_sent');
  await logActivity(modelId, 'dm_sent', 'DM sent');
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function markAsResponded(modelId: string) {
  await updateStatus(modelId, 'responded');
  await logActivity(modelId, 'response_received', 'Response received');
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function sendQuestionnaire(modelId: string) {
  await updateStatus(modelId, 'questionnaire_sent');
  await logActivity(modelId, 'questionnaire_sent', 'Questionnaire sent');
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function markQuestionnaireReceived(modelId: string) {
  await updateStatus(modelId, 'questionnaire_received');
  await logActivity(modelId, 'questionnaire_received', 'Questionnaire received');
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function scheduleCall(modelId: string, callDate: string) {
  await updateStatus(modelId, 'call_scheduled', { callDate });
  await logActivity(modelId, 'call_scheduled', `Call scheduled for ${callDate}`);
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function markCallDone(modelId: string, formData: FormData) {
  const raw = Object.fromEntries(formData);
  await updateStatus(modelId, 'call_done', {
    matosVerified: raw.matosVerified === 'true',
    faceCamNatural: (raw.faceCamNatural as any) || null,
    elementDifferentielConfirmed: raw.elementDifferentielConfirmed === 'true',
    personalCompat: (raw.personalCompat as any) || null,
    notesCall: (raw.notesCall as string) || null,
  });
  await logActivity(modelId, 'call_done', 'Call completed');
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function signModel(modelId: string, reason?: string) {
  await updateStatus(modelId, 'signed', {
    decision: 'signed',
    decisionReason: reason || null,
    decisionDate: new Date().toISOString().split('T')[0],
  });
  await logActivity(modelId, 'status_change', 'Model signed');
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function putOnHold(modelId: string, reason?: string) {
  await updateStatus(modelId, 'on_hold', {
    decision: 'on_hold',
    decisionReason: reason || null,
  });
  await logActivity(modelId, 'status_change', `Put on hold: ${reason || 'No reason'}`);
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function killModel(modelId: string, reason: string) {
  await updateStatus(modelId, 'killed', {
    killedReason: reason,
    decision: 'passed',
    decisionDate: new Date().toISOString().split('T')[0],
  });
  await logActivity(modelId, 'status_change', `Killed: ${reason}`);
  revalidatePath(`/models/${modelId}`);
  revalidatePath('/models');
}

export async function markStaleAsDead() {
  const { getStaleModels } = await import('@/lib/db/queries/models');
  const stale = await getStaleModels();

  for (const model of stale) {
    const reason =
      model.status === 'dm_sent' ? 'no_response' : 'no_questionnaire_returned';
    await killModel(model.id, reason);
  }

  revalidatePath('/models');
  return { killed: stale.length };
}

export async function addNote(modelId: string, content: string) {
  await logActivity(modelId, 'note', content);
  await db
    .update(models)
    .set({ updatedAt: new Date() })
    .where(eq(models.id, modelId));
  revalidatePath(`/models/${modelId}`);
}

export async function ensureModelAiCharacter(modelId: string): Promise<string> {
  const existing = await db
    .select({ id: aiCharacters.id })
    .from(aiCharacters)
    .where(eq(aiCharacters.modelId, modelId))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const model = await db
    .select({
      id: models.id,
      name: models.name,
      pseudoHandle: models.pseudoHandle,
      notesCall: models.notesCall,
    })
    .from(models)
    .where(eq(models.id, modelId))
    .limit(1);

  if (!model[0]) throw new Error('Model not found');

  const handle = cleanHandle(model[0].pseudoHandle || model[0].name);
  const [character] = await db
    .insert(aiCharacters)
    .values({
      modelId,
      name: model[0].name,
      handle,
      description: `AI character generated from CRM model ${model[0].name}`,
      identityPrompt: model[0].notesCall || null,
    })
    .returning({ id: aiCharacters.id });

  revalidatePath(`/models/${modelId}`);
  revalidatePath('/creation');
  revalidatePath('/ai-studio');

  return character.id;
}
