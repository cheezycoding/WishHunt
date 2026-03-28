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

  // Start SSE search when product is ready
  useEffect(() => {
    if (!product || !query) return;

    // Init statuses
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

    const url = `/api/search?product=${encodeURIComponent(product.searchQuery || query)}`;

    (async () => {
      try {
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        const handleEvent = (type: string, raw: string) => {
          if (!raw) return;
          try {
            const data = JSON.parse(raw);
            if (type === 'status') {
              setStatuses((prev) =>
                prev.map((s) => s.platform === data.platform ? { ...s, status: data.status } : s)
              );
            } else if (type === 'result') {
              console.log('[WishHunt] result event:', data.platform, 'listings:', data.listings.length, data.listings[0] ?? 'EMPTY');
              setStatuses((prev) =>
                prev.map((s) =>
                  s.platform === data.platform
                    ? { ...s, status: 'done', count: data.listings.length, duration: data.duration }
                    : s
                )
              );
              if (data.listings.length > 0) {
                setListings((prev) => [
                  ...prev,
                  ...data.listings.map((l: Listing) => ({ ...l, platform: data.platform })),
                ]);
              }
              if (data.recipe) {
                setRecipes((prev) => [
                  ...prev,
                  { platform: data.platform, url: data.recipe.url, goal: data.recipe.goal },
                ]);
              }
            } else if (type === 'platform_error') {
              setStatuses((prev) =>
                prev.map((s) =>
                  s.platform === data.platform ? { ...s, status: 'error', error: data.error } : s
                )
              );
            } else if (type === 'log') {
              setLogs((prev) => [...prev, { time: data.time, msg: data.msg }]);
            } else if (type === 'streaming_url') {
              setStreamingUrls((prev) => ({ ...prev, [data.platform]: data.url }));
              setLivePreview((prev) => prev ?? { platform: data.platform, url: data.url });
            } else if (type === 'done') {
              clearInterval(timer);
              setIsDone(true);
            }
          } catch (e) {
            console.error('[WishHunt] Failed to parse SSE event', type, raw, e);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // Split on double newline (SSE event boundary)
          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';

          for (const part of parts) {
            if (!part.trim() || part.startsWith(':')) continue; // heartbeat / comment
            let eventType = 'message';
            let eventData = '';
            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7).trim();
              else if (line.startsWith('data: ')) eventData = line.slice(6).trim();
            }
            handleEvent(eventType, eventData);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('[WishHunt] Stream error:', err);
          clearInterval(timer);
          setIsDone(true);
        }
      }
    })();

    return () => {
      clearInterval(timer);
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
    <div className="min-h-[calc(100vh-48px)] px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-4 block tracking-widest"
          >
            ← NEW SEARCH
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-mono text-2xl font-bold text-white">
                {product?.name ?? query}
              </h1>
              {product?.brand && (
                <p className="font-mono text-sm text-zinc-500 mt-1">{product.brand}</p>
              )}
            </div>

            {isDone && totalFound > 0 && (
              <div className="flex items-center gap-3 flex-shrink-0">
                {savedAlert ? (
                  <span className="font-mono text-xs text-emerald-500 tracking-widest">
                    ✓ ALERT SAVED
                  </span>
                ) : (
                  <button
                    onClick={() => setShowAlert(true)}
                    className="font-mono text-xs tracking-widest px-4 py-2 border border-gold text-gold hover:bg-gold hover:text-black transition-all rounded-sm"
                  >
                    ALERT ME WHEN UNDER $X
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          {!isDone && (
            <div className="mt-4 h-px bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-500"
                style={{ width: `${(doneCount / PLATFORMS.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Left: Status log */}
          <div className="space-y-4">
            <StatusLog
              entries={statuses}
              elapsed={elapsed}
              isDone={isDone}
              logs={logs}
              streamingUrls={streamingUrls}
              onLivePreview={(platform, url) => setLivePreview({ platform, url })}
            />

            {isDone && (
              <div className="border border-zinc-800 rounded-sm bg-zinc-950 p-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-600 tracking-widest">SCAN COMPLETE</span>
                  <span className="font-mono text-xs text-emerald-500">{totalFound} listings</span>
                </div>
                {bestListing && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="font-mono text-xs text-zinc-600 mb-1 tracking-widest">BEST PRICE</p>
                    <p className="font-mono text-2xl font-bold text-gold">
                      {bestListing.currency === 'SGD' ? 'S$' : bestListing.currency === 'EUR' ? '€' : bestListing.currency === 'GBP' ? '£' : '$'}
                      {bestListing.price.toLocaleString()}
                    </p>
                    <p className="font-mono text-xs text-zinc-500 mt-0.5">on {bestListing.platform}</p>
                  </div>
                )}
              </div>
            )}

            {isDone && !savedAlert && totalFound > 0 && (
              <button
                onClick={() => setShowAlert(true)}
                className="w-full font-mono text-xs tracking-widest py-3 bg-gold text-black hover:bg-amber-400 transition-colors rounded-sm"
              >
                SET PRICE ALERT →
              </button>
            )}
          </div>

          {/* Right: Price grid */}
          <div>
            {sortedListings.length === 0 && !isDone && (
              <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-sm border-dashed">
                <div className="flex gap-1.5 mb-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-xs text-zinc-600 tracking-widest">
                  {searchingCount > 0
                    ? `SCANNING ${searchingCount} PLATFORM${searchingCount > 1 ? 'S' : ''}...`
                    : 'INITIALIZING...'}
                </p>
              </div>
            )}

            {isDone && sortedListings.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-sm border-dashed">
                <p className="font-mono text-xs text-zinc-600 tracking-widest">NO LISTINGS FOUND</p>
                <p className="font-mono text-xs text-zinc-700 mt-2">Try a more specific search query</p>
              </div>
            )}

            {sortedListings.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4 gap-4">
                  <span className="font-mono text-xs text-zinc-600 tracking-widest flex-shrink-0">
                    {sortedListings.length} LISTING{sortedListings.length !== 1 ? 'S' : ''}
                    {!isDone && <span className="text-amber-400 animate-pulse ml-2">· LIVE</span>}
                  </span>
                  <div className="flex items-center gap-1">
                    {(['price_asc', 'price_desc', 'platform', 'condition'] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSortBy(opt)}
                        className={`font-mono text-xs px-2 py-1 rounded-sm tracking-widest transition-colors ${
                          sortBy === opt
                            ? 'bg-zinc-800 text-zinc-200'
                            : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                      >
                        {opt === 'price_asc' ? 'PRICE ↑' : opt === 'price_desc' ? 'PRICE ↓' : opt.toUpperCase()}
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
          <div className="relative z-10 w-full max-w-4xl border border-zinc-700 rounded-sm bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs text-zinc-400 tracking-widest">
                  LIVE BROWSER · {livePreview.platform.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {Object.entries(streamingUrls).filter(([p]) => p !== livePreview.platform).map(([platform, url]) => (
                  <button
                    key={platform}
                    onClick={() => setLivePreview({ platform, url })}
                    className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors tracking-widest"
                  >
                    {platform.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => setLivePreview(null)}
                  className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={livePreview.url}
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
              />
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
