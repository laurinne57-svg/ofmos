'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ArrowLeft } from '@untitledui/icons';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  done: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

type Video = {
  id: string;
  title: string;
  storageUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  modelName: string | null;
  nicheName: string | null;
  tags: any;
  notes: string | null;
  createdAt: Date;
};

type Variation = {
  id: string;
  status: string;
  storageUrl: string | null;
  thumbnailUrl: string | null;
  config: any;
  errorMessage: string | null;
  createdAt: Date;
};

export function VideoDetailClient({
  video,
  variations,
}: {
  video: Video;
  variations: Variation[];
}) {
  const [showRawConfig, setShowRawConfig] = useState(false);

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/content">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{video.title}</h1>
          <p className="text-sm text-muted-foreground">
            {video.modelName && `By ${video.modelName} `}
            {video.durationSeconds && `/ ${formatDuration(video.durationSeconds)}`}
            {video.nicheName && ` / ${video.nicheName}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                <video src={video.storageUrl} controls className="w-full h-full rounded-md" />
              </div>
            </CardContent>
          </Card>

          {video.notes && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{video.notes}</p>
              </CardContent>
            </Card>
          )}

          {video.tags && (video.tags as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(video.tags as string[]).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          <Card className="card-elevated">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Generate unique versions</p>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Send this source to the Repurpose Bot to create 1-10 randomized MP4 variations.
                </p>
              </div>
              <Link href={`/video-tools?source=${video.id}`}>
                <Button className="btn-3d gradient-blue text-white">
                  Open Repurpose Bot
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variations ({variations.length})</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRawConfig((value) => !value)}
                >
                  {showRawConfig ? 'Hide config' : 'Show config'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {variations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No variations yet</p>
              ) : (
                <div className="space-y-2">
                  {variations.map((v) => (
                    <div key={v.id} className="rounded-md border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs ${statusColors[v.status] ?? ''}`}>{v.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      {showRawConfig && v.config && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                          {JSON.stringify(v.config, null, 2)}
                        </pre>
                      )}
                      {v.errorMessage && (
                        <p className="text-xs text-red-500">{v.errorMessage}</p>
                      )}
                      {v.storageUrl && (
                        <a href={v.storageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                          Download
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
