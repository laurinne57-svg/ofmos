'use server';

import { revalidatePath } from 'next/cache';
import { buildGenerationPrompt, extractMentions, normalizeMention } from '@/lib/ai/mentions';
import { buildProviderPayload, getProviderState, type GenerationMode } from '@/lib/ai/providers';
import { db } from '@/lib/db';
import {
  aiCharacters,
  aiEnvironments,
  aiGenerationJobs,
  aiReferenceImages,
} from '@/lib/db/schema';

async function resolveByPromptOrSelection(input: {
  prompt: string;
  selectedCharacterId: string;
  selectedDecorId: string;
}) {
  const mentions = extractMentions(input.prompt);

  const [characters, decors] = await Promise.all([
    db.select().from(aiCharacters),
    db.select().from(aiEnvironments),
  ]);

  const selectedCharacter =
    characters.find((character) => character.id === input.selectedCharacterId) ??
    characters.find((character) => mentions.includes(normalizeMention(character.handle))) ??
    null;

  const selectedDecor =
    decors.find((decor) => decor.id === input.selectedDecorId) ??
    decors.find((decor) => mentions.includes(normalizeMention(decor.handle))) ??
    null;

  return { selectedCharacter, selectedDecor, mentions };
}

export async function createCreationJob(formData: FormData): Promise<void> {
  const mode = (String(formData.get('mode') ?? 'image') as GenerationMode) || 'image';
  const rawPrompt = String(formData.get('prompt') ?? '').trim();
  const selectedCharacterId = String(formData.get('characterId') ?? '');
  const selectedDecorId = String(formData.get('decorId') ?? '');
  const aspectRatio = String(formData.get('aspectRatio') ?? '9:16');
  const outputCount = Math.max(1, Math.min(4, Number(formData.get('outputCount') ?? 1)));
  const strength = String(formData.get('strength') ?? 'balanced');

  if (!rawPrompt) throw new Error('Prompt is required');

  const { selectedCharacter, selectedDecor, mentions } = await resolveByPromptOrSelection({
    prompt: rawPrompt,
    selectedCharacterId,
    selectedDecorId,
  });

  const refs = await db.select().from(aiReferenceImages);

  const characterRefs = selectedCharacter
    ? refs.filter((ref) => ref.characterId === selectedCharacter.id)
    : [];
  const decorRefs = selectedDecor
    ? refs.filter((ref) => ref.environmentId === selectedDecor.id)
    : [];

  const prompt = buildGenerationPrompt({
    prompt: rawPrompt,
    character: selectedCharacter,
    decor: selectedDecor,
  });

  const negativePrompt = [selectedCharacter?.negativePrompt, selectedDecor?.negativePrompt]
    .filter(Boolean)
    .join('\n');

  const payload = buildProviderPayload({
    mode,
    prompt,
    negativePrompt,
    aspectRatio,
    outputCount,
    characterReferencePaths: characterRefs.map((ref) => `${ref.bucket}/${ref.storagePath}`),
    decorReferencePaths: decorRefs.map((ref) => `${ref.bucket}/${ref.storagePath}`),
  });

  await db.insert(aiGenerationJobs).values({
    characterId: selectedCharacter?.id ?? null,
    environmentId: selectedDecor?.id ?? null,
    provider: mode === 'image' ? 'nano-banana' : 'video-provider',
    status: 'draft',
    prompt,
    negativePrompt: negativePrompt || null,
    config: {
      source: 'creation',
      mode,
      rawPrompt,
      mentions,
      aspectRatio,
      outputCount,
      strength,
      providerState: getProviderState(),
      payload,
      referenceCounts: {
        character: characterRefs.length,
        decor: decorRefs.length,
      },
    },
  });

  revalidatePath('/creation');
}
