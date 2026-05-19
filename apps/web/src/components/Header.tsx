type HeaderProps = {
  onPlantSeed: () => void;
  count: number;
};

export function Header({ onPlantSeed, count }: HeaderProps) {
  const formattedCount = String(count).padStart(2, '0');
  const seedWord = count === 1 ? 'seed' : 'seeds';

  return (
    <header className="relative mb-2xl">
      <div className="flex items-end justify-between gap-md flex-wrap pb-md border-b border-ink/15">
        <div className="flex items-baseline gap-lg flex-wrap">
          <h1 className="font-display italic text-[clamp(40px,5vw,64px)] leading-[0.95] tracking-[-0.015em] text-ink">
            my garden
          </h1>
          <span className="hidden sm:inline-flex items-center gap-xs text-label-md uppercase tracking-[0.22em] text-ink/55">
            <span className="w-7 h-px bg-ink/30" />
            tend something today
          </span>
        </div>
        <div className="flex items-center gap-md">
          <span className="hidden md:inline-flex items-baseline gap-xs text-label-md uppercase tracking-[0.22em] text-ink/55">
            <span className="font-display not-italic text-[28px] text-ink/85 leading-none">
              {formattedCount}
            </span>
            {seedWord}
          </span>
          <button
            type="button"
            onClick={onPlantSeed}
            className="group inline-flex items-center gap-sm bg-ink text-paper text-label-md rounded-full pl-md pr-xs py-[6px] hover:bg-primary transition-colors"
          >
            <span>Plant New Seed</span>
            <span
              aria-hidden="true"
              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[15px] transition-transform group-hover:translate-x-[2px] group-hover:rotate-90"
            >
              +
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
