'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ImagePlus, Trash01, Upload04 } from '@untitledui/icons';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { addReferenceImage, deleteReferenceImage } from '@/app/(app)/ai-studio/actions';
import { ensureModelAiCharacter } from '@/app/(app)/models/actions';
import { cn } from '@/lib/utils';

const PRIVATE_BUCKET = 'ai-reference';

type Character = {
  id: string;
  name: string;
  handle: string;
} | null;

type Reference = {
  id: string;
  signedUrl: string | null;
  originalName: string | null;
};

export function ModelAiReferences({
  modelId,
  modelName,
  character,
  references,
}: {
  modelId: string;
  modelName: string;
  character: Character;
  references: Reference[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError('');

    try {
      const characterId = character?.id ?? await ensureModelAiCharacter(modelId);
      const supabase = createClient();

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `character/${characterId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(PRIVATE_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        await addReferenceImage({
          assetType: 'character',
          characterId,
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Character handle</p>
          {character ? (
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline">#{character.handle}</Badge>
              <span className="text-sm text-muted-foreground">usable in Création prompts</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Upload refs to create #{modelName.toLowerCase().replace(/\s+/g, '')}</p>
          )}
        </div>
        <Label
          className={cn(
            'inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-input px-3 text-sm font-medium hover:bg-muted',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          <Upload04 className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload refs'}
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => upload(event.target.files)} />
        </Label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {references.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <ImagePlus className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">No AI references yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add face/body/style references for consistent generations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {references.map((reference) => (
            <div key={reference.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
              {reference.signedUrl ? (
                <img src={reference.signedUrl} alt={reference.originalName ?? 'AI reference'} className="h-full w-full object-cover" />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={isPending}
                className="absolute right-1 top-1 hidden bg-black/70 text-white hover:bg-black/80 group-hover:inline-flex"
                onClick={() => startTransition(async () => {
                  await deleteReferenceImage(reference.id);
                  router.refresh();
                })}
              >
                <Trash01 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
