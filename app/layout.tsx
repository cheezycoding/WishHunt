import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'WishHunt — Luxury Price Intelligence',
  description: 'Real-time price tracking across every luxury resale platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} font-mono`}>
      <body className="bg-[#080808] text-zinc-200 min-h-screen antialiased">
        <Nav />
        <main className="pt-12">{children}</main>
      </body>
    </html>
  );
}
