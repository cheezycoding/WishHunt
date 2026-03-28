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
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md border border-zinc-800 bg-zinc-950 rounded-sm shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-700 tracking-widest">/01</span>
            <span className="font-sans text-sm font-semibold text-white">Set Price Alert</span>
          </div>
          <button onClick={onClose} className="font-sans text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Product */}
          <div className="border-b border-zinc-900 pb-4">
            <p className="font-mono text-[10px] text-zinc-700 tracking-widest mb-1.5 uppercase">Item</p>
            <p className="font-sans text-base font-semibold text-white">{product.name}</p>
            {product.brand && <p className="font-sans text-sm text-zinc-500 mt-0.5">{product.brand}</p>}
          </div>

          {/* Current best */}
          {bestListing && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-4">
              <p className="font-mono text-[10px] text-zinc-700 tracking-widest mb-1.5 uppercase">Current Best</p>
              <p className="font-mono text-2xl font-bold text-white">
                {bestListing.currency === 'SGD' ? 'S$' : bestListing.currency === 'EUR' ? '€' : '$'}
                {bestListing.price.toLocaleString()}
              </p>
              <p className="font-sans text-xs text-zinc-500 mt-1">on {bestListing.platform}</p>
            </div>
          )}

          {/* Target price */}
          <div>
            <label className="font-mono text-[10px] text-zinc-700 tracking-widest block mb-2 uppercase">
              Alert me when price drops below
            </label>
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="font-sans text-sm bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2.5 text-zinc-300 focus:outline-none focus:border-zinc-600"
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
                placeholder="Target price"
                className="flex-1 font-mono text-base bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2.5 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!targetPrice || saved}
            className={`w-full font-sans text-sm font-semibold py-3 rounded-sm transition-all ${
              saved
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saved ? '✓ Alert saved' : 'Save alert →'}
          </button>

          <p className="font-sans text-xs text-zinc-700 text-center">Re-checked every 12 hours</p>
        </div>
      </div>
    </div>
  );
}
