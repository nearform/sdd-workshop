import { useEffect, useId, useRef, useState } from 'react';
import { NewIdeaInputSchema, type NewIdeaInput } from '@idea-garden/shared';

type NewIdeaModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewIdeaInput) => Promise<void> | void;
};

type FieldErrors = {
  title?: string;
  description?: string;
  form?: string;
};

export function NewIdeaModal({ open, onClose, onCreate }: NewIdeaModalProps) {
  const titleId = useId();
  const descId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setErrors({});
      setIsSubmitting(false);
      // Focus the title input on next paint
      const t = setTimeout(() => titleInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return;
  }, [open]);

  // Escape closes the modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const result = NewIdeaInputSchema.safeParse({ title, description });
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path === 'title' && !fieldErrors.title) fieldErrors.title = issue.message;
        else if (path === 'description' && !fieldErrors.description)
          fieldErrors.description = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    // result.data is the parsed payload — title is trimmed, description is
    // null when blank. Pass that forward so callers see the canonical shape.
    try {
      await onCreate({ title: result.data.title, description: result.data.description });
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Something went wrong saving your idea.',
      });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  };

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 bg-on-surface/40 flex items-center justify-center p-md z-50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${titleId}-heading`}
        className="bg-surface rounded-xl shadow-modal w-full max-w-[560px] p-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-md">
          <h2 id={`${titleId}-heading`} className="text-headline-md text-on-surface">
            Plant a new seed
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

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label htmlFor={titleId} className="text-label-md text-on-surface">
              Title
            </label>
            <input
              id={titleId}
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={errors.title ? 'true' : 'false'}
              aria-describedby={errors.title ? `${titleId}-error` : undefined}
              className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none"
              autoComplete="off"
            />
            {errors.title && (
              <p id={`${titleId}-error`} className="text-caption text-error">
                {errors.title}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-xs">
            <label htmlFor={descId} className="text-label-md text-on-surface">
              Description (optional)
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              aria-invalid={errors.description ? 'true' : 'false'}
              aria-describedby={errors.description ? `${descId}-error` : undefined}
              className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none resize-none"
            />
            {errors.description && (
              <p id={`${descId}-error`} className="text-caption text-error">
                {errors.description}
              </p>
            )}
          </div>

          {errors.form && (
            <p role="alert" className="text-body-sm text-error bg-wilted-soft rounded-md p-sm">
              {errors.form}
            </p>
          )}

          <div className="flex items-center justify-end gap-sm pt-md">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface text-on-surface text-label-md rounded-md px-md py-sm border border-border hover:bg-neutral"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-white text-label-md rounded-md px-md py-sm hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Plant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
