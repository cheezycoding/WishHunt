'use client';

import { useEffect, useRef } from 'react';
import { PLATFORMS } from '@/lib/platforms';

export type PlatformStatus = 'pending' | 'searching' | 'done' | 'error';

interface StatusEntry {
  platform: string;
  status: PlatformStatus;
  count?: number;
  duration?: number;
  error?: string;
}

interface LogLine {
  time: string;
  msg: string;
}

interface StatusLogProps {
  entries: StatusEntry[];
  elapsed?: number;
  isDone?: boolean;
  logs?: LogLine[];
  streamingUrls?: Record<string, string>;
  onLivePreview?: (platform: string, url: string) => void;
}

const STATUS_DOT: Record<PlatformStatus, string> = {
  pending:   'bg-zinc-800',
  searching: 'bg-zinc-400 animate-pulse',
  done:      'bg-white',
  error:     'bg-red-500',
};

const STATUS_TEXT: Record<PlatformStatus, string> = {
  pending:   'text-zinc-700',
  searching: 'text-zinc-400',
  done:      'text-white',
  error:     'text-red-400',
};

const STATUS_LABEL: Record<PlatformStatus, string> = {
  pending:   'Waiting',
  searching: 'Scanning',
  done:      'Done',
  error:     'Error',
};

export default function StatusLog({
  entries, elapsed = 0, isDone = false, logs = [], streamingUrls = {}, onLivePreview,
}: StatusLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  const allPlatforms = PLATFORMS.map((p) => {
    const entry = entries.find((e) => e.platform === p.name);
    return {
      platform: p.name,
      color: p.color,
      status: entry?.status ?? ('pending' as PlatformStatus),
      count: entry?.count,
      duration: entry?.duration,
      error: entry?.error,
    };
  });

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="border border-zinc-900 bg-zinc-950 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${isDone ? 'bg-zinc-700' : 'bg-white animate-pulse'}`} />
          <span className="font-sans text-sm font-medium text-zinc-300">
            {isDone ? 'Scan complete' : 'Live scan'}
          </span>
        </div>
        {elapsed > 0 && (
          <span className="font-mono text-xs text-zinc-700">{elapsedStr}</span>
        )}
      </div>

      {/* Platform rows — numbered like Novure sections */}
      <div className="divide-y divide-zinc-900">
        {allPlatforms.map((entry, idx) => (
          <div key={entry.platform} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Section number */}
                <span className="font-mono text-[10px] text-zinc-800 w-6 flex-shrink-0">
                  /{String(idx + 1).padStart(2, '0')}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[entry.status]}`}
                />
                <span
                  className="font-sans text-sm"
                  style={{
                    color: entry.status === 'done' ? '#ffffff'
                         : entry.status === 'searching' ? '#a1a1aa'
                         : entry.status === 'error' ? '#f87171'
                         : '#3f3f46',
                  }}
                >
                  {entry.platform}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {entry.status === 'searching' && streamingUrls[entry.platform] && onLivePreview && (
                  <button
                    onClick={() => onLivePreview(entry.platform, streamingUrls[entry.platform])}
                    className="font-sans text-[10px] font-semibold text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded-full tracking-wide hover:bg-zinc-800 transition-colors animate-pulse"
                  >
                    Live ↗
                  </button>
                )}
                {entry.status === 'done' && (
                  <span className="font-mono text-xs text-zinc-700">
                    {entry.count ?? 0} found{entry.duration ? ` · ${(entry.duration / 1000).toFixed(0)}s` : ''}
                  </span>
                )}
                <span className={`font-sans text-xs ${STATUS_TEXT[entry.status]}`}>
                  {STATUS_LABEL[entry.status]}
                </span>
              </div>
            </div>

            {entry.status === 'error' && entry.error && (
              <p className="font-mono text-[10px] text-red-500/60 mt-1.5 ml-9 leading-relaxed">
                {entry.error.length > 80 ? entry.error.slice(0, 80) + '…' : entry.error}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Log feed */}
      {logs.length > 0 && (
        <div className="border-t border-zinc-900 px-4 py-3 max-h-36 overflow-y-auto space-y-1 bg-black/20">
          {logs.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-[10px] text-zinc-800 flex-shrink-0">{line.time}</span>
              <span className="font-mono text-[10px] text-zinc-600 leading-relaxed">{line.msg}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
