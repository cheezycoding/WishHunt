import { Listing } from './types';

const BASE = 'https://agent.tinyfish.ai';

function authHeaders() {
  return {
    'X-API-Key': process.env.TINYFISH_API_KEY!,
    'Content-Type': 'application/json',
  };
}

export interface BatchRun {
  url: string;
  goal: string;
}

export interface RunStatus {
  run_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: any;
  streaming_url?: string;
  error?: { message: string };
  num_of_steps?: number;
}

export async function cancelRun(run_id: string): Promise<void> {
  await fetch(`${BASE}/v1/runs/${run_id}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  }).catch(() => {});
}

export async function listActiveRuns(): Promise<string[]> {
  const res = await fetch(`${BASE}/v1/runs?status=PENDING&limit=50`, {
    headers: { 'X-API-Key': process.env.TINYFISH_API_KEY! },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.runs ?? data.run_ids ?? []).map((r: any) => r.run_id ?? r).filter(Boolean);
}

export async function submitBatch(runs: BatchRun[]): Promise<string[]> {
  // On 429, cancel all pending runs and retry once
  const attemptSubmit = async () => {
    const res = await fetch(`${BASE}/v1/automation/run-batch`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        runs: runs.map((r) => ({ ...r, browser_profile: 'stealth' })),
      }),
    });
    return res;
  };

  let res = await attemptSubmit();

  if (res.status === 429) {
    // Cancel pending runs to free up slots, then retry
    const pending = await listActiveRuns();
    await Promise.allSettled(pending.map(cancelRun));
    await new Promise((r) => setTimeout(r, 2000));
    res = await attemptSubmit();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Batch submit failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.run_ids) throw new Error(`No run_ids in response: ${JSON.stringify(data)}`);
  return data.run_ids as string[];
}

export async function pollRun(run_id: string): Promise<RunStatus> {
  const res = await fetch(`${BASE}/v1/runs/${run_id}`, {
    headers: { 'X-API-Key': process.env.TINYFISH_API_KEY! },
  });
  if (!res.ok) throw new Error(`Poll failed (${res.status}) for ${run_id}`);
  return res.json();
}

export function normalizeListings(result_json: any, platformName?: string): Listing[] {
  // TinyFish sometimes returns a JSON string instead of a parsed object
  let parsed = result_json;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return []; }
  }

  if (!parsed) return [];

  // Log raw shape for debugging
  console.log(`[normalizeListings] ${platformName ?? '?'} raw keys:`, Array.isArray(parsed) ? `array[${parsed.length}]` : (parsed && typeof parsed === 'object' ? Object.keys(parsed) : typeof parsed));

  let raw: any[] = [];

  if (Array.isArray(parsed)) {
    raw = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // Try every common envelope key TinyFish might use
    const candidate =
      parsed.listings ??
      parsed.items ??
      parsed.results ??
      parsed.data ??
      parsed.products ??
      parsed.rows ??
      parsed.watches ??
      parsed.offers ??
      parsed.hits ??
      null;

    if (Array.isArray(candidate)) {
      raw = candidate;
    } else {
      // Last resort: scan all keys for the first array value
      const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
      if (firstArray) {
        raw = firstArray as any[];
      } else if (parsed.price !== undefined) {
        raw = [parsed];
      }
    }
  }

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      // Price: handle number, string, or "USD 28,260" style values
      const rawPrice =
        item.price ?? item.Price ?? item.current_price ?? item.amount ?? item.asking_price ?? 0;
      const price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;

      return {
        price,
        currency: item.currency ?? item.Currency ?? 'USD',
        condition: item.condition ?? item.Condition ?? item.condition_name ?? 'Unknown',
        listingUrl: item.listingUrl ?? item.listing_url ?? item.url ?? item.link ?? item.href ?? '#',
        sellerName: item.sellerName ?? item.seller_name ?? item.seller ?? item.username ?? 'Unknown',
        title: item.title ?? item.name ?? item.product_name ?? item.Title ?? '',
        imageUrl: item.imageUrl ?? item.image_url ?? item.image ?? item.thumbnail ?? undefined,
      };
    })
    .filter((item) => item.price > 0); // still filter zero-price junk
}
