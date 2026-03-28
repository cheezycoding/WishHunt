'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tracking-widest text-gold">WISH</span>
          <span className="font-mono text-sm font-bold tracking-widest text-zinc-400">HUNT</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={`font-mono text-xs tracking-wider transition-colors ${
              pathname === '/' ? 'text-gold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            SEARCH
          </Link>
          <Link
            href="/watchlist"
            className={`font-mono text-xs tracking-wider transition-colors ${
              pathname === '/watchlist' ? 'text-gold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            WATCHLIST
          </Link>
        </div>
      </div>
    </nav>
  );
}
