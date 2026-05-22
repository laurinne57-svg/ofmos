'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Edit02, Eye, Film02, Plus, Trash01 } from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { VideoUpload } from '@/components/shared/video-upload';
import { createSourceVideo, deleteSourceVideo } from './actions';

type SourceVideo = {
  id: string;
  title: string;
  storageUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  nicheId: string | null;
  tags: any;
  notes: string | null;
  modelName: string | null;
  nicheName: string | null;
  variationCount: number;
  createdAt: Date;
};

type Niche = { id: string; name: string };

export function ContentClient({ data, niches }: { data: SourceVideo[]; niches: Niche[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm('Delete this video?')) return;
    startTransition(async () => {
      await deleteSourceVideo(id);
    });
  }

  function updateFilters(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/content?${params.toString()}`);
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Library</h1>
          <p className="text-sm text-muted-foreground">{data.length} video{data.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Video
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Source Video</DialogTitle>
            </DialogHeader>
            <form
              action={async (fd) => {
                await createSourceVideo(fd);
                setCreateOpen(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Title</Label>
                <Input name="title" required />
              </div>
              <div className="space-y-2">
                <Label>Video File</Label>
                <VideoUpload
                  onUploaded={(url) => setUploadedUrl(url)}
                />
                <Label className="text-xs text-muted-foreground">Or paste URL manually:</Label>
                <Input
                  name="storageUrl"
                  required
                  placeholder="Supabase storage URL or external link"
                  value={uploadedUrl}
                  onChange={(e) => setUploadedUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input name="durationSeconds" type="number" />
                </div>
                <div className="space-y-2">
                  <Label>Niche</Label>
                  <select name="nicheId" className="w-full rounded-md border px-3 py-2 text-sm">
                    <option value="">No niche</option>
                    {niches.map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input name="tags" placeholder="tag1, tag2, tag3" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search videos..."
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

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Film02 className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No videos yet</p>
            <p className="text-sm text-muted-foreground">Add your first source video to the library</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                ) : (
                  <Film02 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="font-medium text-sm truncate">{video.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {video.durationSeconds && <span>{formatDuration(video.durationSeconds)}</span>}
                  {video.modelName && <span>/ {video.modelName}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {video.nicheName && <Badge variant="outline" className="text-xs">{video.nicheName}</Badge>}
                    {Number(video.variationCount) > 0 && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        {video.variationCount} var.
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/content/${video.id}`}>
                      <Button variant="ghost" size="icon-sm"><Eye className="h-3.5 w-3.5" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(video.id)}>
                      <Trash01 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
