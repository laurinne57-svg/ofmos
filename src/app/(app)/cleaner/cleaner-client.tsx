'use client';

import { useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import JSZip from 'jszip';

import {
  Archive,
  CheckCircle,
  Download01,
  FileShield02,
  Image03,
  RefreshCcw02,
  ShieldTick,
  Trash01,
  UploadCloud01,
  VideoRecorder,
} from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CleanStatus = 'queued' | 'processing' | 'done' | 'failed';

type CleanItem = {
  id: string;
  file: File;
  kind: 'image' | 'video' | 'unsupported';
  status: CleanStatus;
  output?: Blob;
  outputName?: string;
  beforeBytes: number;
  afterBytes?: number;
  progress?: number;
  stage?: string;
  error?: string;
};

type VideoCleanMode = 'fast' | 'repair';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Cleaning failed';
}

function detectKind(file: File): CleanItem['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return 'unsupported';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function cleanName(name: string, fallbackExt: string) {
  const withoutExt = name.replace(/\.[^.]+$/, '');
  return `${withoutExt}.clean.${fallbackExt}`;
}

async function cleanImage(file: File, outputType: 'image/jpeg' | 'image/png' | 'image/webp', quality: number) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' as ImageOrientation });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Could not encode cleaned image'));
      },
      outputType,
      quality,
    );
  });

  const ext = outputType === 'image/png' ? 'png' : outputType === 'image/webp' ? 'webp' : 'jpg';
  return { blob, ext };
}

async function loadFfmpeg(ffmpeg: FFmpeg) {
  if (ffmpeg.loaded) return;

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
}

function inputExtension(file: File) {
  if (file.type === 'video/mp4') return 'mp4';
  if (file.type === 'video/quicktime') return 'mov';
  if (file.type === 'video/webm') return 'webm';
  const ext = file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return ext || 'mp4';
}

function videoOutputName(file: File) {
  return { name: cleanName(file.name, 'mp4'), ext: 'mp4' };
}

async function cleanVideo(
  ffmpeg: FFmpeg,
  file: File,
  mode: VideoCleanMode,
  onProgress: (patch: Partial<CleanItem>) => void,
) {
  onProgress({ stage: 'Loading FFmpeg engine', progress: 3 });
  await loadFfmpeg(ffmpeg);

  const logs: string[] = [];
  const logHandler = ({ message }: { message: string }) => {
    if (message) logs.push(message);
    if (logs.length > 12) logs.shift();
  };
  const progressHandler = ({ progress }: { progress: number }) => {
    if (Number.isFinite(progress)) {
      onProgress({ progress: Math.min(92, Math.max(10, Math.round(progress * 90))) });
    }
  };
  ffmpeg.on('log', logHandler);
  ffmpeg.on('progress', progressHandler);

  const inputExt = inputExtension(file);
  const inputName = `input-${crypto.randomUUID()}.${inputExt}`;
  const { name: outputName, ext } = videoOutputName(file);
  const outputNameFs = `output-${crypto.randomUUID()}.${ext}`;

  onProgress({ stage: 'Copying file into memory', progress: 6 });
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = [
    '-i',
    inputName,
    '-map',
    '0:v:0',
    '-map',
    '0:a?',
    '-dn',
    '-sn',
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-c',
    'copy',
  ];

  if (ext === 'mp4') {
    args.push('-movflags', '+faststart');
  }

  args.push('-y', outputNameFs);

  const streamCopyTimeout = Math.min(90_000, Math.max(20_000, file.size / 1024 / 1024 * 10_000));
  const repairTimeout = Math.min(180_000, Math.max(45_000, file.size / 1024 / 1024 * 25_000));

  try {
    onProgress({ stage: 'Fast metadata strip', progress: 10 });
    const code = await ffmpeg.exec(args, streamCopyTimeout);
    if (code !== 0) {
      throw new Error(`FFmpeg exited with code ${code}`);
    }
  } catch (error) {
    if (mode === 'fast') {
      throw new Error([
        `Fast metadata strip failed or timed out after ${Math.round(streamCopyTimeout / 1000)}s.`,
        `Try Repair mode for this file.`,
        getErrorMessage(error),
        logs.length ? `FFmpeg: ${logs.slice(-3).join(' | ')}` : '',
      ].filter(Boolean).join(' '));
    }

    try {
      onProgress({ stage: 'Repair re-encode', progress: 15 });
      const repairCode = await ffmpeg.exec([
        '-i',
        inputName,
        '-map',
        '0:v:0',
        '-map',
        '0:a?',
        '-dn',
        '-sn',
        '-map_metadata',
        '-1',
        '-map_chapters',
        '-1',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        '-y',
        outputNameFs,
      ], repairTimeout);
      if (repairCode !== 0) {
        throw new Error(`FFmpeg exited with code ${repairCode}`);
      }
    } catch (fallbackError) {
      throw new Error([
        `Stream copy failed: ${getErrorMessage(error)}`,
        `Re-encode failed: ${getErrorMessage(fallbackError)}`,
        logs.length ? `FFmpeg: ${logs.slice(-4).join(' | ')}` : '',
      ].filter(Boolean).join(' / '));
    }
  } finally {
    ffmpeg.off('log', logHandler);
    ffmpeg.off('progress', progressHandler);
  }

  onProgress({ stage: 'Preparing output', progress: 94 });
  const data = await ffmpeg.readFile(outputNameFs);
  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputNameFs).catch(() => undefined);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const outputBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(outputBuffer).set(bytes);

  return {
    blob: new Blob([outputBuffer], { type: ext === 'webm' ? 'video/webm' : 'video/mp4' }),
    outputName,
  };
}

export function CleanerClient() {
  const ffmpegRef = useRef(new FFmpeg());
  const [items, setItems] = useState<CleanItem[]>([]);
  const [running, setRunning] = useState(false);
  const [imageType, setImageType] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState(0.95);
  const [videoMode, setVideoMode] = useState<VideoCleanMode>('fast');
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const cleanable = items.filter((item) => item.kind !== 'unsupported').length;
    const images = items.filter((item) => item.kind === 'image').length;
    const videos = items.filter((item) => item.kind === 'video').length;
    const done = items.filter((item) => item.status === 'done').length;
    const failed = items.filter((item) => item.status === 'failed').length;
    const before = items.reduce((sum, item) => sum + item.beforeBytes, 0);
    const after = items.reduce((sum, item) => sum + (item.afterBytes ?? 0), 0);
    return { cleanable, images, videos, done, failed, before, after };
  }, [items]);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      kind: detectKind(file),
      status: detectKind(file) === 'unsupported' ? 'failed' as const : 'queued' as const,
      beforeBytes: file.size,
      error: detectKind(file) === 'unsupported' ? 'Unsupported file type' : undefined,
    }));
    setItems((current) => [...next, ...current]);
  }

  function patchItem(id: string, patch: Partial<CleanItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function runCleaner() {
    if (running) return;
    setRunning(true);

    const queue = items.filter((item) => item.kind !== 'unsupported' && item.status !== 'done');

    for (const item of queue) {
      patchItem(item.id, { status: 'processing', error: undefined, progress: 0, stage: 'Starting' });
      try {
        if (item.kind === 'image') {
          patchItem(item.id, { stage: 'Re-encoding image', progress: 20 });
          const result = await cleanImage(item.file, imageType, quality);
          patchItem(item.id, {
            status: 'done',
            output: result.blob,
            outputName: cleanName(item.file.name, result.ext),
            afterBytes: result.blob.size,
            progress: 100,
            stage: 'Cleaned',
          });
        } else if (item.kind === 'video') {
          const result = await cleanVideo(ffmpegRef.current, item.file, videoMode, (patch) => patchItem(item.id, patch));
          patchItem(item.id, {
            status: 'done',
            output: result.blob,
            outputName: result.outputName,
            afterBytes: result.blob.size,
            progress: 100,
            stage: 'Cleaned',
          });
        }
      } catch (error) {
        ffmpegRef.current.terminate();
        ffmpegRef.current = new FFmpeg();
        patchItem(item.id, {
          status: 'failed',
          progress: 0,
          stage: 'Failed',
          error: error instanceof Error ? error.message : 'Cleaning failed',
        });
      }
    }

    setRunning(false);
  }

  async function downloadZip() {
    const done = items.filter((item) => item.status === 'done' && item.output && item.outputName);
    if (done.length === 0) return;

    const zip = new JSZip();
    for (const item of done) {
      zip.file(item.outputName!, item.output!);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cleaned-media-${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl gradient-blue p-6 text-white card-elevated md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_48%)]" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-white/70">Privacy workflow</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Cleaner</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
              Supprime les métadonnées des images et vidéos en masse. Traitement local dans le navigateur, sans upload serveur.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatPod label="Files" value={items.length} />
            <StatPod label="Done" value={stats.done} />
            <StatPod label="Failed" value={stats.failed} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <div className="space-y-4">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Batch input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:bg-muted/50"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  addFiles(event.dataTransfer.files);
                }}
              >
                <UploadCloud01 className="mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-semibold">Drop videos here</p>
                <p className="mt-1 text-sm text-muted-foreground">MP4, MOV, WEBM. Images are supported too, but video cleaning is the default workflow.</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={(event) => addFiles(event.target.files)}
                />
              </div>

              {(stats.videos > 0 || stats.cleanable === 0) && (
              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold">Video mode</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['fast', 'Fast strip'],
                    ['repair', 'Repair'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVideoMode(value as VideoCleanMode)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        videoMode === value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Fast strip nettoie sans re-encoder. Repair tente un re-encode si le fichier est cassé, mais c'est plus lent.
                </p>
              </div>
              )}

              {stats.images > 0 && (
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Image output settings</summary>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ['image/jpeg', 'JPG'],
                      ['image/png', 'PNG'],
                      ['image/webp', 'WEBP'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setImageType(value as typeof imageType)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                          imageType === value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {imageType !== 'image/png' && (
                    <label className="mt-3 block text-sm">
                      Quality: {Math.round(quality * 100)}%
                      <input
                        type="range"
                        min={0.7}
                        max={1}
                        step={0.01}
                        value={quality}
                        onChange={(event) => setQuality(Number(event.target.value))}
                        className="mt-2 w-full"
                      />
                    </label>
                  )}
                </details>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={runCleaner} disabled={running || stats.cleanable === 0} className="btn-3d">
                  <ShieldTick className="mr-2 h-4 w-4" />
                  {running ? 'Cleaning...' : 'Clean all'}
                </Button>
                <Button variant="outline" onClick={downloadZip} disabled={stats.done === 0}>
                  <Archive className="mr-2 h-4 w-4" />
                  Download ZIP
                </Button>
              </div>

              <Button variant="ghost" onClick={() => setItems([])} disabled={running || items.length === 0} className="w-full">
                <Trash01 className="mr-2 h-4 w-4" />
                Clear list
              </Button>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>What gets removed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Images are decoded then re-encoded through Canvas, which drops EXIF/GPS/camera metadata.</p>
              <p>Videos use fast remux metadata stripping by default. Repair mode is optional for broken files.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Queue</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{stats.videos} videos</span>
                {stats.images > 0 && <span>{stats.images} images</span>}
                <span>{formatBytes(stats.before)} in</span>
                {stats.after > 0 && <span>{formatBytes(stats.after)} out</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
                <FileShield02 className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-lg font-semibold">No files yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add a batch to start cleaning metadata.</p>
              </div>
            ) : (
              <div className="divide-y rounded-2xl border">
                {items.map((item) => (
                  <div key={item.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
                        {item.kind === 'video' ? (
                          <VideoRecorder className="h-5 w-5 text-muted-foreground" />
                        ) : item.kind === 'image' ? (
                          <Image03 className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <FileShield02 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.file.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatBytes(item.beforeBytes)}
                          {item.afterBytes ? ` -> ${formatBytes(item.afterBytes)}` : ''}
                          {item.stage ? ` · ${item.stage}` : ''}
                        </p>
                        {item.status === 'processing' && (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-300"
                              style={{ width: `${Math.max(5, item.progress ?? 5)}%` }}
                            />
                          </div>
                        )}
                        {item.error && (
                          <p className="mt-1 line-clamp-2 text-xs text-destructive" title={item.error}>
                            {item.error}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <StatusBadge status={item.status} />
                      {item.output && item.outputName && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = URL.createObjectURL(item.output!);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = item.outputName!;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download01 className="mr-2 h-3.5 w-3.5" />
                          File
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatPod({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/12 px-4 py-3 ring-1 ring-white/18 backdrop-blur-sm">
      <p className="text-xs font-medium text-white/68">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CleanStatus }) {
  if (status === 'done') {
    return (
      <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Done
      </Badge>
    );
  }

  if (status === 'processing') {
    return (
      <Badge variant="outline">
        <RefreshCcw02 className="mr-1 h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }

  if (status === 'failed') {
    return <Badge variant="destructive">Failed</Badge>;
  }

  return <Badge variant="outline">Queued</Badge>;
}
