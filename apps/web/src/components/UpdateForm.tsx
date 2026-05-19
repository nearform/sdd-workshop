import { useId, useState } from 'react';
import { NewIdeaUpdateInputSchema } from '@idea-garden/shared';

type UpdateFormProps = {
  onSubmit: (note: string) => Promise<void>;
  disabled?: boolean;
};

const MAX_NOTE_CHARS = 1000;

export function UpdateForm({ onSubmit, disabled }: UpdateFormProps) {
  const noteId = useId();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || disabled) return;

    const result = NewIdeaUpdateInputSchema.safeParse({ note });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Note is invalid');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(result.data.note);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the watering.');
    } finally {
      setSubmitting(false);
    }
  };

  const counter = `${note.length}/${MAX_NOTE_CHARS}`;
  const overLimit = note.length > MAX_NOTE_CHARS;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-xs">
      <label htmlFor={noteId} className="text-label-md text-on-surface">
        Water this idea
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${noteId}-error` : undefined}
        className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none resize-none"
        placeholder="What did you do for this idea today?"
        disabled={submitting || disabled}
      />
      <div className="flex items-center justify-between text-caption">
        {error ? (
          <p id={`${noteId}-error`} className="text-error">
            {error}
          </p>
        ) : (
          <span className="text-on-surface-muted">&nbsp;</span>
        )}
        <span className={overLimit ? 'text-error' : 'text-on-surface-muted'}>{counter}</span>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting || disabled || overLimit}
          className="bg-primary text-white text-label-md rounded-md px-md py-sm hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Watering…' : 'Water'}
        </button>
      </div>
    </form>
  );
}
