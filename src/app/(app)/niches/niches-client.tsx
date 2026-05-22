'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

import { Edit02, Plus, Target04, Trash01 } from '@untitledui/icons';

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
import { Textarea } from '@/components/ui/textarea';
import { createNiche, deleteNiche, updateNiche } from './actions';

const saturationColors: Record<string, string> = {
  low: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  saturated: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

type Niche = {
  id: string;
  name: string;
  description: string | null;
  targetAudience: string | null;
  saturationLevel: string | null;
  keywords: any;
  notes: string | null;
  estimatedRevenuePerModel: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export function NichesClient({ data }: { data: Niche[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editNiche, setEditNiche] = useState<Niche | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm('Delete this niche?')) return;
    startTransition(async () => {
      await deleteNiche(id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Niches</h1>
          <p className="text-sm text-muted-foreground">{data.length} niche{data.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Niche
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Niche</DialogTitle>
            </DialogHeader>
            <NicheForm
              onSubmit={async (fd) => {
                await createNiche(fd);
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search niches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') router.push(`/niches?search=${search}`);
          }}
          className="w-64"
        />
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target04 className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No niches yet</p>
            <p className="text-sm text-muted-foreground">Create your first niche to start categorizing</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((niche) => (
            <Card key={niche.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{niche.name}</CardTitle>
                  {niche.saturationLevel && (
                    <Badge variant="outline" className={`text-xs ${saturationColors[niche.saturationLevel] ?? ''}`}>
                      {niche.saturationLevel}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {niche.description && <p className="text-sm text-muted-foreground line-clamp-2">{niche.description}</p>}
                {niche.targetAudience && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Audience:</span> {niche.targetAudience}
                  </p>
                )}
                {niche.estimatedRevenuePerModel && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Est. Revenue:</span> ${niche.estimatedRevenuePerModel}/model/mo
                  </p>
                )}
                {niche.keywords && (niche.keywords as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(niche.keywords as string[]).slice(0, 5).map((k) => (
                      <Badge key={k} variant="outline" className="text-xs">{k}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 border-t pt-2">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditNiche(niche)}>
                    <Edit02 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(niche.id)}>
                    <Trash01 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editNiche} onOpenChange={(open) => !open && setEditNiche(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Niche</DialogTitle>
          </DialogHeader>
          {editNiche && (
            <NicheForm
              defaultValues={editNiche}
              onSubmit={async (fd) => {
                await updateNiche(fd);
                setEditNiche(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NicheForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: Niche;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {defaultValues && <input type="hidden" name="id" value={defaultValues.id} />}
      <div className="space-y-2">
        <Label htmlFor="niche-name">Name</Label>
        <Input id="niche-name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="niche-desc">Description</Label>
        <Textarea id="niche-desc" name="description" defaultValue={defaultValues?.description ?? ''} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="niche-audience">Target Audience</Label>
        <Input id="niche-audience" name="targetAudience" defaultValue={defaultValues?.targetAudience ?? ''} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="niche-sat">Saturation Level</Label>
          <select name="saturationLevel" id="niche-sat" defaultValue={defaultValues?.saturationLevel ?? 'medium'} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="saturated">Saturated</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="niche-rev">Est. Revenue/model ($)</Label>
          <Input id="niche-rev" name="estimatedRevenuePerModel" type="number" defaultValue={defaultValues?.estimatedRevenuePerModel ?? ''} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="niche-kw">Keywords (comma-separated)</Label>
        <Input id="niche-kw" name="keywords" defaultValue={defaultValues?.keywords ? (defaultValues.keywords as string[]).join(', ') : ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="niche-notes">Notes</Label>
        <Textarea id="niche-notes" name="notes" defaultValue={defaultValues?.notes ?? ''} rows={2} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit">{defaultValues ? 'Save' : 'Create'}</Button>
      </DialogFooter>
    </form>
  );
}
