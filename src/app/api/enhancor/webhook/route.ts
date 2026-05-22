import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { aiGenerationJobs } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function saveGeneratedMedia(input: {
  resultUrl: string;
  jobId: string;
}) {
  const response = await fetch(input.resultUrl);
  if (!response.ok) throw new Error('Failed to download Enhancor result');

  const contentType = response.headers.get('content-type') || guessContentType(input.resultUrl);
  const bytes = await response.arrayBuffer();
  const extension = getExtension(contentType, input.resultUrl);
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

function guessContentType(url: string) {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'video/mp4';
}

function getExtension(contentType: string, url: string) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('quicktime')) return 'mov';
  if (contentType.includes('webm')) return 'webm';
  const ext = url.toLowerCase().split('?')[0].match(/\.([a-z0-9]{2,5})$/)?.[1];
  return ext || 'mp4';
}

function resultUrlsFromPayload(payload: Record<string, unknown>) {
  const result = payload.result;
  if (Array.isArray(result)) return result.map(String).filter(Boolean);
  if (typeof result === 'string') return [result];
  if (Array.isArray(payload.results)) return payload.results.map(String).filter(Boolean);
  if (Array.isArray(payload.output)) return payload.output.map(String).filter(Boolean);
  if (typeof payload.output === 'string') return [payload.output];
  return [];
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

  const resultUrls = resultUrlsFromPayload(payload);

  if (status !== 'COMPLETED' || resultUrls.length === 0) {
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const outputs = [];
    for (const resultUrl of resultUrls) {
      outputs.push(await saveGeneratedMedia({
        resultUrl,
        jobId: job.id,
      }));
    }

    await db
      .update(aiGenerationJobs)
      .set({
        status: 'done',
        resultBucket: outputs[0]?.bucket ?? null,
        resultPath: outputs[0]?.path ?? null,
        updatedAt: new Date(),
        config: {
          ...currentConfig,
          webhook: payload,
          outputs,
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
