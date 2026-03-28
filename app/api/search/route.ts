import { NextRequest } from 'next/server';
import { PLATFORMS } from '@/lib/platforms';
import { submitBatch, pollRun, normalizeListings } from '@/lib/tinyfish';

export const runtime = 'nodejs';
export const maxDuration = 800; // ~13 min — TinyFish runs can queue for several minutes

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
  const product = req.nextUrl.searchParams.get('product');
  if (!product) return new Response('Missing product param', { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch { /* client disconnected */ }
      };

      // Keep the SSE connection alive — browsers/proxies drop idle streams
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); } catch { /* gone */ }
      }, 20_000);

      const log = (msg: string) =>
        send('log', { time: new Date().toLocaleTimeString('en-US', { hour12: false }), msg });

      // ── 1. Submit all 5 runs in one batch call ──────────────────────────────
      const runs = PLATFORMS.map((p) => ({
        url: p.url(product),
        goal: p.goal(product),
      }));

      log(`Submitting ${runs.length} runs to TinyFish...`);

      let runIds: string[];
      try {
        runIds = await submitBatch(runs);
        log(`Batch accepted — ${runIds.length} runs queued`);
      } catch (err: any) {
        log(`Batch submit failed: ${err.message}`);
        PLATFORMS.forEach((p) =>
          send('platform_error', { platform: p.name, error: 'Batch submit failed' })
        );
        send('done', {});
        controller.close();
        return;
      }

      // Map run_id → platform
      const runMap = new Map(runIds.map((id, i) => [id, PLATFORMS[i]]));
      const runStates = new Map<string, string>(runIds.map((id) => [id, 'PENDING']));

      // Send initial "searching" for all platforms
      PLATFORMS.forEach((p) => send('status', { platform: p.name, status: 'searching' }));

      // ── 2. Poll until all complete ──────────────────────────────────────────
      const pending = new Set(runIds);
      const POLL_INTERVAL = 5_000;
      const startTime = Date.now();

      // No client-side timeout — we let TinyFish signal FAILED/CANCELLED itself
      while (pending.size > 0) {
        await sleep(POLL_INTERVAL);

        const polls = await Promise.allSettled([...pending].map((id) => pollRun(id)));

        for (const poll of polls) {
          if (poll.status !== 'fulfilled') continue;
          const run = poll.value;
          const platform = runMap.get(run.run_id);
          if (!platform) continue;

          const prevState = runStates.get(run.run_id);

          // State transition: PENDING → RUNNING
          if (prevState !== run.status) {
            runStates.set(run.run_id, run.status);

            if (run.status === 'RUNNING') {
              log(`${platform.name}: browser active, scanning listings...`);
              // Send streaming_url so client can embed live preview
              if (run.streaming_url) {
                send('streaming_url', {
                  platform: platform.name,
                  url: run.streaming_url,
                });
              }
            }
          }

          if (run.status === 'COMPLETED') {
            pending.delete(run.run_id);
            console.log(`[TinyFish COMPLETE] ${platform.name} result_json type:`, typeof run.result, Array.isArray(run.result) ? 'array' : '');
            if (run.result && typeof run.result === 'object') {
              console.log(`[TinyFish COMPLETE] ${platform.name} result_json keys:`, Array.isArray(run.result) ? `array[${run.result.length}]` : Object.keys(run.result));
            }
            const listings = normalizeListings(run.result ?? [], platform.name);
            const duration = Date.now() - startTime;
            log(`${platform.name}: complete — ${listings.length} listing${listings.length !== 1 ? 's' : ''} found (${(duration / 1000).toFixed(0)}s)`);
            send('result', {
              platform: platform.name,
              platformId: platform.id,
              listings,
              duration,
              recipe: { url: platform.url(product), goal: platform.goal(product) },
            });
          } else if (run.status === 'FAILED' || run.status === 'CANCELLED') {
            pending.delete(run.run_id);
            const errMsg = run.error?.message ?? run.status;
            log(`${platform.name}: failed — ${errMsg}`);
            send('platform_error', { platform: platform.name, error: errMsg });
          }
        }
      }

      clearInterval(heartbeat);
      const total = Date.now() - startTime;
      log(`Scan complete in ${(total / 1000).toFixed(0)}s`);
      send('done', {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
