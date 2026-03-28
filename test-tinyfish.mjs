// Quick test — submit ONE Chrono24 run, poll till done, dump raw result_json
const API_KEY = 'sk-tinyfish-oCpoPPr9djHhrJlVBHosQqTPILCdxjWB';
const BASE = 'https://agent.tinyfish.ai';
const PRODUCT = 'Rolex Submariner 126610LN';

// First cancel any stale pending runs so we don't hit 429
console.log('Checking for stale pending runs...');
const listRes = await fetch(`${BASE}/v1/runs?status=PENDING&limit=50`, {
  headers: { 'X-API-Key': API_KEY },
});
if (listRes.ok) {
  const listData = await listRes.json();
  const pending = (listData.runs ?? listData.run_ids ?? []).map((r) => r.run_id ?? r).filter(Boolean);
  if (pending.length > 0) {
    console.log(`Cancelling ${pending.length} stale pending runs...`);
    await Promise.all(pending.map((id) =>
      fetch(`${BASE}/v1/runs/${id}/cancel`, { method: 'POST', headers: { 'X-API-Key': API_KEY } })
    ));
    await new Promise(r => setTimeout(r, 2000));
  }
}

const platforms = [
  {
    name: 'Chrono24',
    url: `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(PRODUCT)}&dosearch=1`,
    goal: `Search for "${PRODUCT}" on this page. Find all watch listings shown in the search results. Return a JSON array of up to 8 results:
[{
  "price": 13500.00,
  "currency": "USD",
  "condition": "Pre-owned",
  "listingUrl": "https://www.chrono24.com/watches/ref-12345.htm",
  "sellerName": "Chrono24 Dealer",
  "title": "${PRODUCT}"
}]
Only include items that match or closely match "${PRODUCT}". If no results found, return [].`,
  },
  {
    name: 'StockX',
    url: `https://stockx.com/search?s=${encodeURIComponent(PRODUCT)}`,
    goal: `Search for "${PRODUCT}" on this page. Find all product listings shown in the search results. Return a JSON array of up to 8 results:
[{
  "price": 12500.00,
  "currency": "USD",
  "condition": "New",
  "listingUrl": "https://stockx.com/example-product",
  "sellerName": "StockX",
  "title": "${PRODUCT}"
}]
Only include items that match or closely match "${PRODUCT}". If no results found, return [].`,
  },
];

console.log(`Submitting ${platforms.length} runs...`);
const submitRes = await fetch(`${BASE}/v1/automation/run-batch`, {
  method: 'POST',
  headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ runs: platforms.map(p => ({ url: p.url, goal: p.goal, browser_profile: 'stealth' })) }),
});
const submitData = await submitRes.json();
console.log('Submit status:', submitRes.status, JSON.stringify(submitData));
if (!submitData.run_ids?.length) process.exit(1);

const runMap = new Map(submitData.run_ids.map((id, i) => [id, platforms[i].name]));
const pending = new Set(submitData.run_ids);

console.log('Polling...\n');
let t = 0;
while (pending.size > 0) {
  await new Promise(r => setTimeout(r, 5000));
  t += 5;
  for (const id of [...pending]) {
    const pollRes = await fetch(`${BASE}/v1/runs/${id}`, { headers: { 'X-API-Key': API_KEY } });
    const data = await pollRes.json();
    const name = runMap.get(id);
    process.stdout.write(`[${t}s] ${name}: ${data.status}\n`);
    if (data.status === 'COMPLETED') {
      pending.delete(id);
      console.log(`\n=== ${name} RAW result_json ===`);
      console.log(JSON.stringify(data.result_json, null, 2));
    } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
      pending.delete(id);
      console.log(`\n${name} FAILED/CANCELLED:`, JSON.stringify(data.error));
    }
  }
  if (t > 600) { console.log('Giving up after 10 min'); break; }
}
