export type GenerationMode = 'image' | 'video';
export type EnhancorVideoMode =
  | 'ugc'
  | 'multi_reference'
  | 'multi_frame'
  | 'lipsyncing'
  | 'first_n_last_frames'
  | 'text-to-video';

export type NanoBananaResult = {
  externalId?: string;
  outputImageUrls: string[];
  modelUsed?: string;
  creditsUsed?: number;
  raw: unknown;
};

export type NanoBananaQueueResult = {
  requestId: string;
  payload: Record<string, unknown>;
  raw: unknown;
};

function getImageApiKey() {
  return process.env.NANO_BANANA_API_KEY || process.env.ENHANCOR_API_KEY;
}

export function getProviderState() {
  return {
    imageProvider: getImageApiKey() ? 'nano-banana' : 'not_configured',
    videoProvider: process.env.ENHANCOR_API_KEY ? 'enhancor' : 'not_configured',
    enhancor: process.env.ENHANCOR_API_KEY ? 'configured' : 'not_configured',
  };
}

export const enhancorVideoModes: Record<EnhancorVideoMode, {
  label: string;
  description: string;
  type: 'text-to-video' | 'image-to-video';
}> = {
  ugc: {
    label: 'UGC',
    description: 'Product + influencer ad generation.',
    type: 'image-to-video',
  },
  multi_reference: {
    label: 'Multi Reference',
    description: 'Blend up to 9 character/decor/style references.',
    type: 'image-to-video',
  },
  multi_frame: {
    label: 'Multi Frame',
    description: 'Sequential scene prompts. Durations sum to 4-15s.',
    type: 'image-to-video',
  },
  lipsyncing: {
    label: 'Lip Sync',
    description: 'Animate a face with an audio URL under 15s.',
    type: 'image-to-video',
  },
  first_n_last_frames: {
    label: 'First / Last',
    description: 'Interpolate smoothly between two images.',
    type: 'image-to-video',
  },
  'text-to-video': {
    label: 'Text to Video',
    description: 'No references. Prompt-only video generation.',
    type: 'text-to-video',
  },
};

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
  const apiKey = getImageApiKey();
  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY or ENHANCOR_API_KEY is not configured');
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

export async function queueNanoBananaImage(input: {
  prompt: string;
  referenceImageUrls: string[];
  aspectRatio: string;
  resolution: string;
  webhookUrl: string;
}) {
  const apiKey = getImageApiKey();
  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY or ENHANCOR_API_KEY is not configured');
  }

  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    webhook_url: input.webhookUrl,
    aspect_ratio: input.aspectRatio,
    resolution: input.resolution,
  };

  if (input.referenceImageUrls.length) {
    payload.input_images = input.referenceImageUrls.slice(0, 14);
  }

  const response = await fetch('https://apireq.enhancor.ai/api/nano-banana-2-new/v1/queue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || `Nano Banana queue failed (${response.status})`);
  }

  const requestId = json?.requestId || json?.request_id || json?.id;
  if (!requestId) throw new Error('Nano Banana did not return a requestId');

  return { requestId: String(requestId), payload, raw: json } satisfies NanoBananaQueueResult;
}

export function getEnhancorBaseUrl() {
  return (process.env.ENHANCOR_BASE_URL || 'https://apireq.enhancor.ai/api').replace(/\/$/, '');
}

export async function queueEnhancorVideo(input: {
  mode: EnhancorVideoMode;
  prompt: string;
  duration: string;
  resolution: string;
  aspectRatio: string;
  webhookUrl: string;
  fastMode: boolean;
  fullAccess: boolean;
  isUncensored: boolean;
  images: string[];
  videos: string[];
  audios: string[];
  products: string[];
  influencers: string[];
  firstFrameImage?: string | null;
  lastFrameImage?: string | null;
  lipsyncingAudio?: string | null;
  multiFramePrompts: Array<{ prompt: string; duration: number }>;
}) {
  const apiKey = process.env.ENHANCOR_API_KEY;
  if (!apiKey) throw new Error('ENHANCOR_API_KEY is not configured');

  const modeMeta = enhancorVideoModes[input.mode];
  const payload: Record<string, unknown> = {
    type: modeMeta.type,
    webhook_url: input.webhookUrl,
    resolution: input.resolution,
    aspect_ratio: input.aspectRatio,
    fast_mode: input.fastMode,
    full_access: input.fullAccess,
    is_uncensored: input.isUncensored,
  };

  if (input.mode !== 'text-to-video') {
    payload.mode = input.mode;
  }

  if (input.mode === 'multi_frame') {
    payload.multi_frame_prompts = input.multiFramePrompts;
    if (input.videos.length) payload.videos = input.videos.slice(0, 3);
    if (input.audios.length) payload.audios = input.audios.slice(0, 3);
  } else {
    payload.prompt = input.prompt;
    payload.duration = input.duration;
  }

  if (input.mode === 'ugc') {
    payload.products = input.products.slice(0, 9);
    payload.influencers = input.influencers.slice(0, 9 - input.products.length);
  }

  if (input.mode === 'multi_reference') {
    payload.images = input.images.slice(0, 9);
    if (input.videos.length) payload.videos = input.videos.slice(0, 3);
    if (input.audios.length) payload.audios = input.audios.slice(0, 3);
  }

  if (input.mode === 'lipsyncing') {
    if (input.videos.length) payload.videos = input.videos.slice(0, 3);
    if (input.audios.length) payload.audios = input.audios.slice(0, 3);
    if (input.lipsyncingAudio) payload.lipsyncing_audio = input.lipsyncingAudio;
  }

  if (input.mode === 'first_n_last_frames') {
    payload.first_frame_image = input.firstFrameImage;
    payload.last_frame_image = input.lastFrameImage;
    if (input.videos.length) payload.videos = input.videos.slice(0, 3);
    if (input.audios.length) payload.audios = input.audios.slice(0, 3);
  }

  const endpointPath = input.mode === 'lipsyncing'
    ? '/enhancor-pro-video/v1/queue'
    : '/enhancor-video-pro/v1/queue';

  const response = await fetch(`${getEnhancorBaseUrl()}${endpointPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || `Enhancor queue failed (${response.status})`);
  }

  const requestId = json?.requestId || json?.request_id || json?.id;
  if (!requestId) throw new Error('Enhancor did not return a requestId');

  return { requestId: String(requestId), payload, raw: json };
}
