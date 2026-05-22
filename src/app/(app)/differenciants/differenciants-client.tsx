'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Edit02, MagicWand02, Plus, Trash01 } from '@untitledui/icons';

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
import { Textarea } from '@/components/ui/textarea';
import { createDifferenciant, deleteDifferenciant, updateDifferenciant } from './actions';

const categories = ['physique', 'talent', 'niche_exclusive', 'personality', 'fetish', 'other'];

const categoryColors: Record<string, string> = {
  physique: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  talent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  niche_exclusive: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  personality: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  fetish: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  other: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

type Differenciant = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  photos: any;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function DifferenciantsClient({ data }: { data: Differenciant[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Differenciant | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm('Delete this differenciant?')) return;
    startTransition(async () => {
      await deleteDifferenciant(id);
    });
  }

  function updateFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/differenciants?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Differenciants</h1>
          <p className="text-sm text-muted-foreground">{data.length} differenciant{data.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Differenciant
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Differenciant</DialogTitle>
            </DialogHeader>
            <DiffForm
              onSubmit={async (fd) => {
                await createDifferenciant(fd);
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateFilters({ search: search || undefined });
          }}
          className="w-64"
        />
        <Select
          value={searchParams.get('category') ?? ''}
          onValueChange={(v) => updateFilters({ category: v === 'all' ? undefined : v ?? undefined })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MagicWand02 className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No differenciants yet</p>
            <p className="text-sm text-muted-foreground">Add differentiating factors for your models</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge variant="outline" className={`text-xs capitalize ${categoryColors[item.category] ?? ''}`}>
                    {item.category.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.description && <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
                {item.notes && <p className="text-xs text-muted-foreground italic">{item.notes}</p>}
                <div className="flex items-center justify-end gap-1 border-t pt-2">
                  <Button variant="ghost" size="icon-sm" onClick={() => setEditItem(item)}>
                    <Edit02 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item.id)}>
                    <Trash01 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Differenciant</DialogTitle>
          </DialogHeader>
          {editItem && (
            <DiffForm
              defaultValues={editItem}
              onSubmit={async (fd) => {
                await updateDifferenciant(fd);
                setEditItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: Differenciant;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {defaultValues && <input type="hidden" name="id" value={defaultValues.id} />}
      <div className="space-y-2">
        <Label htmlFor="diff-name">Name</Label>
        <Input id="diff-name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="diff-cat">Category</Label>
        <select name="category" id="diff-cat" defaultValue={defaultValues?.category ?? 'other'} required className="w-full rounded-md border px-3 py-2 text-sm">
          {categories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="diff-desc">Description</Label>
        <Textarea id="diff-desc" name="description" defaultValue={defaultValues?.description ?? ''} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="diff-notes">Notes</Label>
        <Textarea id="diff-notes" name="notes" defaultValue={defaultValues?.notes ?? ''} rows={2} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit">{defaultValues ? 'Save' : 'Create'}</Button>
      </DialogFooter>
    </form>
  );
}
