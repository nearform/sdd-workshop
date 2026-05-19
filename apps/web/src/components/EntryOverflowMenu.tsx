import { useEffect, useRef, useState } from 'react';

type EntryOverflowMenuProps = {
  onEdit?: () => void;
  onDelete?: () => void;
};

export function EntryOverflowMenu({ onEdit, onDelete }: EntryOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="More options"
        onClick={() => setOpen((o) => !o)}
        className="w-7 h-7 rounded-md flex items-center justify-center text-on-surface-muted hover:bg-neutral"
      >
        ⋮
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 bg-surface border border-border rounded-md shadow-modal min-w-[140px] py-xs"
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-md py-sm text-body-sm text-on-surface hover:bg-neutral"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void onDelete();
              }}
              className="w-full text-left px-md py-sm text-body-sm text-error hover:bg-wilted-soft"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
