'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-zinc-900">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-14">
        <Link href="/" className="font-sans font-semibold text-lg tracking-tight text-white">
          WishHunt
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/"
            className={`font-sans text-sm transition-colors ${
              pathname === '/' ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Search
          </Link>
          <Link
            href="/watchlist"
            className={`font-sans text-sm transition-colors ${
              pathname === '/watchlist' ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Watchlist
          </Link>
        </div>
      </div>
    </nav>
  );
}
