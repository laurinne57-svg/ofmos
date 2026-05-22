'use client';

import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type VariationConfig = {
  speed: number;
  cropPadding: number;
  flipHorizontal: boolean;
  adjustBrightness: number;
  adjustSaturation: number;
  stripMetadata: boolean;
  pixelShift: number;
};

const defaultConfig: VariationConfig = {
  speed: 1.0,
  cropPadding: 0,
  flipHorizontal: false,
  adjustBrightness: 0,
  adjustSaturation: 1.0,
  stripMetadata: true,
  pixelShift: 0,
};

export function FfmpegEngine({
  sourceUrl,
  onVariationCreated,
}: {
  sourceUrl: string;
  onVariationCreated?: (blob: Blob, config: VariationConfig) => void;
}) {
  const [config, setConfig] = useState<VariationConfig>(defaultConfig);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const ffmpegRef = useRef<any>(null);

  const loadFfmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  async function processVideo() {
    setProcessing(true);
    setProgress('Loading ffmpeg...');

    try {
      const ffmpeg = await loadFfmpeg();
      const { fetchFile } = await import('@ffmpeg/util');

      setProgress('Downloading source...');
      const sourceData = await fetchFile(sourceUrl);
      await ffmpeg.writeFile('input.mp4', sourceData);

      const filters: string[] = [];

      if (config.speed !== 1.0) {
        const pts = 1 / config.speed;
        filters.push(`setpts=${pts}*PTS`);
      }

      if (config.cropPadding > 0) {
        filters.push(`crop=iw-${config.cropPadding * 2}:ih-${config.cropPadding * 2}:${config.cropPadding}:${config.cropPadding}`);
      }

      if (config.flipHorizontal) {
        filters.push('hflip');
      }

      if (config.adjustBrightness !== 0) {
        filters.push(`eq=brightness=${config.adjustBrightness / 100}`);
      }

      if (config.adjustSaturation !== 1.0) {
        filters.push(`eq=saturation=${config.adjustSaturation}`);
      }

      if (config.pixelShift > 0) {
        filters.push(`pad=iw+${config.pixelShift}:ih+${config.pixelShift}:${config.pixelShift}:${config.pixelShift}:black`);
      }

      const args = ['-i', 'input.mp4'];

      if (filters.length > 0) {
        args.push('-vf', filters.join(','));
      }

      if (config.speed !== 1.0) {
        args.push('-af', `atempo=${config.speed}`);
      }

      if (config.stripMetadata) {
        args.push('-map_metadata', '-1');
      }

      args.push('-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', 'output.mp4');

      setProgress('Processing variation...');
      await ffmpeg.exec(args);

      setProgress('Reading output...');
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setProgress('Done!');
      onVariationCreated?.(blob, config);
    } catch (err: any) {
      setProgress(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variation Engine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Speed ({config.speed}x)</Label>
            <Input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={config.speed}
              onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Crop Padding ({config.cropPadding}px)</Label>
            <Input
              type="range"
              min="0"
              max="50"
              step="2"
              value={config.cropPadding}
              onChange={(e) => setConfig({ ...config, cropPadding: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Brightness ({config.adjustBrightness})</Label>
            <Input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={config.adjustBrightness}
              onChange={(e) => setConfig({ ...config, adjustBrightness: parseInt(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Saturation ({config.adjustSaturation}x)</Label>
            <Input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={config.adjustSaturation}
              onChange={(e) => setConfig({ ...config, adjustSaturation: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Pixel Shift ({config.pixelShift}px)</Label>
            <Input
              type="range"
              min="0"
              max="10"
              step="1"
              value={config.pixelShift}
              onChange={(e) => setConfig({ ...config, pixelShift: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.flipHorizontal}
              onChange={(e) => setConfig({ ...config, flipHorizontal: e.target.checked })}
              className="rounded"
            />
            Flip horizontal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.stripMetadata}
              onChange={(e) => setConfig({ ...config, stripMetadata: e.target.checked })}
              className="rounded"
            />
            Strip metadata
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={processVideo} disabled={processing}>
            {processing ? 'Processing...' : 'Generate Variation'}
          </Button>
          {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
        </div>

        {resultUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Result</p>
            <video src={resultUrl} controls className="w-full rounded-md max-h-[300px]" />
            <a href={resultUrl} download="variation.mp4">
              <Button variant="outline" size="sm">Download</Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
