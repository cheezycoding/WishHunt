'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { IdentifiedProduct, Listing, WatchRecipe } from '@/lib/types';
import { PLATFORMS } from '@/lib/platforms';
import StatusLog, { PlatformStatus } from '@/components/StatusLog';
import PriceCard from '@/components/PriceCard';
import AlertModal from '@/components/AlertModal';

interface PlatformStatusEntry {
  platform: string;
  status: PlatformStatus;
  count?: number;
  duration?: number;
  error?: string;
}

interface ListingWithPlatform extends Listing {
  platform: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') ?? '';

  const [product, setProduct] = useState<IdentifiedProduct | null>(null);
  const [statuses, setStatuses] = useState<PlatformStatusEntry[]>([]);
  const [listings, setListings] = useState<ListingWithPlatform[]>([]);
  const [recipes, setRecipes] = useState<WatchRecipe[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [savedAlert, setSavedAlert] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'platform' | 'condition'>('price_asc');
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);
  const [streamingUrls, setStreamingUrls] = useState<Record<string, string>>({});
  const [livePreview, setLivePreview] = useState<{ platform: string; url: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load product from sessionStorage or build from query
  useEffect(() => {
    const stored = sessionStorage.getItem('wishhunt_product');
    if (stored) {
      try {
        setProduct(JSON.parse(stored));
      } catch {
        setProduct({ name: query, brand: '', model: '', searchQuery: query });
      }
    } else {
      setProduct({ name: query, brand: '', model: '', searchQuery: query });
    }
  }, [query]);

  // Submit batch then poll until all done
  useEffect(() => {
    if (!product || !query) return;

    setStatuses(PLATFORMS.map((p) => ({ platform: p.name, status: 'pending' as PlatformStatus })));
    setListings([]);
    setRecipes([]);
    setIsDone(false);
    setElapsed(0);
    setLogs([]);
    setStreamingUrls({});
    setLivePreview(null);
    startTimeRef.current = Date.now();

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    const abort = new AbortController();
    abortRef.current = abort;

    const addLog = (msg: string) =>
      setLogs((prev) => [...prev, {
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        msg,
      }]);

    (async () => {
      try {
        // ── 1. Submit batch (short-lived call, ~2s) ─────────────────────────
        addLog(`Submitting 5 runs to TinyFish...`);
        const submitRes = await fetch(
          `/api/search?product=${encodeURIComponent(product.searchQuery || query)}`,
          { signal: abort.signal }
        );
        if (!submitRes.ok) {
          const text = await submitRes.text();
          throw new Error(`Submit failed (${submitRes.status}): ${text.slice(0, 200)}`);
        }
        const { runs: runMeta } = await submitRes.json();
        addLog(`Batch accepted — ${runMeta.length} runs queued`);

        // Mark all platforms as "searching"
        PLATFORMS.forEach((p) =>
          setStatuses((prev) =>
            prev.map((s) => s.platform === p.name ? { ...s, status: 'searching' } : s)
          )
        );

        // ── 2. Poll every 5s (each call is ~1s) ──────────────────────────────
        const pending = new Set<string>(runMeta.map((r: any) => r.runId));

        const poll = async () => {
          if (pending.size === 0) return;
          if (abort.signal.aborted) return;

          const runsParam = encodeURIComponent(
            JSON.stringify(runMeta.filter((r: any) => pending.has(r.runId)))
          );

          let pollRes: Response;
          try {
            pollRes = await fetch(`/api/poll?runs=${runsParam}`, { signal: abort.signal });
          } catch {
            return; // network hiccup, retry next interval
          }
          if (!pollRes.ok) return;

          const { updates } = await pollRes.json();
          const now = Date.now();

          for (const u of updates) {
            if (u.streaming_url) {
              setStreamingUrls((prev) => ({ ...prev, [u.platform]: u.streaming_url }));
              setLivePreview((prev) => prev ?? { platform: u.platform, url: u.streaming_url });
            }

            if (u.status === 'RUNNING') {
              addLog(`${u.platform}: browser active, scanning...`);
            }

            if (u.status === 'COMPLETED') {
              pending.delete(u.runId);
              const dur = now - startTimeRef.current;
              const count = u.listings?.length ?? 0;
              addLog(`${u.platform}: complete — ${count} listing${count !== 1 ? 's' : ''} found (${(dur / 1000).toFixed(0)}s)`);
              setStatuses((prev) =>
                prev.map((s) => s.platform === u.platform ? { ...s, status: 'done', count, duration: dur } : s)
              );
              if (count > 0) {
                setListings((prev) => [
                  ...prev,
                  ...u.listings.map((l: Listing) => ({ ...l, platform: u.platform })),
                ]);
              }
              if (u.recipe) {
                setRecipes((prev) => [
                  ...prev,
                  { platform: u.platform, url: u.recipe.url, goal: u.recipe.goal },
                ]);
              }
            } else if (u.status === 'FAILED' || u.status === 'CANCELLED') {
              pending.delete(u.runId);
              addLog(`${u.platform}: failed — ${u.error ?? u.status}`);
              setStatuses((prev) =>
                prev.map((s) => s.platform === u.platform ? { ...s, status: 'error', error: u.error } : s)
              );
            }
          }

          if (pending.size === 0) {
            clearInterval(pollRef.current!);
            clearInterval(timer);
            addLog(`Scan complete in ${((Date.now() - startTimeRef.current) / 1000).toFixed(0)}s`);
            setIsDone(true);
          }
        };

        pollRef.current = setInterval(poll, 5000);
        poll(); // immediate first check

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[WishHunt] Search error:', err);
          clearInterval(timer);
          setIsDone(true);
        }
      }
    })();

    return () => {
      clearInterval(timer);
      if (pollRef.current) clearInterval(pollRef.current);
      abort.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.searchQuery]);

  const toUSD = (price: number, currency: string) => {
    if (currency === 'SGD') return price * 0.74;
    if (currency === 'EUR') return price * 1.08;
    if (currency === 'GBP') return price * 1.27;
    if (currency === 'CHF') return price * 1.11;
    return price;
  };

  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === 'price_asc') return toUSD(a.price, a.currency) - toUSD(b.price, b.currency);
    if (sortBy === 'price_desc') return toUSD(b.price, b.currency) - toUSD(a.price, a.currency);
    if (sortBy === 'platform') return a.platform.localeCompare(b.platform);
    if (sortBy === 'condition') return (a.condition ?? '').localeCompare(b.condition ?? '');
    return 0;
  });

  const bestListing = sortedListings[0];
  const totalFound = listings.length;
  const searchingCount = statuses.filter((s) => s.status === 'searching').length;
  const doneCount = statuses.filter((s) => s.status === 'done' || s.status === 'error').length;

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Page header */}
      <div className="border-b border-zinc-900 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="font-sans text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-4 block"
          >
            ← New search
          </button>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="font-mono text-[10px] text-zinc-700 tracking-widest mb-1">/01 — SEARCH RESULTS</p>
              <h1 className="font-sans font-bold text-white leading-tight" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.8rem)' }}>
                {product?.name ?? query}
              </h1>
              {product?.brand && (
                <p className="font-sans text-sm text-zinc-500 mt-1">{product.brand}</p>
              )}
            </div>

            {isDone && totalFound > 0 && !savedAlert && (
              <button
                onClick={() => setShowAlert(true)}
                className="font-sans text-sm font-semibold px-5 py-2.5 bg-white text-black hover:bg-zinc-200 transition-colors rounded-sm flex-shrink-0"
              >
                Alert me when under $X →
              </button>
            )}
            {savedAlert && (
              <span className="font-sans text-sm text-zinc-400 font-medium">✓ Alert saved</span>
            )}
          </div>

          {/* Thin progress bar */}
          {!isDone && (
            <div className="mt-5 h-px bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-700"
                style={{ width: `${(doneCount / PLATFORMS.length) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left: Status log */}
          <div className="space-y-3">
            <StatusLog
              entries={statuses}
              elapsed={elapsed}
              isDone={isDone}
              logs={logs}
              streamingUrls={streamingUrls}
              onLivePreview={(platform, url) => setLivePreview({ platform, url })}
            />

            {isDone && (
              <div className="border border-zinc-900 rounded-sm bg-zinc-950 p-4 animate-slide-up">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans text-xs text-zinc-600">Total found</span>
                  <span className="font-mono text-xs text-zinc-400">{totalFound} listings</span>
                </div>
                {bestListing && (
                  <div className="mt-3 pt-3 border-t border-zinc-900">
                    <p className="font-sans text-xs text-zinc-600 mb-1">Best price</p>
                    <p className="font-mono text-2xl font-bold text-white">
                      {bestListing.currency === 'SGD' ? 'S$' : bestListing.currency === 'EUR' ? '€' : bestListing.currency === 'GBP' ? '£' : '$'}
                      {bestListing.price.toLocaleString()}
                    </p>
                    <p className="font-sans text-xs text-zinc-600 mt-0.5">on {bestListing.platform}</p>
                  </div>
                )}
              </div>
            )}

            {isDone && !savedAlert && totalFound > 0 && (
              <button
                onClick={() => setShowAlert(true)}
                className="w-full font-sans text-sm font-semibold py-3 bg-white text-black hover:bg-zinc-200 transition-colors rounded-sm"
              >
                Set price alert →
              </button>
            )}
          </div>

          {/* Right: Price grid */}
          <div>
            {sortedListings.length === 0 && !isDone && (
              <div className="flex flex-col items-center justify-center h-64 border border-zinc-900 rounded-sm border-dashed">
                <div className="flex gap-2 mb-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-800 animate-pulse"
                      style={{ animationDelay: `${i * 0.25}s` }}
                    />
                  ))}
                </div>
                <p className="font-sans text-sm text-zinc-600">
                  {searchingCount > 0
                    ? `Scanning ${searchingCount} platform${searchingCount > 1 ? 's' : ''}...`
                    : 'Initializing...'}
                </p>
              </div>
            )}

            {isDone && sortedListings.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 border border-zinc-900 rounded-sm border-dashed">
                <p className="font-sans text-sm text-zinc-500">No listings found</p>
                <p className="font-sans text-xs text-zinc-700 mt-1">Try a more specific search query</p>
              </div>
            )}

            {sortedListings.length > 0 && (
              <>
                {/* Sort bar — pill style like Novure filters */}
                <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
                  <span className="font-sans text-sm text-zinc-500">
                    {sortedListings.length} listing{sortedListings.length !== 1 ? 's' : ''}
                    {!isDone && <span className="text-amber-400 animate-pulse ml-2 text-xs">· live</span>}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['price_asc', 'price_desc', 'platform', 'condition'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSortBy(opt)}
                        className={`font-sans text-xs px-3 py-1.5 rounded-full transition-colors ${
                          sortBy === opt
                            ? 'bg-zinc-700 text-white'
                            : 'text-zinc-600 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {opt === 'price_asc' ? 'Price ↑' : opt === 'price_desc' ? 'Price ↓' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {sortedListings.map((listing, i) => (
                    <div key={`${listing.platform}-${i}`} className="animate-slide-up">
                      <PriceCard listing={listing} platform={listing.platform} rank={i + 1} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live browser preview modal */}
      {livePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setLivePreview(null)} />
          <div className="relative z-10 w-full max-w-4xl border border-zinc-800 rounded-sm bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                <span className="font-sans text-sm font-medium text-zinc-300">
                  Live browser · {livePreview.platform}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {Object.entries(streamingUrls).filter(([p]) => p !== livePreview.platform).map(([platform, url]) => (
                  <button
                    key={platform}
                    onClick={() => setLivePreview({ platform, url })}
                    className="font-sans text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {platform}
                  </button>
                ))}
                <button onClick={() => setLivePreview(null)} className="font-sans text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-2">
                  ✕
                </button>
              </div>
            </div>
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe src={livePreview.url} className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
            </div>
          </div>
        </div>
      )}

      {/* Alert modal */}
      {showAlert && product && (
        <AlertModal
          product={product}
          bestListing={bestListing as any}
          allListings={sortedListings}
          recipes={recipes}
          onClose={() => setShowAlert(false)}
          onSaved={() => setSavedAlert(true)}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center">
        <span className="font-mono text-xs text-zinc-600 tracking-widest">LOADING...</span>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
