import { NextRequest } from 'next/server';
import { submitBatch, pollRun, normalizeListings } from '@/lib/tinyfish';

export const runtime = 'nodejs';
export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { watchItems } = await req.json();
    if (!Array.isArray(watchItems) || watchItems.length === 0) {
      return Response.json({ updated: [] });
    }

    // Build all runs across all watch items + recipes
    const allRuns: { watchId: string; platform: string; url: string; goal: string }[] = [];
    for (const item of watchItems) {
      for (const recipe of item.recipes ?? []) {
        allRuns.push({ watchId: item.id, platform: recipe.platform, url: recipe.url, goal: recipe.goal });
      }
    }

    if (allRuns.length === 0) return Response.json({ updated: [] });

    const runIds = await submitBatch(allRuns.map((r) => ({ url: r.url, goal: r.goal })));
    const runMap = new Map(runIds.map((id, i) => [id, allRuns[i]]));
    const pending = new Set(runIds);

    // Collect results per watch item
    const results: Record<string, { platform: string; price: number }[]> = {};

    const MAX_WAIT_MS = 4 * 60 * 1_000;
    const startTime = Date.now();

    while (pending.size > 0 && Date.now() - startTime < MAX_WAIT_MS) {
      await sleep(5_000);
      const polls = await Promise.allSettled([...pending].map((id) => pollRun(id)));

      for (const poll of polls) {
        if (poll.status !== 'fulfilled') continue;
        const run = poll.value;
        const meta = runMap.get(run.run_id);
        if (!meta) continue;

        if (run.status === 'COMPLETED') {
          pending.delete(run.run_id);
          const listings = normalizeListings(run.result ?? []);
          if (listings.length > 0) {
            const best = listings.sort((a, b) => a.price - b.price)[0];
            results[meta.watchId] = [
              ...(results[meta.watchId] ?? []),
              { platform: meta.platform, price: best.price },
            ];
          }
        } else if (run.status === 'FAILED' || run.status === 'CANCELLED') {
          pending.delete(run.run_id);
        }
      }
    }

    // Build updated records
    const updated = watchItems.map((item: any) => {
      const platformPrices = results[item.id] ?? [];
      if (platformPrices.length === 0) return { id: item.id, updated: false };

      const best = platformPrices.sort((a, b) => a.price - b.price)[0];
      return {
        id: item.id,
        updated: true,
        currentBestPrice: best.price,
        currentBestPlatform: best.platform,
        lastChecked: new Date().toISOString(),
        triggered: best.price <= item.targetPrice,
      };
    });

    return Response.json({ updated });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
