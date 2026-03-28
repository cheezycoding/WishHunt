import { NextRequest, NextResponse } from 'next/server';
import { pollRun, normalizeListings } from '@/lib/tinyfish';

export const runtime = 'nodejs';
export const maxDuration = 15;

// GET /api/poll?runs=[{"runId":"...","platform":"...","platformId":"...","recipe":{...}}]
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('runs');
  if (!raw) return NextResponse.json({ error: 'Missing runs param' }, { status: 400 });

  let runMeta: { runId: string; platform: string; platformId: string; recipe: { url: string; goal: string } }[];
  try {
    runMeta = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid runs JSON' }, { status: 400 });
  }

  // Poll all run IDs in parallel — each is a quick single fetch
  const results = await Promise.allSettled(
    runMeta.map(async (meta) => {
      const run = await pollRun(meta.runId);
      return { meta, run };
    })
  );

  const updates = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(({ value: { meta, run } }) => {
      const base = {
        runId: meta.runId,
        platform: meta.platform,
        platformId: meta.platformId,
        status: run.status,
        streaming_url: run.streaming_url ?? null,
      };

      if (run.status === 'COMPLETED') {
        console.log(`[Poll COMPLETE] ${meta.platform} result type:`, typeof run.result, Array.isArray(run.result) ? 'array' : '');
        const listings = normalizeListings(run.result ?? [], meta.platform);
        return { ...base, listings, recipe: meta.recipe };
      }

      if (run.status === 'FAILED' || run.status === 'CANCELLED') {
        return { ...base, error: run.error?.message ?? run.status };
      }

      return base;
    });

  return NextResponse.json({ updates });
}
