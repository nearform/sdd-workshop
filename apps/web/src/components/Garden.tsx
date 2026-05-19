import type { Idea } from '@idea-garden/shared';
import { EmptyGarden } from './EmptyGarden.tsx';
import { IdeaCard } from './IdeaCard.tsx';

type GardenProps = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  ideas: Idea[];
  error?: string | undefined;
  onPlant: () => void;
};

export function Garden({ status, ideas, error, onPlant }: GardenProps) {
  if (status === 'error') {
    return (
      <div
        role="alert"
        className="relative bg-wilted-soft/70 border border-wilted/30 text-wilted rounded-lg p-lg flex items-start gap-md"
      >
        <span aria-hidden className="font-display italic text-[28px] leading-none text-wilted/80">
          !
        </span>
        <div className="flex-1">
          <p className="font-display italic text-[18px] text-wilted leading-tight">
            A patch of your garden is unreachable.
          </p>
          <p className="text-body-sm text-wilted/80 mt-xs">
            We couldn't load your garden: {error ?? 'Unknown error'}.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <p
        className="text-center font-display italic text-[22px] text-ink/55 py-2xl"
        role="status"
        aria-live="polite"
      >
        tending to your garden…
      </p>
    );
  }

  if (ideas.length === 0) {
    return <EmptyGarden onPlant={onPlant} />;
  }

  const plantingOrder = new Map(
    [...ideas]
      .sort((a, b) => a.created_at - b.created_at)
      .map((idea, i) => [idea.id, i + 1] as const),
  );

  return (
    <div className="grid gap-grid-gutter grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} index={plantingOrder.get(idea.id)} />
      ))}
    </div>
  );
}
