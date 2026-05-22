import type { EnhancorVideoMode, GenerationMode } from './providers';

export type CostEstimate = {
  credits: number | null;
  label: string;
  detail: string;
};

type VideoEstimateInput = {
  mode: EnhancorVideoMode;
  duration: string | number;
  resolution: string;
  fastMode: boolean;
};

const videoStandardRates: Record<string, { fast?: number; standard: number }> = {
  '480p': { fast: 67.6, standard: 83.9 },
  '720p': { fast: 145.3, standard: 180.6 },
  '1080p': { standard: 405.5 },
};

const videoDiscountRates: Record<string, { fast?: number; standard: number }> = {
  '480p': { fast: 40.1, standard: 51.1 },
  '720p': { fast: 86.4, standard: 109.9 },
  '1080p': { standard: 246.7 },
};

function isDiscountedVideoMode(mode: EnhancorVideoMode) {
  return mode === 'multi_reference' || mode === 'multi_frame' || mode === 'ugc';
}

export function estimateVideoCost(input: VideoEstimateInput): CostEstimate {
  const duration = Math.max(4, Math.min(15, Number(input.duration) || 5));
  const rates = isDiscountedVideoMode(input.mode) ? videoDiscountRates : videoStandardRates;
  const resolutionRates = rates[input.resolution] ?? rates['720p'];
  const speed = input.fastMode && resolutionRates.fast ? 'fast' : 'standard';
  const rate = speed === 'fast' ? resolutionRates.fast! : resolutionRates.standard;
  const credits = Math.round(rate * duration);

  return {
    credits,
    label: `${credits.toLocaleString('fr-FR')} credits est.`,
    detail: `${duration}s x ${rate} credits/s (${input.resolution}, ${speed})`,
  };
}

export function estimateImageCost(input: { resolution: string }): CostEstimate {
  return {
    credits: null,
    label: 'Cost after callback',
    detail: `Nano Banana returns the exact cost after generation (${input.resolution}).`,
  };
}

export function estimateGenerationCost(input: {
  mode: GenerationMode;
  videoMode: EnhancorVideoMode;
  duration: string | number;
  resolution: string;
  imageResolution: string;
  fastMode: boolean;
}) {
  if (input.mode === 'video') {
    return estimateVideoCost({
      mode: input.videoMode,
      duration: input.duration,
      resolution: input.resolution,
      fastMode: input.fastMode,
    });
  }

  return estimateImageCost({ resolution: input.imageResolution });
}

export function creditsFromConfig(config: unknown) {
  const data = config as any;
  const candidates = [
    data?.actualCost,
    data?.webhook?.cost,
    data?.external?.cost,
    data?.external?.creditsUsed,
    data?.estimatedCost?.credits,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return null;
}
