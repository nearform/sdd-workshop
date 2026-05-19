import { useId, useState } from 'react';
import { EditIdeaInputSchema, type EditIdeaInput } from '@idea-garden/shared';

type EditIdeaFormProps = {
  initialTitle: string;
  initialDescription: string | null;
  onSave: (input: EditIdeaInput) => Promise<void>;
  onCancel: () => void;
};

export function EditIdeaForm({
  initialTitle,
  initialDescription,
  onSave,
  onCancel,
}: EditIdeaFormProps) {
  const titleId = useId();
  const descId = useId();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [descError, setDescError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): EditIdeaInput | null => {
    const parsed = EditIdeaInputSchema.safeParse({
      title,
      description: description === '' ? null : description,
    });
    if (!parsed.success) {
      let titleMsg: string | null = null;
      let descMsg: string | null = null;
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'title' && !titleMsg) titleMsg = issue.message;
        else if (field === 'description' && !descMsg) descMsg = issue.message;
      }
      setTitleError(titleMsg);
      setDescError(descMsg);
      return null;
    }
    setTitleError(null);
    setDescError(null);
    return parsed.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const data = validate();
    if (!data) return;
    setFormError(null);
    setSaving(true);
    try {
      await onSave(data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <label htmlFor={titleId} className="text-label-md text-on-surface">
          Title
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={titleError ? 'true' : 'false'}
          aria-describedby={titleError ? `${titleId}-error` : undefined}
          className="bg-surface border border-border rounded-md px-sm py-sm text-body-md focus:border-primary focus:outline-none"
        />
        {titleError && (
          <p id={`${titleId}-error`} className="text-caption text-error">
            {titleError}
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

      {formError && (
        <p role="alert" className="text-body-sm text-error bg-wilted-soft rounded-md p-sm">
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-sm">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="bg-surface text-on-surface text-label-md rounded-md px-md py-sm border border-border hover:bg-neutral disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white text-label-md rounded-md px-md py-sm hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
