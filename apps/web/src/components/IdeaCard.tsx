import type { Idea } from '@idea-garden/shared';
import { PlantImage } from './PlantImage.tsx';
import { relativeTime } from '../lib/relativeTime.ts';

type IdeaCardProps = {
  idea: Idea;
  /** 1-based position in the garden, in planting order (oldest = 1). */
  index?: number;
  /** Override "now" for deterministic relative-time rendering in tests. */
  now?: number;
  /** Called when the card is activated (click or Enter/Space). */
  onOpen?: (id: string) => void;
};

const MAX_STAGE = 16;

export function IdeaCard({ idea, index, now, onOpen }: IdeaCardProps) {
  const reference = now ?? Date.now();
  const clampedStage = Math.max(0, Math.min(MAX_STAGE, idea.stage));
  const fillPct = (clampedStage / MAX_STAGE) * 100;
  const bloomed = idea.stage >= MAX_STAGE;

  const handleActivate = () => {
    if (onOpen) onOpen(idea.id);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!onOpen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(idea.id);
    }
  };

  const interactive = Boolean(onOpen);

  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? handleActivate : undefined}
      onKeyDown={interactive ? handleKey : undefined}
      className={`idea-card group relative overflow-hidden bg-white border border-ink/15 rounded-lg p-lg flex flex-col gap-sm w-full max-w-sm justify-self-start hover:border-primary/60 hover:shadow-[0_18px_40px_-22px_rgba(31,42,34,0.35)] ${
        interactive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-xs">
        {typeof index === 'number' ? (
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink/40 select-none">
            № {String(index).padStart(2, '0')}
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span
          className={
            bloomed
              ? 'bg-amber/20 text-wilted text-caption rounded-full px-sm py-[2px] font-display italic'
              : 'bg-primary-soft text-primary-hover text-caption rounded-full px-sm py-[2px]'
          }
        >
          {bloomed ? 'Bloomed' : `Level ${idea.stage}`}
        </span>
      </div>

      <div className="relative h-48 flex items-center justify-center">
        <div className="plant-rise">
          <PlantImage species={idea.species} stage={idea.stage} className="w-44 h-44 object-contain" />
        </div>
      </div>

      <h3 className="font-display italic text-[22px] leading-[1.15] tracking-[-0.005em] text-ink break-words mt-xs">
        {idea.title}
      </h3>

      {idea.description ? (
        <p className="text-body-sm text-ink/65 line-clamp-2 min-h-[2.5em]">
          {idea.description}
        </p>
      ) : (
        <p className="text-body-sm italic text-ink/35 min-h-[2.5em]">
          no notes yet — water it to grow.
        </p>
      )}

      <div className="mt-auto pt-md flex flex-col gap-xs">
        <div className="relative h-[3px] rounded-full bg-ink/10 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700 ease-out rounded-full"
            style={{ width: `${fillPct}%` }}
            aria-hidden
          />
        </div>
        <div className="flex items-center justify-between text-caption text-ink/55">
          <span className="font-mono tracking-[0.05em]">
            {String(clampedStage).padStart(2, '0')}/{MAX_STAGE}
          </span>
          <span className="italic">
            Watered {relativeTime(reference, idea.created_at)}
          </span>
        </div>
      </div>

      <svg
        className="card-leaf"
        width="14"
        height="19"
        viewBox="0 0 24 32"
        aria-hidden
      >
        <path
          d="M12 1 C 2 8, 2 22, 12 31 C 22 22, 22 8, 12 1 Z"
          fill="#4F8C3A"
        />
        <path d="M12 4 L 12 28" stroke="rgba(0,0,0,0.28)" strokeWidth="0.6" fill="none" />
      </svg>
    </article>
  );
}
