'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { estimateGenerationCost } from '@/lib/ai/credits';
import { buildGenerationPrompt, extractMentions, normalizeMention } from '@/lib/ai/mentions';
import {
  buildProviderPayload,
  enhancorVideoModes,
  getProviderState,
  queueNanoBananaImage,
  queueEnhancorVideo,
  type EnhancorVideoMode,
  type GenerationMode,
} from '@/lib/ai/providers';
import { db } from '@/lib/db';
import {
  aiCharacters,
  aiEnvironments,
  aiGenerationJobs,
  aiReferenceImages,
} from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

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

async function signedReferenceUrls(refs: Array<typeof aiReferenceImages.$inferSelect>) {
  const supabase = await createClient();
  const signed = await Promise.all(
    refs.map(async (ref) => {
      const { data } = await supabase.storage
        .from(ref.bucket)
        .createSignedUrl(ref.storagePath, 60 * 60);
      return data?.signedUrl ?? null;
    }),
  );

  return signed.filter((url): url is string => Boolean(url));
}

async function saveGeneratedImages(input: {
  imageUrls: string[];
  jobId: string;
}) {
  const supabase = await createClient();
  const saved = [];

  for (let index = 0; index < input.imageUrls.length; index++) {
    const imageUrl = input.imageUrls[index];
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to download generated image ${index + 1}`);

    const contentType = response.headers.get('content-type') || 'image/png';
    const bytes = await response.arrayBuffer();
    const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
    const path = `creation/${input.jobId}/${Date.now()}-${index + 1}.${extension}`;

    const { error } = await supabase.storage
      .from('ai-output')
      .upload(path, bytes, { contentType, upsert: false });

    if (error) throw error;

    const { data } = await supabase.storage.from('ai-output').createSignedUrl(path, 60 * 60);

    saved.push({
      bucket: 'ai-output',
      path,
      signedUrl: data?.signedUrl ?? null,
      sourceUrl: imageUrl,
      contentType,
    });
  }

  return saved;
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseMultiFramePrompts(value: string) {
  return parseLines(value).map((line) => {
    const [durationPart, ...promptParts] = line.includes('|')
      ? line.split('|')
      : ['5', line];
    return {
      duration: Math.max(1, Number(durationPart.trim()) || 5),
      prompt: promptParts.join('|').trim(),
    };
  }).filter((item) => item.prompt);
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    'https://ofm-os.vercel.app'
  ).replace(/\/$/, '');
}

export async function createCreationJob(formData: FormData): Promise<void> {
  const mode = (String(formData.get('mode') ?? 'image') as GenerationMode) || 'image';
  const rawPrompt = String(formData.get('prompt') ?? '').trim();
  const selectedCharacterId = String(formData.get('characterId') ?? '');
  const selectedDecorId = String(formData.get('decorId') ?? '');
  const aspectRatio = String(formData.get('aspectRatio') ?? '9:16');
  const outputCount = Math.max(1, Math.min(4, Number(formData.get('outputCount') ?? 1)));
  const strength = String(formData.get('strength') ?? 'balanced');
  const videoMode = (String(formData.get('videoMode') ?? 'multi_reference') as EnhancorVideoMode);
  const duration = String(formData.get('duration') ?? '5');
  const resolution = String(formData.get('resolution') ?? '720p');
  const imageResolution = String(formData.get('imageResolution') ?? '2K');
  const fastMode = formData.get('fastMode') === 'on';
  const fullAccess = formData.get('fullAccess') !== 'off';
  const isUncensored = formData.get('isUncensored') === 'on';
  const externalImages = parseLines(String(formData.get('externalImages') ?? ''));
  const externalVideos = parseLines(String(formData.get('externalVideos') ?? ''));
  const externalAudios = parseLines(String(formData.get('externalAudios') ?? ''));
  const productUrls = parseLines(String(formData.get('productUrls') ?? ''));
  const influencerUrls = parseLines(String(formData.get('influencerUrls') ?? ''));
  const firstFrameImage = String(formData.get('firstFrameImage') ?? '').trim();
  const lastFrameImage = String(formData.get('lastFrameImage') ?? '').trim();
  const lipsyncingAudio = String(formData.get('lipsyncingAudio') ?? '').trim();
  const multiFramePrompts = parseMultiFramePrompts(String(formData.get('multiFramePrompts') ?? ''));

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

  const basePayload = buildProviderPayload({
    mode,
    prompt,
    negativePrompt,
    aspectRatio,
    outputCount,
    characterReferencePaths: characterRefs.map((ref) => `${ref.bucket}/${ref.storagePath}`),
    decorReferencePaths: decorRefs.map((ref) => `${ref.bucket}/${ref.storagePath}`),
  });

  const providerState = getProviderState();
  const estimatedCost = estimateGenerationCost({
    mode,
    videoMode,
    duration,
    resolution,
    imageResolution,
    fastMode,
  });
  const [job] = await db.insert(aiGenerationJobs).values({
    characterId: selectedCharacter?.id ?? null,
    environmentId: selectedDecor?.id ?? null,
    provider: mode === 'image' ? 'nano-banana' : 'video-provider',
    status: mode === 'image' && providerState.imageProvider === 'nano-banana' ? 'processing' : 'draft',
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
      imageResolution,
      providerState,
      estimatedCost,
      payload: basePayload,
      videoMode: mode === 'video' ? videoMode : null,
      referenceCounts: {
        character: characterRefs.length,
        decor: decorRefs.length,
      },
    },
  }).returning({ id: aiGenerationJobs.id });

  if (mode !== 'image') {
    if (providerState.videoProvider !== 'enhancor') {
      await db
        .update(aiGenerationJobs)
        .set({
          status: 'failed',
          errorMessage: 'ENHANCOR_API_KEY is not configured.',
          updatedAt: new Date(),
        })
        .where(eq(aiGenerationJobs.id, job.id));
      revalidatePath('/creation');
      return;
    }

    try {
      const referenceImageUrls = await signedReferenceUrls([...characterRefs, ...decorRefs]);
      const sharedImages = [...referenceImageUrls, ...externalImages].slice(0, 9);
      const promptForMode = videoMode === 'multi_reference'
        ? `${prompt}\n\nUse references: ${sharedImages.map((_, i) => `@image${i + 1}`).join(' ')}`
        : videoMode === 'ugc'
          ? `${prompt}\n\nUse product/influencer references in the scene.`
          : videoMode === 'lipsyncing'
            ? `${prompt}\n\nMatch speech/audio timing precisely. ${lipsyncingAudio ? '@audio1' : ''}`
            : prompt;

      const result = await queueEnhancorVideo({
        mode: videoMode,
        prompt: promptForMode,
        duration,
        resolution,
        aspectRatio,
        webhookUrl: `${getAppUrl()}/api/enhancor/webhook`,
        fastMode,
        fullAccess,
        isUncensored,
        images: videoMode === 'multi_reference' ? sharedImages : externalImages,
        videos: externalVideos,
        audios: lipsyncingAudio ? [lipsyncingAudio, ...externalAudios] : externalAudios,
        products: productUrls.length ? productUrls : videoMode === 'ugc' ? decorRefs.length ? referenceImageUrls.slice(0, 4) : [] : [],
        influencers: influencerUrls.length ? influencerUrls : videoMode === 'ugc' ? characterRefs.length ? referenceImageUrls.slice(0, 4) : [] : [],
        firstFrameImage: firstFrameImage || sharedImages[0] || null,
        lastFrameImage: lastFrameImage || sharedImages[1] || null,
        lipsyncingAudio: lipsyncingAudio || externalAudios[0] || null,
        multiFramePrompts,
      });

      await db
        .update(aiGenerationJobs)
        .set({
          status: 'queued',
          updatedAt: new Date(),
          config: {
            source: 'creation',
            mode,
            rawPrompt,
            mentions,
            aspectRatio,
            outputCount,
            strength,
            imageResolution,
            providerState,
            estimatedCost,
            payload: result.payload,
            videoMode,
            videoModeLabel: enhancorVideoModes[videoMode]?.label,
            external: {
              requestId: result.requestId,
            },
            referenceCounts: {
              character: characterRefs.length,
              decor: decorRefs.length,
            },
          },
        })
        .where(eq(aiGenerationJobs.id, job.id));
    } catch (error) {
      await db
        .update(aiGenerationJobs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Video queue failed',
          updatedAt: new Date(),
        })
        .where(eq(aiGenerationJobs.id, job.id));
    }

    revalidatePath('/creation');
    return;
  }

  if (providerState.imageProvider !== 'nano-banana') {
    await db
      .update(aiGenerationJobs)
      .set({
        status: 'failed',
        errorMessage: 'NANO_BANANA_API_KEY or ENHANCOR_API_KEY is not configured.',
        updatedAt: new Date(),
      })
      .where(eq(aiGenerationJobs.id, job.id));
    revalidatePath('/creation');
    return;
  }

  try {
    const referenceImageUrls = await signedReferenceUrls([...characterRefs, ...decorRefs]);
    const result = await queueNanoBananaImage({
      prompt,
      referenceImageUrls,
      aspectRatio,
      resolution: String(formData.get('imageResolution') ?? '2K'),
      webhookUrl: `${getAppUrl()}/api/enhancor/webhook`,
    });

    await db
      .update(aiGenerationJobs)
      .set({
        status: 'queued',
        updatedAt: new Date(),
        config: {
          source: 'creation',
          mode,
          rawPrompt,
          mentions,
          aspectRatio,
          outputCount,
          strength,
          imageResolution,
          providerState,
          estimatedCost,
          payload: result.payload,
          external: {
            requestId: result.requestId,
            provider: 'nano-banana-2-new',
          },
          referenceCounts: {
            character: characterRefs.length,
            decor: decorRefs.length,
          },
        },
      })
      .where(eq(aiGenerationJobs.id, job.id));
  } catch (error) {
    await db
      .update(aiGenerationJobs)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Generation failed',
        updatedAt: new Date(),
      })
      .where(eq(aiGenerationJobs.id, job.id));
  }

  revalidatePath('/creation');
}

function cleanHandle(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createCreationCharacter(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim();
  const handle = cleanHandle(formData.get('handle') || name);
  const description = String(formData.get('description') ?? '').trim();
  const identityPrompt = String(formData.get('identityPrompt') ?? '').trim();
  const negativePrompt = String(formData.get('negativePrompt') ?? '').trim();
  const files = formData
    .getAll('referenceImages')
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, 10);

  if (!name || !handle) throw new Error('Character name and handle are required');
  if (files.length < 1) throw new Error('Upload at least 1 avatar reference image');
  if (files.some((file) => !file.type.startsWith('image/'))) {
    throw new Error('Avatar references must be images');
  }

  const [character] = await db
    .insert(aiCharacters)
    .values({
      name,
      handle,
      description: description || null,
      identityPrompt: identityPrompt || null,
      negativePrompt: negativePrompt || null,
    })
    .returning({ id: aiCharacters.id });

  const supabase = await createClient();
  const uploadedRefs = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const ext = file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || 'jpg';
    const path = `characters/${character.id}/${Date.now()}-${index + 1}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('ai-reference')
      .upload(path, bytes, { contentType: file.type || 'image/jpeg', upsert: false });

    if (error) throw error;

    uploadedRefs.push({
      assetType: 'character' as const,
      characterId: character.id,
      environmentId: null,
      bucket: 'ai-reference',
      storagePath: path,
      originalName: file.name,
      mimeType: file.type || 'image/jpeg',
      fileSizeBytes: file.size,
    });
  }

  if (uploadedRefs.length) {
    await db.insert(aiReferenceImages).values(uploadedRefs);
  }

  revalidatePath('/creation');
  revalidatePath('/ai-studio');
}
