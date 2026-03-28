'use client';

import { useEffect, useRef } from 'react';

export default function GrainOverlay() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const SIZE   = 256;
    const FRAMES = 6;    // enough frames to feel organic
    const frames: string[] = [];

    // Generate random grain frames
    for (let f = 0; f < FRAMES; f++) {
      const c   = document.createElement('canvas');
      c.width   = SIZE;
      c.height  = SIZE;
      const ctx = c.getContext('2d')!;
      const img = ctx.createImageData(SIZE, SIZE);

      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.floor(Math.random() * 255);
        img.data[i]     = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }

      ctx.putImageData(img, 0, 0);
      frames.push(c.toDataURL());
    }

    let frame = 0;
    el.style.backgroundImage = `url(${frames[0]})`;

    // Cycle frames at ~8fps for the animated grain shimmer
    const id = setInterval(() => {
      frame = (frame + 1) % FRAMES;
      el.style.backgroundImage = `url(${frames[frame]})`;
    }, 120);

    return () => clearInterval(id);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
        opacity: 0.055,
        mixBlendMode: 'screen',
        backgroundSize: `${256}px ${256}px`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}
