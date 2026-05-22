'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Copy01, ImagePlus, Plus, Trash01, Upload04 } from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  addReferenceImage,
  createCharacter,
  createEnvironment,
  createGenerationDraft,
  deleteCharacter,
  deleteEnvironment,
  deleteReferenceImage,
} from './actions';

const PRIVATE_BUCKET = 'ai-reference';

type AiStudioData = Awaited<ReturnType<typeof import('@/lib/db/queries/ai-studio').getAiStudioData>>;
type Character = AiStudioData['characters'][number];
type Environment = AiStudioData['environments'][number];
type Reference = AiStudioData['references'][number];

export function AiStudioClient({ data }: { data: AiStudioData }) {
  const [createCharacterOpen, setCreateCharacterOpen] = useState(false);
  const [createEnvironmentOpen, setCreateEnvironmentOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState(data.characters[0]?.id ?? '');
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState(data.environments[0]?.id ?? '');
  const [brief, setBrief] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedCharacter = data.characters.find((character) => character.id === selectedCharacterId) ?? null;
  const selectedEnvironment = data.environments.find((environment) => environment.id === selectedEnvironmentId) ?? null;

  const compiledPrompt = useMemo(() => {
    return buildPrompt(selectedCharacter, selectedEnvironment, brief);
  }, [selectedCharacter, selectedEnvironment, brief]);

  const negativePrompt = useMemo(() => {
    return [selectedCharacter?.negativePrompt, selectedEnvironment?.negativePrompt]
      .filter(Boolean)
      .join('\n');
  }, [selectedCharacter, selectedEnvironment]);

  function handleDeleteCharacter(id: string) {
    if (!confirm('Delete this AI character and its private references?')) return;
    startTransition(async () => deleteCharacter(id));
  }

  function handleDeleteEnvironment(id: string) {
    if (!confirm('Delete this environment and its private references?')) return;
    startTransition(async () => deleteEnvironment(id));
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl gradient-blue p-6 text-white card-elevated md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_48%)]" />
        <div className="absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-white/70">AI production base</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">AI Studio</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
              Crée des personnages mentionnables comme @leo et des environnements persistants comme @chambre1.
              Les références restent privées et servent de base aux prompts IA.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatPod label="Characters" value={data.characters.length} />
            <StatPod label="Rooms" value={data.environments.length} />
            <StatPod label="Refs" value={data.references.length} />
          </div>
        </div>
      </section>

      <Tabs defaultValue="characters" className="space-y-5">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
          <TabsTrigger value="builder">Prompt Builder</TabsTrigger>
          <TabsTrigger value="jobs">Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="space-y-4">
          <SectionHeader
            title="Characters"
            description="Les avatars cohérents que tu peux appeler avec @handle dans tes briefs."
            action={
              <Dialog open={createCharacterOpen} onOpenChange={setCreateCharacterOpen}>
                <DialogTrigger render={<Button className="btn-3d" />}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Character
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>New AI Character</DialogTitle>
                  </DialogHeader>
                  <CharacterForm
                    models={data.models}
                    onSubmit={async (fd) => {
                      await createCharacter(fd);
                      setCreateCharacterOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            }
          />

          {data.characters.length === 0 ? (
            <EmptyState
              title="No character yet"
              description="Start with the model identity, then upload 8-20 strong reference images."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.characters.map((character) => (
                <AssetCard
                  key={character.id}
                  title={character.name}
                  handle={character.handle}
                  subtitle={character.modelName ? `Linked to ${character.modelName}` : character.description}
                  prompt={character.identityPrompt}
                  references={data.references.filter((ref) => ref.characterId === character.id)}
                  uploadTarget={{ type: 'character', id: character.id }}
                  onDelete={() => handleDeleteCharacter(character.id)}
                  disabled={isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="environments" className="space-y-4">
          <SectionHeader
            title="Environments"
            description="Chambres, salles de bain, studio, décor récurrent : tout ce qui doit rester visuellement stable."
            action={
              <Dialog open={createEnvironmentOpen} onOpenChange={setCreateEnvironmentOpen}>
                <DialogTrigger render={<Button className="btn-3d" />}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Environment
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>New Environment</DialogTitle>
                  </DialogHeader>
                  <EnvironmentForm
                    onSubmit={async (fd) => {
                      await createEnvironment(fd);
                      setCreateEnvironmentOpen(false);
                    }}
                  />
                </DialogContent>
              </Dialog>
            }
          />

          {data.environments.length === 0 ? (
            <EmptyState
              title="No environment yet"
              description="Create @chambre1, then upload multiple angles, light conditions and details."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {data.environments.map((environment) => (
                <AssetCard
                  key={environment.id}
                  title={environment.name}
                  handle={environment.handle}
                  subtitle={environment.description}
                  prompt={environment.environmentPrompt}
                  references={data.references.filter((ref) => ref.environmentId === environment.id)}
                  uploadTarget={{ type: 'environment', id: environment.id }}
                  onDelete={() => handleDeleteEnvironment(environment.id)}
                  disabled={isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Generation brief</CardTitle>
                <CardDescription>Choisis un avatar, un environnement, puis écris la scène à produire.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  action={async (fd) => {
                    await createGenerationDraft(fd);
                  }}
                  className="space-y-4"
                >
                  <input type="hidden" name="prompt" value={compiledPrompt} />
                  <input type="hidden" name="negativePrompt" value={negativePrompt} />

                  <div className="space-y-2">
                    <Label>Character</Label>
                    <Select value={selectedCharacterId} onValueChange={(value) => setSelectedCharacterId(value ?? '')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select @character" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.characters.map((character) => (
                          <SelectItem key={character.id} value={character.id}>
                            @{character.handle} · {character.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="characterId" value={selectedCharacterId} />
                  </div>

                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <Select value={selectedEnvironmentId} onValueChange={(value) => setSelectedEnvironmentId(value ?? '')}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select @environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.environments.map((environment) => (
                          <SelectItem key={environment.id} value={environment.id}>
                            @{environment.handle} · {environment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="environmentId" value={selectedEnvironmentId} />
                  </div>

                  <div className="space-y-2">
                    <Label>Scene brief</Label>
                    <Textarea
                      value={brief}
                      onChange={(event) => setBrief(event.target.value)}
                      rows={7}
                      placeholder="Ex: photo miroir, lumière naturelle, tenue noire, même lit et mêmes posters visibles..."
                    />
                  </div>

                  <Button type="submit" className="btn-3d w-full" disabled={!compiledPrompt.trim()}>
                    Save Enhancor Draft
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Compiled prompt</CardTitle>
                <CardDescription>Base propre à envoyer au provider IA avec les références privées associées.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{compiledPrompt || 'Select a character, an environment and write a scene brief.'}</pre>
                </div>
                {negativePrompt && (
                  <div className="rounded-xl border p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negative prompt</p>
                    <pre className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{negativePrompt}</pre>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(compiledPrompt)}
                  disabled={!compiledPrompt.trim()}
                >
                  <Copy01 className="mr-2 h-4 w-4" />
                  Copy prompt
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Enhancor drafts</CardTitle>
              <CardDescription>Les générations préparées pour le branchement API.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No generation draft yet.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {data.jobs.map((job) => (
                    <div key={job.id} className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Badge variant="outline">{job.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="line-clamp-3 text-sm text-muted-foreground">{job.prompt}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="card-elevated">
      <CardContent className="py-12 text-center">
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function AssetCard({
  title,
  handle,
  subtitle,
  prompt,
  references,
  uploadTarget,
  onDelete,
  disabled,
}: {
  title: string;
  handle: string;
  subtitle?: string | null;
  prompt?: string | null;
  references: Reference[];
  uploadTarget: { type: 'character' | 'environment'; id: string };
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="card-elevated card-hover">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <Badge variant="outline">@{handle}</Badge>
            </div>
            {subtitle && <CardDescription className="mt-1 line-clamp-2">{subtitle}</CardDescription>}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={disabled}>
            <Trash01 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompt && (
          <div className="rounded-xl border bg-muted/25 p-3">
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{prompt}</p>
          </div>
        )}

        <ReferenceGrid references={references} />
        <ReferenceUpload target={uploadTarget} />
      </CardContent>
    </Card>
  );
}

function ReferenceGrid({ references }: { references: Reference[] }) {
  if (references.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-center">
        <ImagePlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No private references</p>
        <p className="mt-1 text-xs text-muted-foreground">Upload multiple angles to improve consistency.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {references.slice(0, 12).map((reference) => (
        <div key={reference.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
          {reference.signedUrl ? (
            <img src={reference.signedUrl} alt={reference.originalName ?? 'AI reference'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Private</div>
          )}
          <DeleteReferenceButton id={reference.id} />
        </div>
      ))}
    </div>
  );
}

function DeleteReferenceButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => deleteReferenceImage(id))}
      className="absolute right-1 top-1 hidden rounded-md bg-black/70 p-1 text-white shadow-sm group-hover:block"
      aria-label="Delete reference"
    >
      <Trash01 className="h-3.5 w-3.5" />
    </button>
  );
}

function ReferenceUpload({ target }: { target: { type: 'character' | 'environment'; id: string } }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');

    try {
      const supabase = createClient();
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${target.type}/${target.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(PRIVATE_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        await addReferenceImage({
          assetType: target.type,
          characterId: target.type === 'character' ? target.id : null,
          environmentId: target.type === 'environment' ? target.id : null,
          bucket: PRIVATE_BUCKET,
          storagePath: path,
          originalName: file.name,
          mimeType: file.type,
          fileSizeBytes: file.size,
        });
      }
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label
        className={cn(
          'flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <Upload04 className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading private refs...' : 'Upload reference images'}
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => upload(event.target.files)} />
      </Label>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function CharacterForm({
  models,
  onSubmit,
}: {
  models: AiStudioData['models'];
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input name="name" placeholder="Leo" required />
        </div>
        <div className="space-y-2">
          <Label>@handle</Label>
          <Input name="handle" placeholder="leo" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Linked CRM model</Label>
        <select name="modelId" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">No linked model</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input name="description" placeholder="Main brunette creator persona, soft glam, natural room content..." />
      </div>
      <div className="space-y-2">
        <Label>Identity prompt</Label>
        <Textarea name="identityPrompt" rows={5} placeholder="Stable physical traits, face details, hair, body type, styling, expressions..." />
      </div>
      <div className="space-y-2">
        <Label>Negative prompt</Label>
        <Textarea name="negativePrompt" rows={3} placeholder="Avoid face drift, different body proportions, extra fingers, wrong tattoos..." />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" className="btn-3d">Create</Button>
      </DialogFooter>
    </form>
  );
}

function EnvironmentForm({ onSubmit }: { onSubmit: (fd: FormData) => Promise<void> }) {
  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input name="name" placeholder="Chambre 1" required />
        </div>
        <div className="space-y-2">
          <Label>@handle</Label>
          <Input name="handle" placeholder="chambre1" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input name="description" placeholder="Small bedroom, white sheets, LED mirror, beige wall..." />
      </div>
      <div className="space-y-2">
        <Label>Environment prompt</Label>
        <Textarea name="environmentPrompt" rows={5} placeholder="Room layout, light, furniture placement, recurring objects, camera angles..." />
      </div>
      <div className="space-y-2">
        <Label>Negative prompt</Label>
        <Textarea name="negativePrompt" rows={3} placeholder="Avoid different bed frame, different wall color, missing mirror, wrong window side..." />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea name="notes" rows={2} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit" className="btn-3d">Create</Button>
      </DialogFooter>
    </form>
  );
}

function buildPrompt(character: Character | null, environment: Environment | null, brief: string) {
  const parts = [];

  if (character) {
    parts.push(`Character reference: @${character.handle} (${character.name})`);
    if (character.identityPrompt) parts.push(`Character identity:\n${character.identityPrompt}`);
  }

  if (environment) {
    parts.push(`Environment reference: @${environment.handle} (${environment.name})`);
    if (environment.environmentPrompt) parts.push(`Environment consistency:\n${environment.environmentPrompt}`);
  }

  if (brief.trim()) {
    parts.push(`Scene brief:\n${brief.trim()}`);
  }

  if (character || environment) {
    parts.push('Consistency rules: preserve the same face, body proportions, room layout, furniture placement, lighting direction, recurring objects, camera realism and lens feel across outputs.');
  }

  return parts.join('\n\n');
}
