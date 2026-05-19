import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  NewUpdateInputSchema,
  UpdateIdeaInputSchema,
  type Idea,
  type IdeaUpdate,
} from '@idea-garden/shared';
import {
  ApiClientError,
  addUpdate,
  deleteIdea,
  getIdea,
  updateIdea,
} from '../api/ideas.ts';
import { PlantImage } from './PlantImage.tsx';
import { relativeTime } from '../lib/relativeTime.ts';

type IdeaDetailModalProps = {
  ideaId: string | null;
  onClose: () => void;
  onIdeaChanged: (idea: Idea) => void;
  onIdeaDeleted: (id: string) => void;
};

const MAX_STAGE = 16;

export function IdeaDetailModal({
  ideaId,
  onClose,
  onIdeaChanged,
  onIdeaDeleted,
}: IdeaDetailModalProps) {
  const titleId = useId();
  const descId = useId();
  const noteId = useId();
  const headingId = useId();

  const [idea, setIdea] = useState<Idea | null>(null);
  const [updates, setUpdates] = useState<IdeaUpdate[]>([]);
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadError, setLoadError] = useState<string | undefined>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [descError, setDescError] = useState<string | undefined>();
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | undefined>();
  const [detailsDirty, setDetailsDirty] = useState(false);

  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>();
  const [watering, setWatering] = useState(false);
  const [waterFormError, setWaterFormError] = useState<string | undefined>();

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isOpen = ideaId !== null;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const resetForIdea = useCallback((next: Idea) => {
    setIdea(next);
    setTitle(next.title);
    setDescription(next.description ?? '');
    setTitleError(undefined);
    setDescError(undefined);
    setDetailsError(undefined);
    setDetailsDirty(false);
    setNote('');
    setNoteError(undefined);
    setWaterFormError(undefined);
    setDeleteError(undefined);
    setConfirmingDelete(false);
  }, []);

  useEffect(() => {
    if (!isOpen || ideaId === null) return;
    let cancelled = false;
    setLoadStatus('loading');
    setLoadError(undefined);
    setIdea(null);
    setUpdates([]);
    setConfirmingDelete(false);
    void (async () => {
      try {
        const detail = await getIdea(ideaId);
        if (cancelled) return;
        resetForIdea(detail.idea);
        setUpdates(detail.updates);
        setLoadStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setLoadStatus('error');
        setLoadError(
          err instanceof ApiClientError ? err.message : 'Failed to load idea',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, ideaId, resetForIdea]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea || savingDetails) return;
    const result = UpdateIdeaInputSchema.safeParse({ title, description });
    if (!result.success) {
      let tErr: string | undefined;
      let dErr: string | undefined;
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path === 'title' && !tErr) tErr = issue.message;
        else if (path === 'description' && !dErr) dErr = issue.message;
      }
      setTitleError(tErr);
      setDescError(dErr);
      return;
    }
    setTitleError(undefined);
    setDescError(undefined);
    setDetailsError(undefined);
    setSavingDetails(true);
    try {
      const updated = await updateIdea(idea.id, {
        title: result.data.title,
        description: result.data.description,
      });
      resetForIdea(updated);
      onIdeaChanged(updated);
    } catch (err) {
      setDetailsError(
        err instanceof Error ? err.message : 'Could not save changes.',
      );
    } finally {
      setSavingDetails(false);
    }
  };

  const handleWater = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea || watering) return;
    const result = NewUpdateInputSchema.safeParse({ note });
    if (!result.success) {
      setNoteError(result.error.issues[0]?.message ?? 'Note is required');
      return;
    }
    setNoteError(undefined);
    setWaterFormError(undefined);
    setWatering(true);
    try {
      const { idea: updatedIdea, update } = await addUpdate(idea.id, {
        note: result.data.note,
      });
      setIdea(updatedIdea);
      setUpdates((prev) => [update, ...prev]);
      setNote('');
      onIdeaChanged(updatedIdea);
    } catch (err) {
      setWaterFormError(
        err instanceof Error ? err.message : 'Could not add update.',
      );
    } finally {
      setWatering(false);
    }
  };

  const handleDelete = async () => {
    if (!idea || deleting) return;
    setDeleteError(undefined);
    setDeleting(true);
    try {
      await deleteIdea(idea.id);
      onIdeaDeleted(idea.id);
      onClose();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete idea.',
      );
      setDeleting(false);
    }
  };

  const bloomed = idea ? idea.stage >= MAX_STAGE : false;
  const fillPct = idea ? (Math.min(MAX_STAGE, Math.max(0, idea.stage)) / MAX_STAGE) * 100 : 0;

  return (
    <div
      data-testid="idea-detail-backdrop"
      className="fixed inset-0 bg-on-surface/40 flex items-center justify-center p-md z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="bg-surface rounded-xl shadow-modal w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-md">
          <h2 id={headingId} className="text-headline-md text-on-surface">
            Idea details
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-muted hover:bg-primary-soft rounded-md w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {loadStatus === 'loading' && (
          <p className="text-body-sm text-on-surface-muted italic py-lg text-center" role="status" aria-live="polite">
            loading idea…
          </p>
        )}

        {loadStatus === 'error' && (
          <p role="alert" className="text-body-sm text-error bg-wilted-soft rounded-md p-sm">
            {loadError ?? 'Could not load idea.'}
          </p>
        )}

        {loadStatus === 'ready' && idea && (
          <div className="flex flex-col gap-lg">
            <section className="flex gap-lg items-start">
              <div className="flex-shrink-0 w-32 h-32 flex items-center justify-center bg-neutral rounded-lg">
                <PlantImage species={idea.species} stage={idea.stage} className="w-28 h-28 object-contain" />
              </div>
              <div className="flex-1 flex flex-col gap-xs">
                <div className="flex items-center gap-sm">
                  <span
                    className={
                      bloomed
                        ? 'bg-amber/20 text-wilted text-caption rounded-full px-sm py-[2px] font-display italic'
                        : 'bg-primary-soft text-primary-hover text-caption rounded-full px-sm py-[2px]'
                    }
                  >
                    {bloomed ? 'Fully bloomed' : `Level ${idea.stage}`}
                  </span>
                  <span className="font-mono text-caption text-on-surface-muted">
                    {String(idea.stage).padStart(2, '0')}/{MAX_STAGE}
                  </span>
                </div>
                <div className="relative h-[3px] rounded-full bg-on-surface/10 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-700 ease-out rounded-full"
                    style={{ width: `${fillPct}%` }}
                    aria-hidden
                  />
                </div>
                <p className="text-caption text-on-surface-muted italic">
                  Planted {relativeTime(Date.now(), idea.created_at)} · Last watered{' '}
                  {relativeTime(Date.now(), idea.updated_at)}
                </p>
              </div>
            </section>

            <form onSubmit={handleDetailsSubmit} noValidate className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label htmlFor={titleId} className="text-label-md text-on-surface">
                  Title
                </label>
                <input
                  id={titleId}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDetailsDirty(true);
                  }}
                  aria-invalid={titleError ? 'true' : 'false'}
                  aria-describedby={titleError ? `${titleId}-error` : undefined}
                  className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none"
                  autoComplete="off"
                />
                {titleError && (
                  <p id={`${titleId}-error`} className="text-caption text-error">
                    {titleError}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-xs">
                <label htmlFor={descId} className="text-label-md text-on-surface">
                  Description
                </label>
                <textarea
                  id={descId}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setDetailsDirty(true);
                  }}
                  rows={3}
                  aria-invalid={descError ? 'true' : 'false'}
                  aria-describedby={descError ? `${descId}-error` : undefined}
                  className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none resize-none"
                />
                {descError && (
                  <p id={`${descId}-error`} className="text-caption text-error">
                    {descError}
                  </p>
                )}
              </div>

              {detailsError && (
                <p role="alert" className="text-body-sm text-error bg-wilted-soft rounded-md p-sm">
                  {detailsError}
                </p>
              )}

              <div className="flex items-center justify-end gap-sm">
                <button
                  type="submit"
                  disabled={!detailsDirty || savingDetails}
                  className="bg-primary text-white text-label-md rounded-md px-md py-sm hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingDetails ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>

            <hr className="border-border" />

            <section className="flex flex-col gap-sm">
              <h3 className="text-label-md uppercase tracking-wider text-on-surface-muted">
                Water this idea
              </h3>
              <form onSubmit={handleWater} noValidate className="flex flex-col gap-xs">
                <label htmlFor={noteId} className="sr-only">
                  Update note
                </label>
                <textarea
                  id={noteId}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What did you refine, add, or learn about this idea?"
                  rows={3}
                  aria-invalid={noteError ? 'true' : 'false'}
                  aria-describedby={noteError ? `${noteId}-error` : undefined}
                  className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none resize-none"
                />
                {noteError && (
                  <p id={`${noteId}-error`} className="text-caption text-error">
                    {noteError}
                  </p>
                )}
                {waterFormError && (
                  <p role="alert" className="text-body-sm text-error bg-wilted-soft rounded-md p-sm">
                    {waterFormError}
                  </p>
                )}
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={watering}
                    className="bg-primary text-white text-label-md rounded-md px-md py-sm hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {watering ? 'Watering…' : bloomed ? 'Celebrate' : 'Water'}
                  </button>
                </div>
              </form>
            </section>

            <section className="flex flex-col gap-sm">
              <h3 className="text-label-md uppercase tracking-wider text-on-surface-muted">
                Waterings ({updates.length})
              </h3>
              {updates.length === 0 ? (
                <p className="text-body-sm italic text-on-surface-muted">
                  No waterings yet — give this idea its first drink.
                </p>
              ) : (
                <ul className="flex flex-col gap-sm">
                  {updates.map((u) => (
                    <li
                      key={u.id}
                      className="border border-border rounded-md p-md flex flex-col gap-xs bg-neutral/40"
                    >
                      <div className="flex items-center justify-between text-caption text-on-surface-muted">
                        <span className="italic">{relativeTime(Date.now(), u.created_at)}</span>
                        <span className="font-mono">→ Level {u.stage_after}</span>
                      </div>
                      <p className="text-body-md text-on-surface whitespace-pre-wrap break-words">
                        {u.note}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <hr className="border-border" />

            <section className="flex flex-col gap-sm">
              {deleteError && (
                <p role="alert" className="text-body-sm text-error bg-wilted-soft rounded-md p-sm">
                  {deleteError}
                </p>
              )}
              {confirmingDelete ? (
                <div className="flex items-center justify-between gap-sm">
                  <p className="text-body-sm text-on-surface-muted">
                    Pull this idea out of the garden? This can't be undone.
                  </p>
                  <div className="flex items-center gap-sm">
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="bg-surface text-on-surface text-label-md rounded-md px-md py-sm border border-border hover:bg-neutral"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-error text-white text-label-md rounded-md px-md py-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-wilted text-label-md rounded-md px-md py-sm border border-wilted/40 hover:bg-wilted-soft transition-colors"
                  >
                    Delete idea
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
