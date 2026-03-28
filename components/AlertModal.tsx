'use client';

import { useState } from 'react';
import { IdentifiedProduct, Listing, WatchItem, WatchRecipe } from '@/lib/types';
import { saveWatchItem, generateId } from '@/lib/storage';

interface AlertModalProps {
  product: IdentifiedProduct;
  bestListing?: Listing & { platform: string };
  allListings?: (Listing & { platform: string })[];
  recipes: WatchRecipe[];
  onClose: () => void;
  onSaved: (item: WatchItem) => void;
}

export default function AlertModal({ product, bestListing, allListings, recipes, onClose, onSaved }: AlertModalProps) {
  const [targetPrice, setTargetPrice] = useState(
    bestListing ? String(Math.floor(bestListing.price * 0.95)) : ''
  );
  const [currency, setCurrency] = useState(bestListing?.currency ?? 'USD');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!targetPrice || isNaN(Number(targetPrice))) return;

    const item: WatchItem = {
      id: generateId(),
      product,
      targetPrice: Number(targetPrice),
      currency,
      createdAt: new Date().toISOString(),
      currentBestPrice: bestListing?.price,
      currentBestPlatform: bestListing?.platform,
      recipes,
      triggered: bestListing ? bestListing.price <= Number(targetPrice) : false,
      lastListings: allListings ?? [],
    };

    saveWatchItem(item);
    setSaved(true);
    onSaved(item);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md border border-zinc-700 rounded-sm bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <span className="font-mono text-xs tracking-widest text-gold">SET PRICE ALERT</span>
          <button
            onClick={onClose}
            className="font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product */}
          <div>
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">ITEM</p>
            <p className="font-mono text-sm text-zinc-200">{product.name}</p>
            {product.brand && (
              <p className="font-mono text-xs text-zinc-500 mt-0.5">{product.brand}</p>
            )}
          </div>

          {/* Current best */}
          {bestListing && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-3">
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">CURRENT BEST</p>
              <p className="font-mono text-xl text-white">
                {bestListing.currency === 'SGD' ? 'S$' : bestListing.currency === 'EUR' ? '€' : '$'}
                {bestListing.price.toLocaleString()}
              </p>
              <p className="font-mono text-xs text-zinc-500 mt-0.5">on {bestListing.platform}</p>
            </div>
          )}

          {/* Target price input */}
          <div>
            <label className="font-mono text-xs text-zinc-600 tracking-widest block mb-2">
              ALERT ME WHEN PRICE DROPS BELOW
            </label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="font-mono text-xs bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-2.5 text-zinc-300 focus:outline-none focus:border-zinc-500"
              >
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target price"
                className="flex-1 font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-sm px-3 py-2.5 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!targetPrice || saved}
            className={`w-full font-mono text-xs tracking-widest py-3 rounded-sm transition-all ${
              saved
                ? 'bg-emerald-600 text-white border border-emerald-500'
                : 'bg-gold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saved ? '✓ ALERT SAVED' : 'SAVE ALERT'}
          </button>

          <p className="font-mono text-xs text-zinc-700 text-center">
            We&apos;ll re-check prices every 12 hours
          </p>
        </div>
      </div>
    </div>
  );
}
