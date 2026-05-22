'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

import { Copy01, Edit02, MessageChatCircle, Plus, Trash01 } from '@untitledui/icons';

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
import { createTemplate, deleteTemplate, incrementTemplateUsage, updateTemplate } from './actions';

const platforms = ['twitter', 'reddit', 'modelmayhem', 'instagram', 'tiktok', 'fanvue', 'other'];

type Template = {
  id: string;
  name: string;
  platform: string;
  content: string;
  variables: any;
  timesUsed: number | null;
  responseRate: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export function TemplatesClient({ data }: { data: Template[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      router.push(`/templates?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleCopy(template: Template) {
    const text = template.content;
    navigator.clipboard.writeText(text);
    startTransition(async () => {
      await incrementTemplateUsage(template.id);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return;
    startTransition(async () => {
      await deleteTemplate(id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">DM Templates</h1>
          <p className="text-sm text-muted-foreground">{data.length} template{data.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Template</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd) => {
                await createTemplate(fd);
                setCreateOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <select name="platform" id="platform" required className="w-full rounded-md border px-3 py-2 text-sm">
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea id="content" name="content" rows={6} required placeholder="Hey {{name}}, I saw your profile on {{platform}}..." />
                <p className="text-xs text-muted-foreground">Use {'{{variable}}'} for dynamic values</p>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateFilters({ search: search || undefined });
          }}
          className="w-64"
        />
        <Select
          value={searchParams.get('platform') ?? ''}
          onValueChange={(v) => updateFilters({ platform: v === 'all' ? undefined : v ?? undefined })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageChatCircle className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm text-muted-foreground">Create your first DM template to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <Badge variant="outline" className="text-xs capitalize">{template.platform}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-3 text-sm text-muted-foreground">{template.content}</p>
                {template.variables && (template.variables as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(template.variables as string[]).map((v) => (
                      <Badge key={v} variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        {'{{'}{v}{'}}'}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">Used {template.timesUsed ?? 0} times</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(template)} title="Copy to clipboard">
                      <Copy01 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditTemplate(template)} title="Edit">
                      <Edit02 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(template.id)} title="Delete">
                      <Trash01 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editTemplate} onOpenChange={(open) => !open && setEditTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {editTemplate && (
            <form
              action={async (fd) => {
                await updateTemplate(fd);
                setEditTemplate(null);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={editTemplate.id} />
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" name="name" defaultValue={editTemplate.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-platform">Platform</Label>
                <select name="platform" id="edit-platform" defaultValue={editTemplate.platform} required className="w-full rounded-md border px-3 py-2 text-sm">
                  {platforms.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea id="edit-content" name="content" rows={6} defaultValue={editTemplate.content} required />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
