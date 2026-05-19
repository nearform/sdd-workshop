import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ConfettiVariant = 'firstWatering' | 'bloom';

const PALETTES: Record<ConfettiVariant, string[]> = {
  firstWatering: ['#4F8C3A', '#6EA84D', '#E7F3DD', '#FFE08A', '#FFC857', '#FFFFFF'],
  bloom: [
    '#E2B53C',
    '#FFC857',
    '#FF8A1F',
    '#FFB347',
    '#4F8C3A',
    '#E7F3DD',
    '#FFFFFF',
    '#C97B3F',
    '#FF7F50',
  ],
};

const COUNTS: Record<ConfettiVariant, number> = {
  firstWatering: 180,
  bloom: 340,
};

const DURATIONS_MS: Record<ConfettiVariant, number> = {
  firstWatering: 2400,
  bloom: 3600,
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  shape: 0 | 1 | 2; // strip / square / circle
  color: string;
};

type ConfettiBurstProps = {
  variant: ConfettiVariant;
  onComplete: () => void;
};

export function ConfettiBurst({ variant, onComplete }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    // jsdom returns null here. Fall back to a timer-only path so the
    // promise chain still resolves cleanly in tests.
    if (!ctx) {
      const t = window.setTimeout(onComplete, DURATIONS_MS[variant]);
      return () => window.clearTimeout(t);
    }

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = PALETTES[variant];
    const count = COUNTS[variant];
    const duration = DURATIONS_MS[variant];

    const cx = w / 2;
    const cy = h / 2;

    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 9 + Math.random() * 22;
      particles.push({
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 8 - Math.random() * 8,
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 28,
        size: 6 + Math.random() * 10,
        shape: Math.floor(Math.random() * 3) as 0 | 1 | 2,
        color: palette[Math.floor(Math.random() * palette.length)] ?? '#FFC857',
      });
    }

    const start = performance.now();
    const gravity = 0.42;
    const drag = 0.985;
    const fadeStart = 0.7;
    let raf = 0;
    let done = false;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - start;
      const t = elapsed / duration;

      if (t >= 1) {
        if (!done) {
          done = true;
          onComplete();
        }
        return;
      }

      ctx.clearRect(0, 0, w, h);
      const fade = t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / (1 - fadeStart)) : 1;

      for (const p of particles) {
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = fade;
        ctx.fillStyle = p.color;

        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size * 0.18, p.size, p.size * 0.36);
        } else if (p.shape === 1) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [variant, onComplete]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      data-testid="confetti-canvas"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2147483647 }}
    />,
    document.body,
  );
}
