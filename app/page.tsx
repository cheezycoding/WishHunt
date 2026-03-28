'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DropZone from '@/components/DropZone';
import { IdentifiedProduct } from '@/lib/types';

type Step = 'input' | 'identifying' | 'confirm';

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [textQuery, setTextQuery] = useState('');
  const [imageData, setImageData] = useState<{ base64: string; mediaType: string } | null>(null);
  const [identified, setIdentified] = useState<IdentifiedProduct | null>(null);
  const [error, setError] = useState('');

  const handleImage = useCallback((base64: string, mediaType: string) => {
    setImageData({ base64, mediaType });
    setError('');
  }, []);

  const handleIdentify = async () => {
    setError('');
    setStep('identifying');

    try {
      const body = imageData
        ? { image: imageData.base64, mediaType: imageData.mediaType }
        : { text: textQuery };

      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Identification failed');
      setIdentified(data);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setStep('input');
    }
  };

  const handleSearch = () => {
    if (!identified) return;
    // Store in sessionStorage for the search page
    sessionStorage.setItem('wishhunt_product', JSON.stringify(identified));
    router.push(`/search?q=${encodeURIComponent(identified.searchQuery)}`);
  };

  const canSubmit = imageData || textQuery.trim().length > 2;

  return (
    <div className="min-h-[calc(100vh-48px)] flex flex-col items-center justify-center px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-px h-8 bg-gold" />
          <span className="font-mono text-xs text-zinc-500 tracking-[0.3em]">
            REAL-TIME LUXURY PRICE INTELLIGENCE
          </span>
          <div className="w-px h-8 bg-gold" />
        </div>
        <h1 className="font-mono text-4xl font-bold tracking-tight text-white mb-3">
          <span className="text-gold">WISH</span>HUNT
        </h1>
        <p className="font-mono text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Drop an image or type a product name. We scan every resale platform in real time.
        </p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg">
        {step === 'input' || step === 'identifying' ? (
          <div className="border border-zinc-800 rounded-sm bg-zinc-950 p-6 space-y-4">
            {/* Drop zone */}
            <div>
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-2">
                DROP PRODUCT IMAGE
              </p>
              <DropZone onImage={handleImage} disabled={step === 'identifying'} />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="font-mono text-xs text-zinc-700">OR</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Text input */}
            <div>
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-2">
                TYPE PRODUCT NAME
              </p>
              <input
                type="text"
                value={textQuery}
                onChange={(e) => { setTextQuery(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleIdentify(); }}
                placeholder="e.g. Rolex Submariner 126610LN"
                disabled={step === 'identifying'}
                className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-sm px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleIdentify}
              disabled={!canSubmit || step === 'identifying'}
              className="w-full font-mono text-xs tracking-widest py-3.5 bg-gold text-black hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
            >
              {step === 'identifying' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  IDENTIFYING...
                </span>
              ) : (
                'IDENTIFY & SEARCH'
              )}
            </button>
          </div>
        ) : (
          /* Confirm step */
          <div className="border border-zinc-800 rounded-sm bg-zinc-950 p-6 space-y-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-xs text-zinc-500 tracking-widest">IDENTIFIED</span>
            </div>

            <div className="space-y-2">
              <h2 className="font-mono text-xl text-white font-bold">{identified?.name}</h2>
              {identified?.brand && (
                <p className="font-mono text-sm text-zinc-400">{identified.brand}</p>
              )}
              {identified?.description && (
                <p className="font-mono text-xs text-zinc-600">{identified.description}</p>
              )}
              <div className="pt-2">
                <span className="font-mono text-xs text-zinc-700 tracking-widest">SEARCH QUERY: </span>
                <span className="font-mono text-xs text-zinc-500">{identified?.searchQuery}</span>
              </div>
            </div>

            {/* Edit query */}
            <div>
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-2">
                REFINE QUERY (OPTIONAL)
              </p>
              <input
                type="text"
                value={identified?.searchQuery ?? ''}
                onChange={(e) =>
                  setIdentified((prev) => prev ? { ...prev, searchQuery: e.target.value } : prev)
                }
                className="w-full font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep('input'); setIdentified(null); }}
                className="flex-1 font-mono text-xs tracking-widest py-3 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors rounded-sm"
              >
                ← BACK
              </button>
              <button
                onClick={handleSearch}
                className="flex-2 flex-grow font-mono text-xs tracking-widest py-3 bg-gold text-black hover:bg-amber-400 transition-colors rounded-sm"
              >
                SCAN ALL PLATFORMS →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Platform strip */}
      <div className="mt-12 flex items-center gap-8">
        {['STOCKX', 'CAROUSELL', 'GRAILED', 'VESTIAIRE', 'CHRONO24'].map((p) => (
          <span key={p} className="font-mono text-xs text-zinc-800 tracking-widest">
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
