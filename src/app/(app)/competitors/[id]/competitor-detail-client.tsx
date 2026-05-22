'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { ArrowLeft, Plus, Trash01 } from '@untitledui/icons';

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
import { addSnapshot, addWinningFormat, deleteWinningFormat } from '../actions';

const formatTypes = ['photo_set', 'short_video', 'long_video', 'live', 'story', 'reel', 'other'];

type Competitor = {
  id: string;
  name: string;
  platform: string;
  profileUrl: string | null;
  followersCount: number | null;
  estimatedRevenueMonthly: number | null;
  postingFrequencyPerWeek: string | null;
  nicheName: string | null;
  notes: string | null;
};

type Snapshot = {
  id: string;
  capturedAt: Date;
  followersCount: number | null;
  likesAvg: number | null;
  postsCount: number | null;
};

type WinningFormat = {
  id: string;
  formatType: string;
  description: string;
  exampleUrl: string | null;
  estimatedEngagement: string | null;
  notes: string | null;
  createdAt: Date;
};

export function CompetitorDetailClient({
  competitor,
  snapshots,
  winningFormats,
}: {
  competitor: Competitor;
  snapshots: Snapshot[];
  winningFormats: WinningFormat[];
}) {
  const [snapOpen, setSnapOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/competitors">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{competitor.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{competitor.platform} {competitor.nicheName ? `/ ${competitor.nicheName}` : ''}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Followers</p>
            <p className="text-2xl font-bold">{competitor.followersCount ? `${(competitor.followersCount / 1000).toFixed(1)}k` : '--'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Est. Revenue</p>
            <p className="text-2xl font-bold">{competitor.estimatedRevenueMonthly ? `$${competitor.estimatedRevenueMonthly.toLocaleString()}` : '--'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Posts/week</p>
            <p className="text-2xl font-bold">{competitor.postingFrequencyPerWeek ?? '--'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Snapshots</p>
            <p className="text-2xl font-bold">{snapshots.length}</p>
          </CardContent>
        </Card>
      </div>

      {competitor.notes && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{competitor.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Snapshots</CardTitle>
              <Dialog open={snapOpen} onOpenChange={setSnapOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Snapshot</DialogTitle>
                  </DialogHeader>
                  <form
                    action={async (fd) => {
                      fd.set('competitorId', competitor.id);
                      await addSnapshot(fd);
                      setSnapOpen(false);
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Followers</Label>
                        <Input name="followersCount" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label>Avg Likes</Label>
                        <Input name="likesAvg" type="number" />
                      </div>
                      <div className="space-y-2">
                        <Label>Posts</Label>
                        <Input name="postsCount" type="number" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No snapshots yet</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(s.capturedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex gap-4">
                      <span>{s.followersCount ? `${(s.followersCount / 1000).toFixed(1)}k followers` : ''}</span>
                      <span>{s.likesAvg ? `${s.likesAvg} avg likes` : ''}</span>
                      <span>{s.postsCount ? `${s.postsCount} posts` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Winning Formats</CardTitle>
              <Dialog open={formatOpen} onOpenChange={setFormatOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Winning Format</DialogTitle>
                  </DialogHeader>
                  <form
                    action={async (fd) => {
                      fd.set('competitorId', competitor.id);
                      await addWinningFormat(fd);
                      setFormatOpen(false);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label>Format Type</Label>
                      <select name="formatType" required className="w-full rounded-md border px-3 py-2 text-sm">
                        {formatTypes.map((f) => (
                          <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea name="description" required rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Example URL</Label>
                      <Input name="exampleUrl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Estimated Engagement</Label>
                      <Input name="estimatedEngagement" placeholder="e.g. 5-10k views" />
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                      <Button type="submit">Save</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {winningFormats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No winning formats yet</p>
            ) : (
              <div className="space-y-2">
                {winningFormats.map((wf) => (
                  <div key={wf.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="outline" className="text-xs capitalize mb-1">{wf.formatType.replace(/_/g, ' ')}</Badge>
                        <p className="text-sm">{wf.description}</p>
                        {wf.estimatedEngagement && (
                          <p className="text-xs text-muted-foreground mt-1">Engagement: {wf.estimatedEngagement}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startTransition(() => deleteWinningFormat(wf.id, competitor.id))}
                      >
                        <Trash01 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
