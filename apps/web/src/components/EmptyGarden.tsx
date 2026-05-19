type EmptyGardenProps = {
  onPlant: () => void;
};

export function EmptyGarden({ onPlant }: EmptyGardenProps) {
  return (
    <section
      aria-label="Empty garden"
      className="relative isolate flex flex-col items-center justify-center text-center py-2xl px-md gap-md min-h-[520px]"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 grid grid-cols-1 sm:grid-cols-3 gap-grid-gutter max-w-[820px] mx-auto opacity-60"
      >
        <div className="ghost-card h-40" style={{ transform: 'rotate(-1.5deg) translateY(20px)' }} />
        <div className="ghost-card h-40" style={{ transform: 'rotate(0.8deg)' }} />
        <div className="ghost-card h-40" style={{ transform: 'rotate(-0.4deg) translateY(28px)' }} />
      </div>

      <div className="relative w-56 h-56 flex items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-amber/25 blur-[40px]"
        />
        <div
          aria-hidden
          className="absolute inset-6 rounded-full bg-primary-soft/70 blur-[14px]"
        />
        <img
          src="/plants/oak/stage-01.png"
          alt="Empty garden illustration: a freshly planted acorn"
          width={200}
          height={200}
          className="relative w-48 h-48 object-contain empty-pulse"
          draggable={false}
        />
      </div>

      <span className="inline-flex items-center gap-xs text-label-md uppercase tracking-[0.22em] text-ink/55">
        <span className="w-6 h-px bg-ink/30" />
        a quiet beginning
      </span>

      <h2 className="font-display italic text-[clamp(36px,5vw,56px)] leading-[1.05] tracking-[-0.01em] text-ink max-w-2xl">
        Your garden is empty.
        <br />
        <span className="not-italic text-ink/55 font-sans text-[15px] tracking-[0.06em] uppercase">
          — the most exciting part —
        </span>
      </h2>

      <p className="text-[15px] leading-[1.7] text-ink/65 max-w-md">
        Every great garden starts with a single seed. Plant your first idea and watch it grow each
        time you come back to tend it.
      </p>

      <button
        type="button"
        onClick={onPlant}
        className="mt-md group inline-flex items-center gap-sm bg-ink text-paper text-label-md rounded-full pl-md pr-xs py-[6px] hover:bg-primary transition-colors"
      >
        <span>Plant your first seed</span>
        <span
          aria-hidden="true"
          className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[14px] transition-transform group-hover:translate-x-[2px]"
        >
          →
        </span>
      </button>

      <p className="text-caption italic text-ink/45 mt-sm">
        no folders. no tags. just water it tomorrow.
      </p>
    </section>
  );
}
