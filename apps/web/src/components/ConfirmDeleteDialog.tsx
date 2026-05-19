import { useEffect, useState } from 'react';

type ConfirmDeleteDialogProps = {
  open: boolean;
  ideaTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

export function ConfirmDeleteDialog({
  open,
  ideaTitle,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirming(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div
      data-testid="confirm-delete-backdrop"
      className="fixed inset-0 bg-on-surface/40 flex items-center justify-center p-md z-[60]"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-heading"
        className="bg-surface rounded-xl shadow-modal w-full max-w-[480px] p-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-delete-heading" className="text-headline-md text-on-surface mb-sm">
          {`Delete "${ideaTitle}"?`}
        </h2>
        <p className="text-body-sm text-on-surface-muted mb-lg">
          {"This can't be undone. All waterings will be removed too."}
        </p>
        <div className="flex items-center justify-end gap-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="bg-surface text-on-surface text-label-md rounded-md px-md py-sm border border-border hover:bg-neutral disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming}
            className="bg-error text-white text-label-md rounded-md px-md py-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {confirming ? 'Deleting…' : 'Yes, delete forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
