import { NextRequest, NextResponse } from 'next/server';
import { PLATFORMS } from '@/lib/platforms';
import { submitBatch } from '@/lib/tinyfish';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get('product');
  if (!product) return NextResponse.json({ error: 'Missing product param' }, { status: 400 });

  const runs = PLATFORMS.map((p) => ({
    url: p.url(product),
    goal: p.goal(product),
  }));

  const runIds = await submitBatch(runs);

  // Return run IDs mapped to platform names so client can poll
  const runMap = runIds.map((id, i) => ({
    runId: id,
    platform: PLATFORMS[i].name,
    platformId: PLATFORMS[i].id,
    recipe: { url: runs[i].url, goal: runs[i].goal },
  }));

  return NextResponse.json({ runs: runMap });
}
