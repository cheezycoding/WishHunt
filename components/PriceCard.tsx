'use client';

import { Listing } from '@/lib/types';
import { PLATFORMS } from '@/lib/platforms';

interface PriceCardProps {
  listing: Listing;
  platform: string;
  rank: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', SGD: 'S$', JPY: '¥', AUD: 'A$', CHF: 'CHF ',
};

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + ' ';
  return `${symbol}${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Rank as editorial section number
function rankLabel(rank: number): string {
  return `/${String(rank).padStart(2, '0')}`;
}

export default function PriceCard({ listing, platform, rank }: PriceCardProps) {
  const platformConfig = PLATFORMS.find((p) => p.name === platform);
  const accentColor = platformConfig?.color ?? '#d4a017';

  return (
    <a
      href={listing.listingUrl !== '#' ? listing.listingUrl : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col border border-zinc-900 bg-zinc-950 hover:border-zinc-700 hover:bg-[#111] transition-all duration-150 group rounded-sm overflow-hidden"
    >
      <div className="p-4 flex-1 flex flex-col">
        {/* Top row: section number + best badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs text-zinc-700">{rankLabel(rank)}</span>
          {rank === 1 && (
            <span className="font-sans text-[10px] font-semibold text-black bg-white px-2 py-0.5 rounded-full tracking-wide">
              Best price
            </span>
          )}
        </div>

        {/* Platform name */}
        <p className="font-sans text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: accentColor }}>
          {platform}
        </p>

        {/* Big price */}
        <p className="font-mono font-bold text-white mb-4 leading-none" style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)' }}>
          {formatPrice(listing.price, listing.currency)}
        </p>

        {/* Metadata */}
        <div className="space-y-1.5 mt-auto">
          {listing.condition && listing.condition !== 'Unknown' && (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-zinc-700 w-10 flex-shrink-0 uppercase tracking-widest">Cond</span>
              <span className="font-sans text-xs text-zinc-400">{listing.condition}</span>
            </div>
          )}
          {listing.sellerName && listing.sellerName !== 'Unknown' && (
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] text-zinc-700 w-10 flex-shrink-0 uppercase tracking-widest">Seller</span>
              <span className="font-sans text-xs text-zinc-500 truncate max-w-[150px]">{listing.sellerName}</span>
            </div>
          )}
          {listing.title && (
            <div className="flex items-start gap-2">
              <span className="font-mono text-[10px] text-zinc-700 w-10 flex-shrink-0 uppercase tracking-widest mt-0.5">Item</span>
              <span className="font-sans text-xs text-zinc-600 line-clamp-2 leading-relaxed">{listing.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-3 border-t border-zinc-900 flex items-center justify-between">
        <span className="font-sans text-xs text-zinc-700 group-hover:text-zinc-400 transition-colors">
          View listing
        </span>
        {/* Circular arrow — Novure style */}
        <span className="w-6 h-6 rounded-full border border-zinc-800 group-hover:border-zinc-500 flex items-center justify-center transition-colors">
          <span className="font-sans text-[10px] text-zinc-700 group-hover:text-zinc-300 transition-colors">↗</span>
        </span>
      </div>
    </a>
  );
}
