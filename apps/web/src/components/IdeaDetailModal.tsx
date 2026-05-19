import { useEffect, useId, useRef, useState } from 'react';
import type {
  EditIdeaInput,
  Idea,
  IdeaUpdate,
  MutationResponse,
} from '@idea-garden/shared';
import { useIdeaDetail } from '../hooks/useIdeaDetail.ts';
import { LevelBadge } from './LevelBadge.tsx';
import { Timeline } from './Timeline.tsx';
import { UpdateForm } from './UpdateForm.tsx';
import { EditIdeaForm } from './EditIdeaForm.tsx';
import { OverflowMenu } from './OverflowMenu.tsx';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog.tsx';
import { PlantViewport, type PlantViewportHandle } from './PlantViewport.tsx';
import { ConfettiBurst, type ConfettiVariant } from './ConfettiBurst.tsx';

type IdeaDetailModalProps = {
  ideaId: string | null;
  onClose: () => void;
  onAddUpdate: (ideaId: string, input: { note: string }) => Promise<MutationResponse>;
  onEditIdea: (ideaId: string, input: EditIdeaInput) => Promise<MutationResponse>;
  onEditUpdate: (
    ideaId: string,
    updateId: string,
    input: { note: string },
  ) => Promise<MutationResponse>;
  onDeleteUpdate: (ideaId: string, updateId: string) => Promise<MutationResponse>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
};

export function IdeaDetailModal({
  ideaId,
  onClose,
  onAddUpdate,
  onEditIdea,
  onEditUpdate,
  onDeleteUpdate,
  onDeleteIdea,
}: IdeaDetailModalProps) {
  const headingId = useId();
  const detail = useIdeaDetail(ideaId);
  const [localIdea, setLocalIdea] = useState<Idea | null>(null);
  const [localUpdates, setLocalUpdates] = useState<IdeaUpdate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiVariant | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const plantRef = useRef<PlantViewportHandle>(null);

  useEffect(() => {
    if (detail.status === 'ready') {
      setLocalIdea(detail.idea);
      setLocalUpdates(detail.updates);
    }
    if (detail.status !== 'ready') {
      setLocalIdea(null);
      setLocalUpdates([]);
    }
  }, [detail]);

  useEffect(() => {
    setIsEditing(false);
    setIsAnimating(false);
    setConfirmDeleteOpen(false);
    setConfetti(null);
    setModalError(null);
  }, [ideaId]);

  useEffect(() => {
    if (ideaId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAnimating && !confirmDeleteOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ideaId, isAnimating, confirmDeleteOpen, onClose]);

  if (ideaId == null) return null;

  const handleBackdropClick = () => {
    if (isAnimating) return;
    onClose();
  };

  const handleCloseClick = () => {
    if (isAnimating) return;
    onClose();
  };

  const handleWater = async (note: string) => {
    if (!localIdea) return;
    setIsAnimating(true);
    setModalError(null);
    try {
      const result = await onAddUpdate(localIdea.id, { note });
      const palette = result.idea.stage === 16 ? 'bloom' : 'growth';
      const isBloom = result.prev_stage < 16 && result.idea.stage === 16;
      const isFirstWatering = result.prev_stage === 1 && result.idea.stage === 2;
      if (isBloom) {
        setConfetti('bloom');
      } else if (isFirstWatering) {
        setConfetti('firstWatering');
      }
      if (plantRef.current) {
        await plantRef.current.playGrowth({
          from: result.prev_stage,
          to: result.idea.stage,
          palette,
        });
      }
      setLocalIdea(result.idea);
      if (result.update) {
        setLocalUpdates((prev) => [result.update!, ...prev]);
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not save the watering.');
      throw err;
    } finally {
      setIsAnimating(false);
    }
  };

  const handleEditSave = async (input: EditIdeaInput) => {
    if (!localIdea) return;
    const result = await onEditIdea(localIdea.id, input);
    setLocalIdea(result.idea);
    setIsEditing(false);
  };

  const handleEditUpdate = async (updateId: string, note: string) => {
    if (!localIdea) return;
    const result = await onEditUpdate(localIdea.id, updateId, { note });
    setLocalIdea(result.idea);
    if (result.update) {
      setLocalUpdates((prev) =>
        prev.map((u) => (u.id === updateId ? result.update! : u)),
      );
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!localIdea) return;
    const result = await onDeleteUpdate(localIdea.id, updateId);
    setLocalUpdates((prev) => prev.filter((u) => u.id !== updateId));
    setLocalIdea(result.idea);
  };

  const handleDeleteIdea = async () => {
    if (!localIdea) return;
    try {
      await onDeleteIdea(localIdea.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not delete this idea.');
    }
  };

  return (
    <div
      data-testid="idea-detail-backdrop"
      className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-md md:p-2xl"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative bg-paper rounded-xl shadow-modal w-[min(1280px,95vw)] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {detail.status === 'loading' && (
          <div data-testid="modal-skeleton" className="flex-1 grid md:grid-cols-[1.1fr_1fr] gap-lg p-xl">
            <div className="flex flex-col gap-md">
              <div className="h-8 bg-primary-soft rounded-md w-2/3" />
              <div className="h-4 bg-neutral rounded-md w-4/5" />
              <div className="flex-1 bg-primary-soft/60 rounded-lg border border-border" />
            </div>
            <div className="flex flex-col gap-md">
              <div className="h-24 bg-neutral rounded-md" />
              <div className="h-4 bg-neutral rounded-md w-full" />
              <div className="h-4 bg-neutral rounded-md w-5/6" />
              <div className="h-4 bg-neutral rounded-md w-4/6" />
            </div>
          </div>
        )}

        {detail.status === 'not_found' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-sm text-center p-xl">
            <h2 id={headingId} className="font-display italic text-[28px] text-ink">
              That idea is no longer in your garden
            </h2>
            <p className="text-body-sm text-ink/65 max-w-md">
              It may have been deleted. Close this dialog and refresh to see the latest garden.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-md bg-ink text-paper text-label-md rounded-full px-lg py-sm hover:bg-primary transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {detail.status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-sm text-center p-xl">
            <h2 id={headingId} className="font-display italic text-[28px] text-ink">
              We couldn't load this idea
            </h2>
            <p className="text-body-sm text-error">{detail.error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-md bg-ink text-paper text-label-md rounded-full px-lg py-sm hover:bg-primary transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {detail.status === 'ready' && localIdea && (
          <>
            <header className="shrink-0 flex items-center justify-between gap-sm px-lg md:px-xl py-md border-b border-border bg-paper">
              <div className="flex items-center gap-sm text-caption text-ink/55">
                <span className="font-mono uppercase tracking-[0.22em]">tending</span>
                <span className="w-6 h-px bg-ink/30" />
                <span className="italic font-display">an idea garden</span>
              </div>
              <div className="flex items-center gap-xs">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={isAnimating}
                    className="text-label-md text-ink rounded-md px-sm py-xs border border-border hover:bg-cream disabled:opacity-60 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {!isEditing && (
                  <OverflowMenu
                    items={[
                      {
                        label: 'Delete idea',
                        destructive: true,
                        onSelect: () => setConfirmDeleteOpen(true),
                      },
                    ]}
                  />
                )}
                <button
                  type="button"
                  onClick={handleCloseClick}
                  aria-label="Close"
                  disabled={isAnimating}
                  className="text-ink/55 hover:bg-cream rounded-md w-9 h-9 flex items-center justify-center disabled:opacity-60 text-[20px]"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-0">
              {/* Column 1 — identity + plant viewport */}
              <section
                aria-label="Idea identity"
                className="relative flex flex-col gap-md p-lg md:p-xl border-b md:border-b-0 md:border-r border-border bg-gradient-to-br from-paper to-cream/40 min-h-0"
              >
                <div className="flex flex-col gap-sm">
                  {isEditing ? (
                    <EditIdeaForm
                      initialTitle={localIdea.title}
                      initialDescription={localIdea.description}
                      onSave={handleEditSave}
                      onCancel={() => setIsEditing(false)}
                    />
                  ) : (
                    <>
                      <h2
                        id={headingId}
                        className="font-display italic text-[clamp(28px,3.4vw,44px)] leading-[1.05] tracking-[-0.01em] text-ink break-words"
                      >
                        {localIdea.title}
                      </h2>
                      {localIdea.description && (
                        <p className="text-body-md text-ink/70 max-w-prose whitespace-pre-wrap">
                          {localIdea.description}
                        </p>
                      )}
                      <div className="mt-xs">
                        <LevelBadge stage={localIdea.stage} />
                      </div>
                    </>
                  )}
                </div>

                <div className="relative flex-1 min-h-[260px] md:min-h-0 w-full">
                  <PlantViewport
                    ref={plantRef}
                    species={localIdea.species}
                    stage={localIdea.stage}
                  />
                </div>

                {modalError && (
                  <p
                    role="alert"
                    className="text-body-sm text-error bg-wilted-soft rounded-md p-sm"
                  >
                    {modalError}
                  </p>
                )}
              </section>

              {/* Column 2 — update form (top) + timeline (scrollable below) */}
              <section
                aria-label="Watering history"
                className="flex flex-col min-h-0 bg-surface"
              >
                <div
                  data-testid="update-form-region"
                  className="shrink-0 border-b border-border p-lg md:p-xl flex flex-col gap-sm bg-cream/30"
                >
                  <h3 className="text-headline-sm text-ink font-display italic">
                    Water this idea
                  </h3>
                  <p className="text-caption text-ink/55">
                    Each watering bumps the level. Notes are kept forever.
                  </p>
                  <UpdateForm onSubmit={handleWater} disabled={isAnimating} />
                </div>

                <div
                  data-testid="timeline-region"
                  className="flex-1 min-h-0 overflow-y-auto p-lg md:p-xl flex flex-col gap-md"
                >
                  <div className="flex items-center gap-sm">
                    <h3 className="text-headline-sm text-ink font-display italic">
                      Past waterings
                    </h3>
                    <span className="font-mono text-caption text-ink/45">
                      {localUpdates.length.toString().padStart(2, '0')}
                    </span>
                    <span aria-hidden className="flex-1 h-px bg-border" />
                  </div>
                  <Timeline
                    updates={localUpdates}
                    onEdit={handleEditUpdate}
                    onDelete={handleDeleteUpdate}
                  />
                </div>
              </section>
            </div>
          </>
        )}

        <ConfirmDeleteDialog
          open={confirmDeleteOpen}
          ideaTitle={localIdea?.title ?? ''}
          onConfirm={handleDeleteIdea}
          onCancel={() => setConfirmDeleteOpen(false)}
        />
      </div>

      {confetti && (
        <ConfettiBurst variant={confetti} onComplete={() => setConfetti(null)} />
      )}
    </div>
  );
}
