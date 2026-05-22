export type GenerationMode = 'image' | 'video';

export type NanoBananaResult = {
  externalId?: string;
  outputImageUrls: string[];
  modelUsed?: string;
  creditsUsed?: number;
  raw: unknown;
};

export function getProviderState() {
  return {
    imageProvider: process.env.NANO_BANANA_API_KEY ? 'nano-banana' : 'not_configured',
    videoProvider: process.env.OFM_VIDEO_API_KEY ? 'video-provider' : 'not_configured',
    enhancor: process.env.ENHANCOR_API_KEY ? 'configured' : 'not_configured',
  };
}

export function buildProviderPayload(input: {
  mode: GenerationMode;
  prompt: string;
  negativePrompt?: string | null;
  aspectRatio: string;
  outputCount: number;
  characterReferencePaths: string[];
  decorReferencePaths: string[];
}) {
  return {
    mode: input.mode,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? '',
    aspectRatio: input.aspectRatio,
    outputCount: input.outputCount,
    references: {
      character: input.characterReferencePaths,
      decor: input.decorReferencePaths,
    },
  };
}

export async function generateWithNanoBanana(input: {
  prompt: string;
  referenceImageUrls: string[];
  aspectRatio: string;
  selectedModel?: string;
}) {
  const apiKey = process.env.NANO_BANANA_API_KEY;
  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY is not configured');
  }

  const response = await fetch('https://www.nananobanana.com/api/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      selectedModel: input.selectedModel ?? 'nano-banana',
      referenceImageUrls: input.referenceImageUrls,
      aspectRatio: input.aspectRatio,
      mode: 'sync',
    }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof json?.errorMessage === 'string'
        ? json.errorMessage
        : typeof json?.error === 'string'
          ? json.error
          : `Nano Banana request failed (${response.status})`;
    throw new Error(message);
  }

  const data = json?.data ?? json;
  const outputImageUrls = Array.isArray(data?.outputImageUrls)
    ? data.outputImageUrls
    : Array.isArray(data?.images)
      ? data.images
      : Array.isArray(data?.urls)
        ? data.urls
        : [];

  if (outputImageUrls.length === 0) {
    throw new Error('Nano Banana returned no output image URLs');
  }

  return {
    externalId: data?.id,
    outputImageUrls,
    modelUsed: data?.modelUsed,
    creditsUsed: data?.creditsUsed,
    raw: json,
  } satisfies NanoBananaResult;
}
