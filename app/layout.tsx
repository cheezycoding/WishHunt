import type { Metadata } from 'next';
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';
import GrainOverlay from '@/components/GrainOverlay';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
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
    <html lang="en" className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} font-sans`}>
      <body className="bg-[#080808] text-zinc-200 min-h-screen antialiased">
        <GrainOverlay />
        <Nav />
        <main className="pt-12">{children}</main>
      </body>
    </html>
  );
}
