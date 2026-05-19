type LevelBadgeProps = {
  stage: number;
};

const MAX_STAGE = 16;

export function LevelBadge({ stage }: LevelBadgeProps) {
  const bloomed = stage >= MAX_STAGE;
  return (
    <span
      className={
        bloomed
          ? 'bg-amber/20 text-wilted text-caption rounded-full px-sm py-[2px] font-display italic'
          : 'bg-primary-soft text-primary-hover text-caption rounded-full px-sm py-[2px]'
      }
    >
      {bloomed ? 'Fully bloomed' : `Level ${stage}`}
    </span>
  );
}
