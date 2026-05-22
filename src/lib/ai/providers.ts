export type GenerationMode = 'image' | 'video';

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
