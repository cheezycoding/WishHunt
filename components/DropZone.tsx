'use client';

import { useCallback, useState } from 'react';

interface DropZoneProps {
  onImage: (base64: string, mediaType: string) => void;
  disabled?: boolean;
}

export default function DropZone({ onImage, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const [header, base64] = result.split(',');
      const mediaType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
      setPreview(result);
      onImage(base64, mediaType);
    };
    reader.readAsDataURL(file);
  }, [onImage]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [disabled, processFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => { if (!disabled) document.getElementById('file-input')?.click(); }}
      className={`relative group flex flex-col items-center justify-center border border-dashed transition-all duration-200 cursor-pointer rounded-sm
        ${isDragging ? 'border-white/30 bg-white/5' : 'border-zinc-700 hover:border-zinc-500'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${preview ? 'h-52' : 'h-44'}
      `}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="h-full w-full object-contain rounded-sm" />
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-sm">
            <span className="font-sans text-xs font-medium text-white tracking-wide">Change image</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <div className="text-center">
            <p className="font-sans text-sm text-zinc-400">Drop product image here</p>
            <p className="font-sans text-xs text-zinc-600 mt-0.5">or click to browse</p>
          </div>
        </div>
      )}
      <input id="file-input" type="file" accept="image/*" className="hidden" onChange={onFileInput} disabled={disabled} />
    </div>
  );
}
