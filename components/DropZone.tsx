'use client';

import { useCallback, useState } from 'react';

interface DropZoneProps {
  onImage: (base64: string, mediaType: string) => void;
  disabled?: boolean;
}

export default function DropZone({ onImage, disabled }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
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
    },
    [onImage]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-sm transition-all duration-200 cursor-pointer
        ${isDragging ? 'border-gold bg-gold/5' : 'border-zinc-700 hover:border-zinc-500'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${preview ? 'h-56' : 'h-48'}
      `}
      onClick={() => {
        if (!disabled) document.getElementById('file-input')?.click();
      }}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="h-full w-full object-contain rounded-sm"
          />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-sm">
            <span className="font-mono text-xs text-zinc-300 tracking-widest">CHANGE IMAGE</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="text-center">
            <p className="font-mono text-xs text-zinc-400 tracking-widest">DROP IMAGE HERE</p>
            <p className="font-mono text-xs text-zinc-600 mt-1">or click to browse</p>
          </div>
        </div>
      )}
      <input
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileInput}
        disabled={disabled}
      />
    </div>
  );
}
