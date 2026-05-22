export type Intensity = 'subtle' | 'moderate' | 'strong';

export type VariationConfig = {
  speed: number;
  cropPx: number;
  flipH: boolean;
  brightness: number;
  saturation: number;
  contrast: number;
  gamma: number;
  hueShift: number;
  noiseStrength: number;
  sharpen: number;
  pixelShift: number;
  stripMeta: boolean;
  trimStartMs: number;
  trimEndMs: number;
  crf: number;
  audioVolume: number;
  preset: 'ultrafast' | 'superfast' | 'veryfast' | 'fast';
};

type Range = [number, number];

const ranges: Record<Intensity, {
  speed: Range;
  cropPx: Range;
  flipChance: number;
  brightness: Range;
  saturation: Range;
  contrast: Range;
  gamma: Range;
  hueShift: Range;
  noiseStrength: Range;
  sharpen: Range;
  pixelShift: Range;
  trimMs: Range;
  crf: Range;
  audioVolume: Range;
  presets: VariationConfig['preset'][];
}> = {
  subtle: {
    speed: [0.98, 1.02],
    cropPx: [1, 3],
    flipChance: 0,
    brightness: [-0.02, 0.02],
    saturation: [0.97, 1.03],
    contrast: [0.98, 1.02],
    gamma: [0.98, 1.02],
    hueShift: [-3, 3],
    noiseStrength: [0.2, 0.8],
    sharpen: [0, 0.15],
    pixelShift: [0, 2],
    trimMs: [20, 100],
    crf: [20, 24],
    audioVolume: [0.97, 1.03],
    presets: ['fast', 'veryfast'],
  },
  moderate: {
    speed: [0.95, 1.05],
    cropPx: [2, 6],
    flipChance: 0.3,
    brightness: [-0.04, 0.04],
    saturation: [0.93, 1.07],
    contrast: [0.96, 1.04],
    gamma: [0.96, 1.04],
    hueShift: [-6, 6],
    noiseStrength: [0.6, 1.8],
    sharpen: [0.05, 0.35],
    pixelShift: [1, 4],
    trimMs: [40, 180],
    crf: [19, 26],
    audioVolume: [0.95, 1.05],
    presets: ['veryfast', 'fast', 'superfast'],
  },
  strong: {
    speed: [0.92, 1.08],
    cropPx: [4, 10],
    flipChance: 0.5,
    brightness: [-0.07, 0.07],
    saturation: [0.88, 1.12],
    contrast: [0.93, 1.07],
    gamma: [0.93, 1.07],
    hueShift: [-12, 12],
    noiseStrength: [1.2, 3.2],
    sharpen: [0.15, 0.55],
    pixelShift: [2, 6],
    trimMs: [80, 350],
    crf: [18, 28],
    audioVolume: [0.92, 1.08],
    presets: ['ultrafast', 'superfast', 'veryfast', 'fast'],
  },
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateConfigs(count: number, intensity: Intensity): VariationConfig[] {
  const r = ranges[intensity];
  return Array.from({ length: count }, () => ({
    speed: round3(rand(r.speed[0], r.speed[1])),
    cropPx: randInt(r.cropPx[0], r.cropPx[1]),
    flipH: Math.random() < r.flipChance,
    brightness: round3(rand(r.brightness[0], r.brightness[1])),
    saturation: round3(rand(r.saturation[0], r.saturation[1])),
    contrast: round3(rand(r.contrast[0], r.contrast[1])),
    gamma: round3(rand(r.gamma[0], r.gamma[1])),
    hueShift: round3(rand(r.hueShift[0], r.hueShift[1])),
    noiseStrength: round3(rand(r.noiseStrength[0], r.noiseStrength[1])),
    sharpen: round3(rand(r.sharpen[0], r.sharpen[1])),
    pixelShift: randInt(r.pixelShift[0], r.pixelShift[1]),
    stripMeta: true,
    trimStartMs: randInt(r.trimMs[0], r.trimMs[1]),
    trimEndMs: randInt(r.trimMs[0], r.trimMs[1]),
    crf: randInt(r.crf[0], r.crf[1]),
    audioVolume: round3(rand(r.audioVolume[0], r.audioVolume[1])),
    preset: pick(r.presets),
  }));
}

export function buildFfmpegArgs(config: VariationConfig): string[] {
  const args: string[] = [];

  if (config.trimStartMs > 0) {
    args.push('-ss', (config.trimStartMs / 1000).toFixed(3));
  }

  args.push('-i', 'input.mp4');

  const vf: string[] = [];

  if (config.speed !== 1.0) {
    vf.push(`setpts=${(1 / config.speed).toFixed(4)}*PTS`);
  }

  if (config.cropPx > 0) {
    vf.push(
      `crop=iw-${config.cropPx * 2}:ih-${config.cropPx * 2}:${config.cropPx}:${config.cropPx}`,
      `scale=iw+${config.cropPx * 2}:ih+${config.cropPx * 2}`,
    );
  }

  if (config.flipH) {
    vf.push('hflip');
  }

  const eq: string[] = [];
  if (config.brightness !== 0) eq.push(`brightness=${config.brightness}`);
  if (config.saturation !== 1.0) eq.push(`saturation=${config.saturation}`);
  if (config.contrast !== 1.0) eq.push(`contrast=${config.contrast}`);
  if (config.gamma !== 1.0) eq.push(`gamma=${config.gamma}`);
  if (eq.length > 0) vf.push(`eq=${eq.join(':')}`);

  if (config.hueShift !== 0) {
    vf.push(`hue=h=${config.hueShift}`);
  }

  if (config.noiseStrength > 0) {
    vf.push(`noise=alls=${config.noiseStrength}:allf=t+u`);
  }

  if (config.sharpen > 0) {
    vf.push(`unsharp=3:3:${config.sharpen}:3:3:0`);
  }

  if (config.pixelShift > 0) {
    vf.push(
      `crop=iw-${config.pixelShift}:ih-${config.pixelShift}:${config.pixelShift}:0`,
      `scale=iw+${config.pixelShift}:ih+${config.pixelShift}`,
    );
  }

  if (vf.length > 0) args.push('-vf', vf.join(','));

  const af: string[] = [];
  if (config.speed !== 1.0) af.push(`atempo=${config.speed}`);
  if (config.audioVolume !== 1.0) af.push(`volume=${config.audioVolume}`);
  if (af.length > 0) args.push('-af', af.join(','));

  if (config.stripMeta) args.push('-map_metadata', '-1');

  args.push(
    '-c:v', 'libx264',
    '-preset', config.preset,
    '-crf', String(config.crf),
    '-c:a', 'aac',
    '-movflags', '+faststart',
    '-y', 'output.mp4',
  );

  return args;
}

export const intensityDescriptions: Record<Intensity, { label: string; desc: string }> = {
  subtle: {
    label: 'Subtle',
    desc: 'Invisible to the eye. Micro pixel-level changes only.',
  },
  moderate: {
    label: 'Moderate',
    desc: 'Barely noticeable. Stronger shifts + occasional flip.',
  },
  strong: {
    label: 'Strong',
    desc: 'Maximum uniqueness. Aggressive mods, safest against detection.',
  },
};
