import type { Species } from '@idea-garden/shared';

type PlantImageProps = {
  species: Species;
  stage: number;
  className?: string;
};

const SPECIES_LABELS: Record<Species, string> = {
  oak: 'Oak',
};

export function PlantImage({ species, stage, className }: PlantImageProps) {
  const stageStr = String(stage).padStart(2, '0');
  const label = SPECIES_LABELS[species] ?? species;
  return (
    <img
      src={`/plants/${species}/stage-${stageStr}.png`}
      alt={`${label} at stage ${stage}`}
      className={className ?? 'w-24 h-24 object-contain'}
      draggable={false}
    />
  );
}
