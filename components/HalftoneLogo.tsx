'use client';

import { useEffect, useRef } from 'react';

export default function HalftoneLogo({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      const container = containerRef.current;
      const canvas    = canvasRef.current;
      if (!container || !canvas) return;

      const W   = container.offsetWidth;
      const H   = Math.round(W * (310 / 480));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Physical canvas size (high-DPI), CSS display size
      canvas.width        = W * dpr;
      canvas.height       = H * dpr;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;

      const fontSize = Math.round(W * (142 / 480));

      // Wait for Sakire to be ready before drawing
      await document.fonts.load(`normal normal ${fontSize}px Sakire`);
      if (cancelled) return;

      // ── 1. Render crisp white text on black at CSS resolution ──────────
      const off    = document.createElement('canvas');
      off.width    = W;
      off.height   = H;
      const offCtx = off.getContext('2d')!;
      offCtx.fillStyle = '#000';
      offCtx.fillRect(0, 0, W, H);
      offCtx.fillStyle   = '#fff';
      offCtx.font        = `normal normal ${fontSize}px Sakire, serif`;
      offCtx.textBaseline = 'alphabetic';
      offCtx.fillText('Wish', 0, W * (132 / 480));
      offCtx.fillText('Hunt', 0, W * (285 / 480));

      // ── 2. Blur the text source → creates soft edge bleed ──────────────
      //    Large blur = wide halo of fading dots outside letter edges
      const blurPx = Math.round(W * 0.016);   // ~8px at 500px wide
      const blr    = document.createElement('canvas');
      blr.width    = W;
      blr.height   = H;
      const blrCtx = blr.getContext('2d')!;
      blrCtx.filter = `blur(${blurPx}px)`;
      blrCtx.drawImage(off, 0, 0);

      const { data: px } = blrCtx.getImageData(0, 0, W, H);

      // ── 3. Draw halftone dots on HiDPI canvas ──────────────────────────
      const ctx  = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);

      // Grid spacing — finer = more dots, truer halftone
      const GRID   = Math.max(5, Math.round(W / 72));
      const maxR   = GRID * 0.54;   // max dot radius = just under half the cell

      for (let gy = -GRID * 2; gy <= H + GRID * 2; gy += GRID) {
        for (let gx = -GRID * 2; gx <= W + GRID * 2; gx += GRID) {
          // Clamp sample coords to canvas bounds
          const sx = Math.min(Math.max(Math.round(gx), 0), W - 1);
          const sy = Math.min(Math.max(Math.round(gy), 0), H - 1);

          // Red channel is enough (greyscale white-on-black source)
          const brightness = px[(sy * W + sx) * 4] / 255;
          if (brightness < 0.04) continue;

          // Dot radius scales with brightness:
          //   bright core  → large dot (close to maxR)
          //   edge fade    → small dot
          //   overflow halo → tiny dot
          const r = brightness * maxR;
          if (r < 0.45) continue;

          // Opacity also varies: dense core = solid, halo = translucent
          const alpha = 0.5 + brightness * 0.5;

          ctx.beginPath();
          ctx.arc(gx, gy, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
          ctx.fill();
        }
      }
    };

    render();

    const onResize = () => render();
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
