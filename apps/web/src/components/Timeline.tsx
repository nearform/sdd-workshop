import type { IdeaUpdate } from '@idea-garden/shared';
import { EmptyTimeline } from './EmptyTimeline.tsx';
import { TimelineEntry } from './TimelineEntry.tsx';

type TimelineProps = {
  updates: IdeaUpdate[];
  now?: number;
  onEdit?: (updateId: string, note: string) => Promise<void>;
  onDelete?: (updateId: string) => Promise<void>;
};

export function Timeline({ updates, now, onEdit, onDelete }: TimelineProps) {
  if (updates.length === 0) return <EmptyTimeline />;
  return (
    <ol className="flex flex-col gap-sm">
      {updates.map((update) => (
        <TimelineEntry
          key={update.id}
          update={update}
          now={now}
          onEdit={onEdit ? (note) => onEdit(update.id, note) : undefined}
          onDelete={onDelete ? () => onDelete(update.id) : undefined}
        />
      ))}
    </ol>
  );
}
