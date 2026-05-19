import { PlantImage } from './PlantImage.tsx';

type EmptyTimelineProps = {
  className?: string;
};

export function EmptyTimeline({ className }: EmptyTimelineProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-sm py-lg ${className ?? ''}`}
    >
      <PlantImage species="oak" stage={1} className="w-16 h-16 object-contain opacity-70" />
      <p className="text-headline-sm text-on-surface">No waterings yet</p>
      <p className="text-body-sm text-on-surface-muted">Give this idea its first drink</p>
    </div>
  );
}
