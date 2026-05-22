'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';

import { Download01, Plus } from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import {
  type Intensity,
  type VariationConfig,
  buildFfmpegArgs,
  generateConfigs,
  intensityDescriptions,
} from '@/lib/video/variation-presets';
import { saveVariation } from './actions';
import { addPosting } from '../content/actions';

type Source = { id: string; title: string; storageUrl: string; durationSeconds: number | null };
type Variation = {
  id: string; createdAt: Date; status: string; storageUrl: string | null;
  config: any; errorMessage: string | null; sourceVideoId: string;
  sourceTitle: string; postingCount: number;
};

type StepStatus = 'waiting' | 'loading' | 'processing' | 'uploading' | 'done' | 'failed';
type StepError = string | null;

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

export function VideoToolsClient({ sources, variations }: { sources: Source[]; variations: Variation[] }) {
  const searchParams = useSearchParams();
  const initialSourceId = searchParams.get('source') ?? '';
  const [selectedId, setSelectedId] = useState(initialSourceId);
  const [count, setCount] = useState(3);
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [generating, setGenerating] = useState(false);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [stepErrors, setStepErrors] = useState<StepError[]>([]);
  const [results, setResults] = useState<{ url: string; config: VariationConfig }[]>([]);
  const [error, setError] = useState('');
  const [postOpen, setPostOpen] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const ffmpegRef = useRef<any>(null);

  const selectedSource = sources.find((s) => s.id === selectedId);

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

  async function handleGenerate() {
    if (!selectedSource) return;
    setGenerating(true);
    setError('');
    setResults([]);

    const configs = generateConfigs(count, intensity);
    const statuses: StepStatus[] = configs.map(() => 'waiting');
    const errors: StepError[] = configs.map(() => null);
    setSteps([...statuses]);
    setStepErrors([...errors]);

    try {
      statuses[0] = 'loading';
      setSteps([...statuses]);
      const ffmpeg = await loadFfmpeg();
      const { fetchFile } = await import('@ffmpeg/util');

      const sourceData = await fetchFile(selectedSource.storageUrl);
      await ffmpeg.writeFile('input.mp4', sourceData);

      const supabase = createClient();
      const completed: { url: string; config: VariationConfig }[] = [];

      for (let i = 0; i < configs.length; i++) {
        statuses[i] = 'processing';
        setSteps([...statuses]);

        try {
          try { await ffmpeg.deleteFile('output.mp4'); } catch {}

          const args = buildFfmpegArgs(configs[i]);
          await ffmpeg.exec(args);

          const data = await ffmpeg.readFile('output.mp4');
          const blob = new Blob([data], { type: 'video/mp4' });

          statuses[i] = 'uploading';
          setSteps([...statuses]);

          const path = `variations/${selectedSource.id}/${Date.now()}-v${i + 1}.mp4`;
          const { error: uploadErr } = await supabase.storage
            .from('content')
            .upload(path, blob, { cacheControl: '3600', upsert: false });

          if (uploadErr) throw new Error(uploadErr.message);

          const { data: urlData } = supabase.storage.from('content').getPublicUrl(path);

          await saveVariation({
            sourceVideoId: selectedSource.id,
            storageUrl: urlData.publicUrl,
            config: configs[i],
          });

          completed.push({ url: urlData.publicUrl, config: configs[i] });
          statuses[i] = 'done';
        } catch (err: any) {
          statuses[i] = 'failed';
          errors[i] = err?.message ?? 'Unknown processing error';
          setStepErrors([...errors]);
          console.error(`Variation ${i + 1} failed:`, err);
        }

        setSteps([...statuses]);
        setResults([...completed]);
      }

      try { await ffmpeg.deleteFile('input.mp4'); } catch {}
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Repurpose Bot</h1>
        <p className="text-sm text-muted-foreground">
          Generate unique versions from one owned source video with pixel, audio, encoding, and metadata changes.
        </p>
      </div>

      <Card className="card-elevated">
        <CardContent className="pt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Video</Label>
              {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No videos yet. <Link href="/content" className="underline text-primary">Add one first</Link>
                </p>
              ) : (
                <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Select a video" /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Variations: {count}</Label>
              <input
                type="range" min={1} max={10} value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1</span><span>5</span><span>10</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Intensity</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['subtle', 'moderate', 'strong'] as Intensity[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(level)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    intensity === level
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="text-sm font-medium">{intensityDescriptions[level].label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{intensityDescriptions[level].desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-semibold">Modification stack</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Each variation receives a randomized combination of trim, crop+rescale, speed, brightness, saturation,
              contrast, gamma, hue, temporal noise, sharpen, audio volume, CRF, encoder preset, and metadata stripping.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['trim', 'crop+scale', 'speed', 'color', 'hue', 'noise', 'sharpen', 'audio', 'crf', 'metadata'].map((item) => (
                <Badge key={item} variant="outline" className="text-[10px]">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedId}
            className="btn-3d gradient-blue text-white w-full sm:w-auto"
          >
            {generating ? 'Generating...' : `Generate ${count} Variation${count > 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((status, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-6">#{i + 1}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          status === 'done' ? 'bg-green-500 w-full'
                          : status === 'failed' ? 'bg-red-500 w-full'
                          : status === 'uploading' ? 'bg-blue-500 w-[85%]'
                          : status === 'processing' ? 'bg-blue-500 w-[50%] animate-pulse'
                          : status === 'loading' ? 'bg-blue-500 w-[20%] animate-pulse'
                          : 'w-0'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right capitalize">{status}</span>
                  </div>
                  {stepErrors[i] && (
                    <p className="pl-9 text-xs text-red-600 dark:text-red-400">{stepErrors[i]}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {results.length} Variation{results.length > 1 ? 's' : ''} Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Variation #{i + 1}</span>
                    <a href={r.url} download={`variation-${i + 1}.mp4`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Download01 className="h-3.5 w-3.5" /> Download
                      </Button>
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.config.flipH && <Badge variant="outline" className="text-[10px]">flipped</Badge>}
                    <Badge variant="outline" className="text-[10px]">
                      speed {r.config.speed}x
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      crop {r.config.cropPx}px
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      trim {r.config.trimStartMs}ms
                    </Badge>
                    {r.config.hueShift !== 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        hue {r.config.hueShift > 0 ? '+' : ''}{r.config.hueShift}°
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      crf {r.config.crf}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      noise {r.config.noiseStrength}
                    </Badge>
                    {r.config.sharpen > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        sharp {r.config.sharpen}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {r.config.preset}
                    </Badge>
                    {r.config.audioVolume !== 1 && (
                      <Badge variant="outline" className="text-[10px]">
                        vol {r.config.audioVolume}x
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {variations.length > 0 && (
        <>
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold">History</h2>
            <p className="text-sm text-muted-foreground">{variations.length} variations generated</p>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Postings</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {variations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link href={`/content/${v.sourceVideoId}`} className="text-sm font-medium text-primary hover:underline">
                        {v.sourceTitle}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${statusColors[v.status] ?? ''}`}>{v.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {v.config ? (
                        <div className="flex flex-wrap gap-1">
                          {v.config.speed && (
                            <Badge variant="outline" className="text-[10px]">{v.config.speed}x</Badge>
                          )}
                          {v.config.flipH && (
                            <Badge variant="outline" className="text-[10px]">flip</Badge>
                          )}
                          {v.config.cropPx && (
                            <Badge variant="outline" className="text-[10px]">crop:{v.config.cropPx}px</Badge>
                          )}
                          {v.config.crf && (
                            <Badge variant="outline" className="text-[10px]">crf:{v.config.crf}</Badge>
                          )}
                          {v.config.hueShift !== undefined && (
                            <Badge variant="outline" className="text-[10px]">hue:{v.config.hueShift}</Badge>
                          )}
                          {v.config.noiseStrength && (
                            <Badge variant="outline" className="text-[10px]">noise:{v.config.noiseStrength}</Badge>
                          )}
                        </div>
                      ) : '--'}
                    </TableCell>
                    <TableCell>{Number(v.postingCount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </TableCell>
                    <TableCell>
                      {v.status === 'done' && (
                        <Dialog open={postOpen === v.id} onOpenChange={(open) => setPostOpen(open ? v.id : null)}>
                          <DialogTrigger render={<Button variant="outline" size="sm" />}>
                            <Plus className="mr-1 h-3 w-3" /> Post
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Log Posting</DialogTitle></DialogHeader>
                            <form
                              action={async (fd) => {
                                fd.set('variationId', v.id);
                                await addPosting(fd);
                                setPostOpen(null);
                              }}
                              className="space-y-4"
                            >
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Platform</Label>
                                  <Input name="platform" required placeholder="e.g. instagram" />
                                </div>
                                <div className="space-y-2">
                                  <Label>Account</Label>
                                  <Input name="accountHandle" placeholder="@handle" />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Post URL</Label>
                                <Input name="postUrl" placeholder="Link to the post" />
                              </div>
                              <DialogFooter>
                                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                                <Button type="submit">Save</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
