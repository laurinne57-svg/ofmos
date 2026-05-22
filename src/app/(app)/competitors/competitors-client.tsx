'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Edit02, Eye, Plus, Trash01 } from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { createCompetitor, deleteCompetitor, updateCompetitor } from './actions';

type Competitor = {
  id: string;
  name: string;
  platform: string;
  profileUrl: string | null;
  nicheId: string | null;
  followersCount: number | null;
  estimatedRevenueMonthly: number | null;
  postingFrequencyPerWeek: string | null;
  notes: string | null;
  nicheName: string | null;
  createdAt: Date;
  updatedAt: Date;
  screenshotExamples: any;
};

type Niche = { id: string; name: string };

export function CompetitorsClient({ data, niches }: { data: Competitor[]; niches: Niche[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Competitor | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm('Delete this competitor?')) return;
    startTransition(async () => {
      await deleteCompetitor(id);
    });
  }

  function updateFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/competitors?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitors</h1>
          <p className="text-sm text-muted-foreground">{data.length} competitor{data.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Competitor
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Competitor</DialogTitle>
            </DialogHeader>
            <CompForm
              niches={niches}
              onSubmit={async (fd) => {
                await createCompetitor(fd);
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search competitors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateFilters({ search: search || undefined });
          }}
          className="w-64"
        />
        <Select
          value={searchParams.get('nicheId') ?? ''}
          onValueChange={(v) => updateFilters({ nicheId: v === 'all' ? undefined : v ?? undefined })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All niches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All niches</SelectItem>
            {niches.map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Est. Revenue</TableHead>
              <TableHead>Posts/week</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">No competitors found.</TableCell>
              </TableRow>
            ) : (
              data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs capitalize">{c.platform}</TableCell>
                  <TableCell>
                    {c.nicheName ? <Badge variant="outline" className="text-xs">{c.nicheName}</Badge> : <span className="text-muted-foreground">--</span>}
                  </TableCell>
                  <TableCell>{c.followersCount ? `${(c.followersCount / 1000).toFixed(1)}k` : '--'}</TableCell>
                  <TableCell>{c.estimatedRevenueMonthly ? `$${c.estimatedRevenueMonthly.toLocaleString()}` : '--'}</TableCell>
                  <TableCell>{c.postingFrequencyPerWeek ?? '--'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link href={`/competitors/${c.id}`}>
                        <Button variant="ghost" size="icon-sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditItem(c)}>
                        <Edit02 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c.id)}>
                        <Trash01 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Competitor</DialogTitle>
          </DialogHeader>
          {editItem && (
            <CompForm
              niches={niches}
              defaultValues={editItem}
              onSubmit={async (fd) => {
                await updateCompetitor(fd);
                setEditItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompForm({
  defaultValues,
  niches,
  onSubmit,
}: {
  defaultValues?: Competitor;
  niches: Niche[];
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {defaultValues && <input type="hidden" name="id" value={defaultValues.id} />}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="comp-name">Name</Label>
          <Input id="comp-name" name="name" defaultValue={defaultValues?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comp-platform">Platform</Label>
          <Input id="comp-platform" name="platform" defaultValue={defaultValues?.platform} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="comp-url">Profile URL</Label>
        <Input id="comp-url" name="profileUrl" defaultValue={defaultValues?.profileUrl ?? ''} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="comp-niche">Niche</Label>
        <select name="nicheId" id="comp-niche" defaultValue={defaultValues?.nicheId ?? ''} className="w-full rounded-md border px-3 py-2 text-sm">
          <option value="">No niche</option>
          {niches.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="comp-followers">Followers</Label>
          <Input id="comp-followers" name="followersCount" type="number" defaultValue={defaultValues?.followersCount ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comp-rev">Est. Revenue ($)</Label>
          <Input id="comp-rev" name="estimatedRevenueMonthly" type="number" defaultValue={defaultValues?.estimatedRevenueMonthly ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="comp-freq">Posts/week</Label>
          <Input id="comp-freq" name="postingFrequencyPerWeek" type="number" step="0.5" defaultValue={defaultValues?.postingFrequencyPerWeek ?? ''} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="comp-notes">Notes</Label>
        <Textarea id="comp-notes" name="notes" defaultValue={defaultValues?.notes ?? ''} rows={2} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit">{defaultValues ? 'Save' : 'Create'}</Button>
      </DialogFooter>
    </form>
  );
}
