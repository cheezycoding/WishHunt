'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DropZone from '@/components/DropZone';
import DitheredStatue from '@/components/DitheredStatue';
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
    sessionStorage.setItem('wishhunt_product', JSON.stringify(identified));
    router.push(`/search?q=${encodeURIComponent(identified.searchQuery)}`);
  };

  const canSubmit = imageData || textQuery.trim().length > 2;

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col">
      {/* Hero — editorial, left-aligned */}
      <div className="flex-1 flex flex-col justify-center px-6 py-16 max-w-7xl mx-auto w-full">

        {step === 'input' || step === 'identifying' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: dithered statue + labels */}
            <div>
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-6">
                /01 — REAL-TIME RESALE INTELLIGENCE
              </p>

              <div className="flex justify-center">
                <DitheredStatue />
              </div>

              <div className="space-y-0 mt-6">
                {[
                  ['01', 'StockX'],
                  ['02', 'Carousell SG'],
                  ['03', 'Grailed'],
                  ['04', 'Vestiaire Collective'],
                  ['05', 'Chrono24'],
                ].map(([num, name]) => (
                  <div key={name} className="flex items-center gap-4 py-2 border-b border-zinc-900">
                    <span className="font-mono text-xs text-zinc-700">/{num}</span>
                    <span className="font-sans text-sm text-zinc-500">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: input form */}
            <div className="-mt-32 bg-zinc-950 border border-zinc-800 rounded-sm p-6 space-y-5">
              <div>
                <p className="font-mono text-xs text-zinc-600 tracking-widest mb-3">DROP PRODUCT IMAGE</p>
                <DropZone onImage={handleImage} disabled={step === 'identifying'} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="font-sans text-xs text-zinc-700">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <div>
                <p className="font-mono text-xs text-zinc-600 tracking-widest mb-3">TYPE PRODUCT NAME</p>
                <input
                  type="text"
                  value={textQuery}
                  onChange={(e) => { setTextQuery(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleIdentify(); }}
                  placeholder="e.g. Rolex Submariner 126610LN"
                  disabled={step === 'identifying'}
                  className="w-full font-sans text-sm bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
                />
              </div>

              {error && <p className="font-sans text-xs text-red-400">{error}</p>}

              <button
                onClick={handleIdentify}
                disabled={!canSubmit || step === 'identifying'}
                className="w-full font-sans text-sm font-semibold py-3.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
              >
                {step === 'identifying' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                    Identifying...
                  </span>
                ) : (
                  'Identify & Search →'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Confirm step */
          <div className="max-w-2xl animate-slide-up">
            <div className="flex items-center gap-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
              <span className="font-mono text-xs text-zinc-500 tracking-widest">IDENTIFIED</span>
            </div>

            <h2 className="font-sans font-bold text-white mb-1" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}>
              {identified?.name}
            </h2>
            {identified?.brand && (
              <p className="font-sans text-base text-zinc-500 mb-2">{identified.brand}</p>
            )}
            {identified?.description && (
              <p className="font-sans text-sm text-zinc-600 mb-8 leading-relaxed max-w-md">{identified.description}</p>
            )}

            <div className="bg-zinc-950 border border-zinc-800 rounded-sm p-5 space-y-4">
              <div>
                <p className="font-mono text-xs text-zinc-600 tracking-widest mb-2">REFINE SEARCH QUERY</p>
                <input
                  type="text"
                  value={identified?.searchQuery ?? ''}
                  onChange={(e) =>
                    setIdentified((prev) => prev ? { ...prev, searchQuery: e.target.value } : prev)
                  }
                  className="w-full font-sans text-sm bg-zinc-900 border border-zinc-800 rounded-sm px-4 py-3 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setIdentified(null); }}
                  className="flex-1 font-sans text-sm font-medium py-3 border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors rounded-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSearch}
                  className="flex-[2] font-sans text-sm font-semibold py-3 bg-white text-black hover:bg-zinc-200 transition-colors rounded-sm"
                >
                  Scan All Platforms →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
