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
  pending: 'bg-zinc-700',
  searching: 'bg-amber-400 animate-pulse',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
};

const STATUS_LABEL: Record<PlatformStatus, string> = {
  pending: 'WAITING',
  searching: 'SCANNING',
  done: 'DONE',
  error: 'ERROR',
};

const STATUS_COLOR: Record<PlatformStatus, string> = {
  pending: 'text-zinc-700',
  searching: 'text-amber-400',
  done: 'text-emerald-500',
  error: 'text-red-400',
};

export default function StatusLog({
  entries,
  elapsed = 0,
  isDone = false,
  logs = [],
  streamingUrls = {},
  onLivePreview,
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

  // Auto-scroll log feed
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const elapsedStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="border border-zinc-800 rounded-sm bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isDone ? 'bg-zinc-600' : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <span className="font-mono text-xs text-zinc-400 tracking-widest">LIVE MARKET SCAN</span>
        </div>
        {elapsed > 0 && (
          <span className="font-mono text-xs text-zinc-600">{elapsedStr}</span>
        )}
      </div>

      {/* Platform rows */}
      <div className="px-4 py-3 space-y-3 border-b border-zinc-800">
        {allPlatforms.map((entry) => (
          <div key={entry.platform}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[entry.status]}`}
                />
                <span
                  className="font-mono text-xs tracking-wide"
                  style={{
                    color:
                      entry.status === 'done'
                        ? entry.color
                        : entry.status === 'error'
                        ? '#ef4444'
                        : entry.status === 'searching'
                        ? '#d4a017'
                        : '#3f3f46',
                  }}
                >
                  {entry.platform.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Live preview button when scanning */}
                {entry.status === 'searching' && streamingUrls[entry.platform] && onLivePreview && (
                  <button
                    onClick={() => onLivePreview(entry.platform, streamingUrls[entry.platform])}
                    className="font-mono text-xs text-emerald-500 border border-emerald-500/30 px-1.5 py-0.5 rounded-sm tracking-widest hover:bg-emerald-500/10 transition-colors animate-pulse"
                  >
                    LIVE ↗
                  </button>
                )}
                {entry.status === 'done' && (
                  <>
                    <span className="font-mono text-xs text-zinc-600">
                      {entry.count ?? 0} found
                    </span>
                    {entry.duration && (
                      <span className="font-mono text-xs text-zinc-700">
                        {(entry.duration / 1000).toFixed(0)}s
                      </span>
                    )}
                  </>
                )}
                <span
                  className={`font-mono text-xs tracking-widest ${STATUS_COLOR[entry.status]}`}
                >
                  {STATUS_LABEL[entry.status]}
                </span>
              </div>
            </div>

            {entry.status === 'error' && entry.error && (
              <div className="ml-5 mt-1">
                <span className="font-mono text-xs text-red-500/70 leading-relaxed">
                  {entry.error.length > 80 ? entry.error.slice(0, 80) + '…' : entry.error}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Log feed */}
      {logs.length > 0 && (
        <div className="px-4 py-3 max-h-40 overflow-y-auto space-y-1">
          {logs.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="font-mono text-xs text-zinc-700 flex-shrink-0">{line.time}</span>
              <span className="font-mono text-xs text-zinc-500 leading-relaxed">{line.msg}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
