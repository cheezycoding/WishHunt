'use client';

import { Listing } from '@/lib/types';
import { PLATFORMS } from '@/lib/platforms';

interface PriceCardProps {
  listing: Listing;
  platform: string;
  rank: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  SGD: 'S$',
  JPY: '¥',
  AUD: 'A$',
  CHF: 'CHF ',
};

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + ' ';
  return `${symbol}${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function PriceCard({ listing, platform, rank }: PriceCardProps) {
  const platformConfig = PLATFORMS.find((p) => p.name === platform);
  const accentColor = platformConfig?.color ?? '#d4a017';

  return (
    <a
      href={listing.listingUrl !== '#' ? listing.listingUrl : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-zinc-800 rounded-sm bg-zinc-950 hover:border-zinc-600 transition-all duration-150 group hover:bg-zinc-900"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span
              className="font-mono text-xs tracking-wider"
              style={{ color: accentColor }}
            >
              {platform.toUpperCase()}
            </span>
          </div>
          {rank === 1 && (
            <span className="font-mono text-xs text-gold border border-gold/30 px-1.5 py-0.5 rounded-sm tracking-wider">
              BEST PRICE
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-3">
          <span className="font-mono text-2xl font-bold text-white tracking-tight">
            {formatPrice(listing.price, listing.currency)}
          </span>
        </div>

        {/* Meta */}
        <div className="space-y-1.5">
          {listing.condition && listing.condition !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-600">COND</span>
              <span className="font-mono text-xs text-zinc-400">{listing.condition}</span>
            </div>
          )}
          {listing.sellerName && listing.sellerName !== 'Unknown' && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-600">SELL</span>
              <span className="font-mono text-xs text-zinc-400 truncate max-w-[160px]">
                {listing.sellerName}
              </span>
            </div>
          )}
          {listing.title && (
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-zinc-600 flex-shrink-0">ITEM</span>
              <span className="font-mono text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                {listing.title}
              </span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="font-mono text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors tracking-widest">
            VIEW LISTING →
          </span>
        </div>
      </div>
    </a>
  );
}
