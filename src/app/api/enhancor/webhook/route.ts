import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { aiGenerationJobs } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function saveGeneratedVideo(input: {
  resultUrl: string;
  jobId: string;
}) {
  const response = await fetch(input.resultUrl);
  if (!response.ok) throw new Error('Failed to download Enhancor video result');

  const contentType = response.headers.get('content-type') || 'video/mp4';
  const bytes = await response.arrayBuffer();
  const extension = contentType.includes('quicktime') ? 'mov' : contentType.includes('webm') ? 'webm' : 'mp4';
  const path = `creation/${input.jobId}/${Date.now()}-enhancor.${extension}`;

  const supabase = await createClient();
  const { error } = await supabase.storage
    .from('ai-output')
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw error;

  return {
    bucket: 'ai-output',
    path,
    sourceUrl: input.resultUrl,
    contentType,
  };
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const requestId = payload?.request_id || payload?.requestId || payload?.id;

  if (!requestId) {
    return Response.json({ ok: false, error: 'Missing request_id' }, { status: 400 });
  }

  const jobs = await db
    .select()
    .from(aiGenerationJobs)
    .where(sql`${aiGenerationJobs.config}->'external'->>'requestId' = ${String(requestId)}`)
    .limit(1);

  const job = jobs[0];
  if (!job) {
    return Response.json({ ok: false, error: 'Unknown request_id' }, { status: 404 });
  }

  const currentConfig = (job.config ?? {}) as Record<string, unknown>;
  const status = String(payload?.status ?? '').toUpperCase();

  if (status === 'FAILED') {
    await db
      .update(aiGenerationJobs)
      .set({
        status: 'failed',
        errorMessage: payload?.error || 'Enhancor generation failed',
        updatedAt: new Date(),
        config: {
          ...currentConfig,
          webhook: payload,
        },
      })
      .where(eq(aiGenerationJobs.id, job.id));

    return Response.json({ ok: true });
  }

  if (status !== 'COMPLETED' || !payload?.result) {
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const output = await saveGeneratedVideo({
      resultUrl: String(payload.result),
      jobId: job.id,
    });

    await db
      .update(aiGenerationJobs)
      .set({
        status: 'done',
        resultBucket: output.bucket,
        resultPath: output.path,
        updatedAt: new Date(),
        config: {
          ...currentConfig,
          webhook: payload,
          outputs: [output],
        },
      })
      .where(eq(aiGenerationJobs.id, job.id));
  } catch (error) {
    await db
      .update(aiGenerationJobs)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to save Enhancor output',
        updatedAt: new Date(),
        config: {
          ...currentConfig,
          webhook: payload,
        },
      })
      .where(eq(aiGenerationJobs.id, job.id));
  }

  return Response.json({ ok: true });
}
