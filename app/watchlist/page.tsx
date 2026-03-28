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
    <div className="min-h-[calc(100vh-48px)] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-mono text-2xl font-bold text-white">WATCHLIST</h1>
            <p className="font-mono text-xs text-zinc-600 mt-1 tracking-widest">
              {items.length} ACTIVE ALERT{items.length !== 1 ? 'S' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="font-mono text-xs tracking-widest px-4 py-2 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors rounded-sm"
          >
            + NEW SEARCH
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-sm border-dashed">
            <p className="font-mono text-xs text-zinc-600 tracking-widest">NO ACTIVE ALERTS</p>
            <p className="font-mono text-xs text-zinc-700 mt-2">
              Search for a product and set a price target
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 font-mono text-xs tracking-widest px-4 py-2 bg-gold text-black hover:bg-amber-400 transition-colors rounded-sm"
            >
              START SEARCHING →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
                  className={`border rounded-sm bg-zinc-950 transition-all ${
                    isTriggered
                      ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(34,197,94,0.05)]'
                      : 'border-zinc-800'
                  }`}
                >
                  {/* Card header — clickable to expand */}
                  <div
                    className="p-5 cursor-pointer select-none"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isTriggered && (
                            <span className="font-mono text-xs text-emerald-500 border border-emerald-500/30 px-1.5 py-0.5 rounded-sm tracking-widest">
                              TARGET HIT
                            </span>
                          )}
                          <span className="font-mono text-xs text-zinc-600 tracking-widest">
                            {item.recipes.map((r) => r.platform).join(' · ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-mono text-base font-bold text-white truncate">
                            {item.product.name}
                          </h2>
                          <span className={`font-mono text-xs text-zinc-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            ▾
                          </span>
                        </div>
                        {item.product.brand && (
                          <p className="font-mono text-xs text-zinc-500 mt-0.5">{item.product.brand}</p>
                        )}
                      </div>

                      {/* Right: Price */}
                      <div className="text-right flex-shrink-0">
                        <div className="mb-3">
                          <p className="font-mono text-xs text-zinc-600 tracking-widest mb-0.5">TARGET</p>
                          <p className="font-mono text-xl font-bold text-gold">
                            {fmt(item.targetPrice, item.currency)}
                          </p>
                        </div>
                        {item.currentBestPrice !== undefined && (
                          <div>
                            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-0.5">CURRENT BEST</p>
                            <p className={`font-mono text-sm font-bold ${
                              item.currentBestPrice <= item.targetPrice ? 'text-emerald-400' : 'text-zinc-300'
                            }`}>
                              {fmt(item.currentBestPrice, item.currency)}
                            </p>
                            {item.currentBestPlatform && (
                              <p className="font-mono text-xs text-zinc-600">{item.currentBestPlatform}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-zinc-700">
                          CREATED {timeAgo(item.createdAt)}
                        </span>
                        {item.lastChecked && (
                          <span className="font-mono text-xs text-zinc-700">
                            CHECKED {timeAgo(item.lastChecked)}
                          </span>
                        )}
                        {listings.length > 0 && (
                          <span className="font-mono text-xs text-zinc-700">
                            {listings.length} LISTING{listings.length !== 1 ? 'S' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRefresh(item)}
                          className="font-mono text-xs text-zinc-600 hover:text-gold transition-colors tracking-widest"
                        >
                          REFRESH ↗
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="font-mono text-xs text-zinc-700 hover:text-red-400 transition-colors tracking-widest"
                        >
                          REMOVE
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: price grid */}
                  {isOpen && (
                    <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
                      {sorted.length === 0 ? (
                        <p className="font-mono text-xs text-zinc-600 tracking-widest text-center py-6">
                          NO LISTINGS SAVED · HIT REFRESH TO SCAN NOW
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4 gap-4">
                            <span className="font-mono text-xs text-zinc-600 tracking-widest flex-shrink-0">
                              {sorted.length} LISTING{sorted.length !== 1 ? 'S' : ''} · LAST SCAN {item.lastChecked ? timeAgo(item.lastChecked) : timeAgo(item.createdAt)}
                            </span>
                            <div className="flex items-center gap-1">
                              {(['price_asc', 'price_desc', 'platform', 'condition'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  onClick={(e) => { e.stopPropagation(); setSortBy(opt); }}
                                  className={`font-mono text-xs px-2 py-1 rounded-sm tracking-widest transition-colors ${
                                    sortBy === opt ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                                  }`}
                                >
                                  {opt === 'price_asc' ? 'PRICE ↑' : opt === 'price_desc' ? 'PRICE ↓' : opt.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {sorted.map((listing, i) => (
                              <PriceCard
                                key={`${listing.platform}-${i}`}
                                listing={listing}
                                platform={listing.platform}
                                rank={i + 1}
                              />
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
          <p className="font-mono text-xs text-zinc-700 text-center mt-8">
            Prices are checked every 12 hours · Use REFRESH ↗ to re-scan now
          </p>
        )}
      </div>
    </div>
  );
}
