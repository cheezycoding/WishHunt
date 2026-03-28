'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WatchItem } from '@/lib/types';
import { getWatchlist, deleteWatchItem } from '@/lib/storage';
import PriceCard from '@/components/PriceCard';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', SGD: 'S$', CHF: 'CHF ', JPY: '¥',
};

function fmt(price: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' ';
  return `${sym}${price.toLocaleString()}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SortOption = 'price_asc' | 'price_desc' | 'platform' | 'condition';

const toUSD = (price: number, currency: string) => {
  if (currency === 'SGD') return price * 0.74;
  if (currency === 'EUR') return price * 1.08;
  if (currency === 'GBP') return price * 1.27;
  if (currency === 'CHF') return price * 1.11;
  return price;
};

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');

  useEffect(() => {
    setItems(getWatchlist());
  }, []);

  const handleDelete = (id: string) => {
    deleteWatchItem(id);
    setItems(getWatchlist());
    if (expanded === id) setExpanded(null);
  };

  const handleRefresh = (item: WatchItem) => {
    // Navigate to search page — full live scan experience
    sessionStorage.setItem('wishhunt_product', JSON.stringify(item.product));
    router.push(`/search?q=${encodeURIComponent(item.product.searchQuery || item.product.name)}`);
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="border-b border-zinc-900 px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] text-zinc-700 tracking-widest mb-1">/02 — PRICE ALERTS</p>
            <h1 className="font-sans font-bold text-white" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1 }}>
              Watchlist
            </h1>
            <p className="font-sans text-sm text-zinc-600 mt-1">
              {items.length} active alert{items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="font-sans text-sm font-medium px-4 py-2.5 border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300 transition-colors rounded-sm flex-shrink-0"
          >
            + New search
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-zinc-900 rounded-sm border-dashed">
            <p className="font-sans text-sm text-zinc-600">No active alerts</p>
            <p className="font-sans text-xs text-zinc-700 mt-1">Search for a product and set a price target</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 font-sans text-sm font-semibold px-5 py-2.5 bg-white text-black hover:bg-zinc-200 transition-colors rounded-sm"
            >
              Start hunting →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-sm overflow-hidden">
            {items.map((item) => {
              const isTriggered = item.triggered || (
                item.currentBestPrice !== undefined &&
                item.currentBestPrice <= item.targetPrice
              );
              const isOpen = expanded === item.id;
              const listings = item.lastListings ?? [];
              const sorted = [...listings].sort((a, b) => {
                if (sortBy === 'price_asc') return toUSD(a.price, a.currency) - toUSD(b.price, b.currency);
                if (sortBy === 'price_desc') return toUSD(b.price, b.currency) - toUSD(a.price, a.currency);
                if (sortBy === 'platform') return a.platform.localeCompare(b.platform);
                if (sortBy === 'condition') return (a.condition ?? '').localeCompare(b.condition ?? '');
                return 0;
              });

              return (
                <div
                  key={item.id}
                  className={`bg-zinc-950 transition-all ${isTriggered ? 'border-l-2 border-l-white' : ''}`}
                >
                  {/* Clickable header row */}
                  <div
                    className="px-5 py-5 cursor-pointer select-none hover:bg-[#111] transition-colors"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {isTriggered && (
                            <span className="font-sans text-[10px] font-semibold text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                              Target hit
                            </span>
                          )}
                          <span className="font-sans text-xs text-zinc-600">
                            {item.recipes.map((r) => r.platform).join(' · ')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <h2 className="font-sans text-lg font-bold text-white truncate leading-tight">
                            {item.product.name}
                          </h2>
                          <span className={`font-sans text-zinc-600 text-sm transition-transform inline-block ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                        </div>
                        {item.product.brand && (
                          <p className="font-sans text-xs text-zinc-600 mt-0.5">{item.product.brand}</p>
                        )}
                      </div>

                      {/* Right: prices */}
                      <div className="text-right flex-shrink-0 space-y-2">
                        <div>
                          <p className="font-sans text-xs text-zinc-600 mb-0.5">Target</p>
                          <p className="font-mono text-xl font-bold text-white leading-none">{fmt(item.targetPrice, item.currency)}</p>
                        </div>
                        {item.currentBestPrice !== undefined && (
                          <div>
                            <p className="font-sans text-xs text-zinc-600 mb-0.5">Current best</p>
                            <p className={`font-mono text-sm font-bold leading-none ${item.currentBestPrice <= item.targetPrice ? 'text-white' : 'text-zinc-300'}`}>
                              {fmt(item.currentBestPrice, item.currency)}
                            </p>
                            {item.currentBestPlatform && (
                              <p className="font-sans text-xs text-zinc-600 mt-0.5">{item.currentBestPlatform}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer row */}
                    <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-sans text-xs text-zinc-700">Created {timeAgo(item.createdAt)}</span>
                        {item.lastChecked && (
                          <span className="font-sans text-xs text-zinc-700">Checked {timeAgo(item.lastChecked)}</span>
                        )}
                        {listings.length > 0 && (
                          <span className="font-sans text-xs text-zinc-700">{listings.length} listing{listings.length !== 1 ? 's' : ''} saved</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRefresh(item)}
                          className="font-sans text-xs text-zinc-600 hover:text-white transition-colors"
                        >
                          Refresh ↗
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="font-sans text-xs text-zinc-700 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: price grid */}
                  {isOpen && (
                    <div className="border-t border-zinc-900 px-5 pb-5 pt-4 bg-black/20 animate-slide-up">
                      {sorted.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="font-sans text-sm text-zinc-600">No listings saved</p>
                          <p className="font-sans text-xs text-zinc-700 mt-1">Hit Refresh ↗ to scan now</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                            <span className="font-sans text-xs text-zinc-600">
                              {sorted.length} listing{sorted.length !== 1 ? 's' : ''} · Last scan {item.lastChecked ? timeAgo(item.lastChecked) : timeAgo(item.createdAt)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {(['price_asc', 'price_desc', 'platform', 'condition'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={(e) => { e.stopPropagation(); setSortBy(opt); }}
                                  className={`font-sans text-xs px-3 py-1.5 rounded-full transition-colors ${
                                    sortBy === opt ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600'
                                  }`}
                                >
                                  {opt === 'price_asc' ? 'Price ↑' : opt === 'price_desc' ? 'Price ↓' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {sorted.map((listing, i) => (
                              <PriceCard key={`${listing.platform}-${i}`} listing={listing} platform={listing.platform} rank={i + 1} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <p className="font-sans text-xs text-zinc-800 text-center mt-8">
            Prices checked every 12 hours · Use Refresh ↗ to re-scan now
          </p>
        )}
      </div>
    </div>
  );
}
