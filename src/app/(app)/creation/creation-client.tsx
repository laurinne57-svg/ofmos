'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Download01,
  FilterLines,
  Grid01,
  Hash01,
  Image03,
  ImagePlus,
  MagicWand02,
  PlayCircle,
  SearchLg,
  Sliders04,
  Stars02,
  Upload04,
  VideoRecorder,
} from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createCreationJob } from './actions';

type CreationData = Awaited<ReturnType<typeof import('@/lib/db/queries/creation').getCreationData>>;
type Mode = 'image' | 'video';

export function CreationClient({ data }: { data: CreationData }) {
  const [mode, setMode] = useState<Mode>('image');
  const [prompt, setPrompt] = useState('');
  const [characterId, setCharacterId] = useState(data.characters[0]?.id ?? '');
  const [decorId, setDecorId] = useState(data.decors[0]?.id ?? '');
  const [outputCount, setOutputCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [strength, setStrength] = useState('balanced');
  const [model, setModel] = useState('nano-banana');

  const selectedCharacter = data.characters.find((character) => character.id === characterId) ?? null;
  const selectedDecor = data.decors.find((decor) => decor.id === decorId) ?? null;
  const characterRefs = selectedCharacter ? data.references.filter((ref) => ref.characterId === selectedCharacter.id) : [];
  const decorRefs = selectedDecor ? data.references.filter((ref) => ref.environmentId === selectedDecor.id) : [];

  const promptPreview = useMemo(() => {
    const chips = [];
    if (selectedCharacter) chips.push(`#${selectedCharacter.handle}`);
    if (selectedDecor) chips.push(`#${selectedDecor.handle}`);
    return `${chips.join(' ')} ${prompt}`.trim();
  }, [selectedCharacter, selectedDecor, prompt]);

  return (
    <div className="-m-6 flex min-h-[calc(100vh-4rem)] bg-[#070807] text-white">
      <CreationRail mode={mode} onModeChange={setMode} />

      <aside className="w-[430px] shrink-0 border-r border-white/10 bg-[#101110] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">Create</p>
            <h1 className="mt-1 text-2xl font-bold">{mode === 'image' ? 'Image Generator' : 'Video Generator'}</h1>
          </div>
          <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
            Tutorials
          </Button>
        </div>

        <form action={createCreationJob} className="space-y-3">
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="characterId" value={characterId} />
          <input type="hidden" name="decorId" value={decorId} />
          <input type="hidden" name="outputCount" value={outputCount} />
          <input type="hidden" name="aspectRatio" value={aspectRatio} />
          <input type="hidden" name="strength" value={strength} />
          <input type="hidden" name="model" value={model} />

          <PanelBlock>
            <div className="grid grid-cols-2 gap-2">
              <ModeButton active={mode === 'image'} onClick={() => setMode('image')}>
                <Image03 className="h-4 w-4" />
                Image
              </ModeButton>
              <ModeButton active={mode === 'video'} onClick={() => setMode('video')}>
                <VideoRecorder className="h-4 w-4" />
                Video
              </ModeButton>
            </div>
          </PanelBlock>

          <PanelBlock>
            <Label className="text-white/80">Character</Label>
            <Select value={characterId} onValueChange={(value) => setCharacterId(value ?? '')}>
              <SelectTrigger className="mt-2 w-full border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Select #character" />
              </SelectTrigger>
              <SelectContent>
                {data.characters.map((character) => (
                  <SelectItem key={character.id} value={character.id}>
                    #{character.handle} · {character.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ReferenceStrip references={characterRefs} empty="No character refs yet" />
          </PanelBlock>

          <PanelBlock>
            <Label className="text-white/80">Décor</Label>
            <Select value={decorId} onValueChange={(value) => setDecorId(value ?? '')}>
              <SelectTrigger className="mt-2 w-full border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Select #decor" />
              </SelectTrigger>
              <SelectContent>
                {data.decors.map((decor) => (
                  <SelectItem key={decor.id} value={decor.id}>
                    #{decor.handle} · {decor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ReferenceStrip references={decorRefs} empty="No decor refs yet" />
          </PanelBlock>

          <PanelBlock>
            <div className="flex items-center justify-between">
              <Label className="text-white/80">Prompt</Label>
              <span className="text-xs text-white/35">Use #ana #chambre1</span>
            </div>
            <Textarea
              name="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              placeholder="Décris la scène, le cadrage, la pose, la lumière, le style..."
              className="mt-3 border-white/10 bg-black/30 text-white placeholder:text-white/30"
              required
            />
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-white/45">
                <Hash01 className="h-3.5 w-3.5" />
                Prompt resolved
              </div>
              <p className="line-clamp-3 text-sm text-white/75">{promptPreview || 'No prompt yet'}</p>
            </div>
          </PanelBlock>

          <div className="grid grid-cols-2 gap-3">
            <PanelBlock>
              <Label className="text-white/80">Output</Label>
              <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value ?? '9:16')}>
                <SelectTrigger className="mt-2 w-full border-white/10 bg-black/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 vertical</SelectItem>
                  <SelectItem value="4:5">4:5 feed</SelectItem>
                  <SelectItem value="1:1">1:1 square</SelectItem>
                  <SelectItem value="16:9">16:9 wide</SelectItem>
                </SelectContent>
              </Select>
            </PanelBlock>
            <PanelBlock>
              <Label className="text-white/80">Coherence</Label>
              <Select value={strength} onValueChange={(value) => setStrength(value ?? 'balanced')}>
                <SelectTrigger className="mt-2 w-full border-white/10 bg-black/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict refs</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </PanelBlock>
          </div>

          <PanelBlock>
            <Label className="text-white/80">Model</Label>
            <Select value={model} onValueChange={(value) => setModel(value ?? 'nano-banana')}>
              <SelectTrigger className="mt-2 w-full border-white/10 bg-black/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nano-banana">Nano Banana</SelectItem>
                <SelectItem value="nano-banana-pro">Nano Banana Pro</SelectItem>
                <SelectItem value="nano-banana-2">Nano Banana 2</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs leading-5 text-white/35">
              Image mode sends character + decor references to the backend provider. Video mode is prepared but needs the video API adapter.
            </p>
          </PanelBlock>

          <div className="sticky bottom-0 -mx-4 border-t border-white/10 bg-[#101110]/95 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-2">
              <button
                type="button"
                className="h-10 w-10 rounded-xl text-xl text-white/60 hover:bg-white/10"
                onClick={() => setOutputCount(Math.max(1, outputCount - 1))}
              >
                -
              </button>
              <span className="text-sm font-semibold">{outputCount} / 4</span>
              <button
                type="button"
                className="h-10 w-10 rounded-xl text-xl text-white/60 hover:bg-white/10"
                onClick={() => setOutputCount(Math.min(4, outputCount + 1))}
              >
                +
              </button>
            </div>
            <GenerateButton />
          </div>
        </form>
      </aside>

      <main className="min-w-0 flex-1 p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button className="rounded-2xl bg-white px-5 text-black hover:bg-white/90">
              <Grid01 className="mr-2 h-4 w-4" />
              Unsorted
            </Button>
            <Button variant="ghost" className="text-white/55 hover:bg-white/10 hover:text-white">Labels</Button>
            <Button variant="ghost" className="text-white/55 hover:bg-white/10 hover:text-white">Folders</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <FilterLines className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <SearchLg className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 text-sm font-medium text-white/45">
          <span className="h-5 w-5 rounded-md border border-white/20" />
          This Month
        </div>

        <GenerationGrid jobs={data.jobs} />
      </main>
    </div>
  );
}

function CreationRail({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  const items = [
    { label: 'Image', mode: 'image' as const, icon: Image03 },
    { label: 'Video', mode: 'video' as const, icon: VideoRecorder },
    { label: 'Refs', mode: null, icon: Upload04 },
    { label: 'Tools', mode: null, icon: Sliders04 },
  ];

  return (
    <nav className="flex w-[78px] shrink-0 flex-col items-center gap-4 border-r border-white/10 bg-[#0b0c0b] py-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 font-bold">O</div>
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.mode === mode;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => item.mode && onModeChange(item.mode)}
            className={cn(
              'flex w-full flex-col items-center gap-1 px-2 py-2 text-xs text-white/45 transition-colors hover:text-white',
              active && 'text-white',
            )}
          >
            <span className={cn('rounded-xl p-2', active && 'bg-white text-black shadow-[0_0_20px_rgba(225,63,202,0.35)]')}>
              <Icon className="h-5 w-5" />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function PanelBlock({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">{children}</div>;
}

function ModeButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 text-sm font-semibold text-white/55 transition-all',
        active && 'border-white/20 bg-white text-black shadow-[0_12px_35px_rgba(225,63,202,0.18)]',
      )}
    >
      {children}
    </button>
  );
}

function ReferenceStrip({
  references,
  empty,
}: {
  references: CreationData['references'];
  empty: string;
}) {
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {references.length === 0 ? (
        <div className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-white/12 text-xs text-white/35">
          <ImagePlus className="mr-2 h-4 w-4" />
          {empty}
        </div>
      ) : (
        references.slice(0, 8).map((reference) => (
          <div key={reference.id} className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {reference.signedUrl ? (
              <img src={reference.signedUrl} alt={reference.originalName ?? 'reference'} className="h-full w-full object-cover" />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function GenerationGrid({ jobs }: { jobs: CreationData['jobs'] }) {
  const creationJobs = jobs.filter((job) => (job.config as any)?.source === 'creation');

  if (creationJobs.length === 0) {
    return (
      <Card className="border-white/10 bg-white/[0.035] text-white">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center">
          <MagicWand02 className="mb-4 h-10 w-10 text-white/35" />
          <p className="text-xl font-bold">No generations yet</p>
          <p className="mt-2 max-w-sm text-sm text-white/45">
            Create the first draft. Once API keys are connected, this grid becomes the generated image/video library.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {creationJobs.map((job) => {
        const config = job.config as any;
        const signedOutputs = (job as any).signedOutputs as Array<{ signedUrl: string | null; sourceUrl?: string }> | undefined;
        return (
          <div key={job.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-black/35">
              {signedOutputs?.[0]?.signedUrl ? (
                <img src={signedOutputs[0].signedUrl} alt="Generated output" className="h-full w-full object-cover" />
              ) : config?.mode === 'video' ? (
                <PlayCircle className="h-12 w-12 text-white/35" />
              ) : (
                <Image03 className="h-12 w-12 text-white/35" />
              )}
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-white/15 text-white">{config?.mode ?? 'image'}</Badge>
                <span className={cn(
                  'text-xs',
                  job.status === 'done' ? 'text-emerald-300' : job.status === 'failed' ? 'text-red-300' : 'text-white/40',
                )}>
                  {job.status}
                </span>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-white/65">{config?.rawPrompt ?? job.prompt}</p>
              {job.errorMessage && (
                <p className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-xs leading-5 text-red-200">
                  {job.errorMessage}
                </p>
              )}
              {signedOutputs && signedOutputs.length > 1 && (
                <div className="grid grid-cols-4 gap-1">
                  {signedOutputs.slice(1, 5).map((output, index) => (
                    <div key={`${job.id}-${index}`} className="aspect-square overflow-hidden rounded-md bg-black/30">
                      {output.signedUrl ? <img src={output.signedUrl} alt="Generated variant" className="h-full w-full object-cover" /> : null}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-white/45">
                <span>{config?.aspectRatio}</span>
                <span>{config?.outputCount} outputs</span>
                <span>{config?.referenceCounts?.character ?? 0} char refs</span>
                <span>{config?.referenceCounts?.decor ?? 0} decor refs</span>
              </div>
              {signedOutputs?.[0]?.signedUrl && (
                <a
                  href={signedOutputs[0].signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Download01 className="mr-2 h-3.5 w-3.5" />
                  Open output
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GenerateButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-2xl bg-[#a82b8f] text-base font-bold text-white shadow-[0_10px_30px_rgba(168,43,143,0.35)] hover:bg-[#bd35a2] disabled:opacity-60"
    >
      <Stars02 className="mr-2 h-4 w-4" />
      {pending ? 'Generating...' : 'Generate'}
    </Button>
  );
}
