import { useState } from 'react';
import type { IdeaUpdate } from '@idea-garden/shared';
import { LevelBadge } from './LevelBadge.tsx';
import { relativeTime } from '../lib/relativeTime.ts';
import { EntryOverflowMenu } from './EntryOverflowMenu.tsx';

type TimelineEntryProps = {
  update: IdeaUpdate;
  now?: number;
  onEdit?: (note: string) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function TimelineEntry({ update, now, onEdit, onDelete }: TimelineEntryProps) {
  const reference = now ?? Date.now();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(update.note);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = Boolean(onEdit);
  const canDelete = Boolean(onDelete);
  const showMenu = canEdit || canDelete;

  const handleEditClick = () => {
    setDraft(update.note);
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!onEdit) return;
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError('Note is required');
      return;
    }
    if (trimmed.length > 1000) {
      setError('Note must be 1000 characters or fewer');
      return;
    }
    setSaving(true);
    try {
      await onEdit(trimmed);
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the edit');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(update.note);
    setError(null);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete();
  };

  return (
    <li className="relative bg-surface border border-border rounded-lg p-md flex flex-col gap-xs">
      <div className="flex items-start justify-between gap-sm">
        <div className="flex items-center gap-sm text-caption text-on-surface-muted">
          <span>{relativeTime(reference, update.created_at)}</span>
          <LevelBadge stage={update.stage_after} />
        </div>
        {showMenu && !editing && (
          <EntryOverflowMenu
            onEdit={canEdit ? handleEditClick : undefined}
            onDelete={canDelete ? handleDelete : undefined}
          />
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-xs">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            aria-label="Edit note"
            className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none resize-none"
          />
          {error && <p className="text-caption text-error">{error}</p>}
          <div className="flex items-center justify-end gap-sm">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="text-label-md text-on-surface rounded-md px-md py-sm border border-border hover:bg-neutral disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white text-label-md rounded-md px-md py-sm hover:bg-primary-hover disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-body-md text-on-surface whitespace-pre-wrap">{update.note}</p>
      )}
    </li>
  );
}
