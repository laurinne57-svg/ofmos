'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Edit02, Plus, Trash01 } from '@untitledui/icons';

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
import { createAccount, deleteAccount, updateAccount } from './actions';

const accountStatuses = ['active', 'warming', 'suspended', 'banned', 'inactive'];
const platforms = ['instagram', 'twitter', 'tiktok', 'fanvue', 'reddit', 'other'];

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  warming: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  suspended: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  banned: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  inactive: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};

type Account = {
  id: string;
  modelId: string;
  platform: string;
  handle: string;
  profileUrl: string | null;
  status: string;
  followersCount: number | null;
  nicheId: string | null;
  notes: string | null;
  modelName: string;
  nicheName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Niche = { id: string; name: string };
type Model = { id: string; name: string };

export function AccountsClient({
  data,
  niches,
  models,
}: {
  data: Account[];
  niches: Niche[];
  models: Model[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Account | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm('Delete this account?')) return;
    startTransition(async () => {
      await deleteAccount(id);
    });
  }

  function updateFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/accounts?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground">{data.length} account{data.length !== 1 ? 's' : ''} across all models</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Account</DialogTitle>
            </DialogHeader>
            <AccountForm
              models={models}
              niches={niches}
              onSubmit={async (fd) => {
                await createAccount(fd);
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search handle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateFilters({ search: search || undefined });
          }}
          className="w-64"
        />
        <Select
          value={searchParams.get('status') ?? ''}
          onValueChange={(v) => updateFilters({ status: v === 'all' ? undefined : v ?? undefined })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {accountStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Handle</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Followers</TableHead>
              <TableHead>Niche</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">No accounts found.</TableCell>
              </TableRow>
            ) : (
              data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">@{a.handle}</TableCell>
                  <TableCell className="text-xs capitalize">{a.platform}</TableCell>
                  <TableCell className="text-sm">{a.modelName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColors[a.status] ?? ''}`}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{a.followersCount ? `${(a.followersCount / 1000).toFixed(1)}k` : '--'}</TableCell>
                  <TableCell>
                    {a.nicheName ? <Badge variant="outline" className="text-xs">{a.nicheName}</Badge> : '--'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditItem(a)}>
                        <Edit02 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(a.id)}>
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
            <DialogTitle>Edit Account</DialogTitle>
          </DialogHeader>
          {editItem && (
            <AccountForm
              models={models}
              niches={niches}
              defaultValues={editItem}
              onSubmit={async (fd) => {
                await updateAccount(fd);
                setEditItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountForm({
  defaultValues,
  models,
  niches,
  onSubmit,
}: {
  defaultValues?: Account;
  models: Model[];
  niches: Niche[];
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      {defaultValues && <input type="hidden" name="id" value={defaultValues.id} />}
      {!defaultValues && (
        <div className="space-y-2">
          <Label>Model</Label>
          <select name="modelId" required className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Select model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}
      {defaultValues && <input type="hidden" name="modelId" value={defaultValues.modelId} />}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <select name="platform" required defaultValue={defaultValues?.platform ?? 'instagram'} className="w-full rounded-md border px-3 py-2 text-sm">
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Handle</Label>
          <Input name="handle" required defaultValue={defaultValues?.handle} placeholder="username" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Profile URL</Label>
        <Input name="profileUrl" defaultValue={defaultValues?.profileUrl ?? ''} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <select name="status" defaultValue={defaultValues?.status ?? 'warming'} className="w-full rounded-md border px-3 py-2 text-sm">
            {accountStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Followers</Label>
          <Input name="followersCount" type="number" defaultValue={defaultValues?.followersCount ?? ''} />
        </div>
        <div className="space-y-2">
          <Label>Niche</Label>
          <select name="nicheId" defaultValue={defaultValues?.nicheId ?? ''} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">No niche</option>
            {niches.map((n) => (
              <option key={n.id} value={n.id}>{n.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea name="notes" defaultValue={defaultValues?.notes ?? ''} rows={2} />
      </div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button type="submit">{defaultValues ? 'Save' : 'Create'}</Button>
      </DialogFooter>
    </form>
  );
}
