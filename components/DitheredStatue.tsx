'use client';

import { useEffect, useRef } from 'react';

const BAYER_8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

const W = 390;
const H = 510;
const DOT = 3;

type DotData = { x: number; y: number; r: number };

export default function DitheredStatue() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = '/greekstatue.png';
    img.onload = () => {
      // ── 1. Compute all dots once ──────────────────────────────────────────
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const oc = off.getContext('2d', { willReadFrequently: true })!;
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      oc.fillStyle = '#000';
      oc.fillRect(0, 0, W, H);
      oc.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);

      const { data: px } = oc.getImageData(0, 0, W, H);
      const dots: DotData[] = [];

      for (let y = 0; y < H; y += DOT) {
        for (let x = 0; x < W; x += DOT) {
          const cx = Math.min(x + DOT / 2 | 0, W - 1);
          const cy = Math.min(y + DOT / 2 | 0, H - 1);
          const i = (cy * W + cx) * 4;
          const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
          const bayer = BAYER_8[((y / DOT | 0) % 8) * 8 + ((x / DOT | 0) % 8)] / 64;
          if (lum > bayer) {
            dots.push({ x: x + DOT / 2, y: y + DOT / 2, r: Math.max(lum * DOT * 0.52, 0.5) });
          }
        }
      }

      // ── 2. Wave animation loop ────────────────────────────────────────────
      let raf: number;
      let t = 0;

      // Ripple travels left → right across the statue
      const WAVE_AMP   = 1.2;    // vertical displacement px
      const WAVE_FREQ  = 0.028;  // wavelength
      const WAVE_SPEED = 0.018;  // travel speed

      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,0.88)';

        for (const dot of dots) {
          // wave front moves left→right: phase = x*freq - t*speed
          const phase = dot.x * WAVE_FREQ - t * WAVE_SPEED;
          const dy = Math.sin(phase) * WAVE_AMP;

          ctx.beginPath();
          ctx.arc(dot.x, dot.y + dy, dot.r, 0, Math.PI * 2);
          ctx.fill();
        }

        t++;
        raf = requestAnimationFrame(draw);
      };

      raf = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: W, height: H }}
    />
  );
}
