import { createPortal } from 'react-dom';
import { useRef, useEffect } from 'react';

interface DiscardChangesDialogProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

const DISCARD_DIALOG_Z = 200000;

export function DiscardChangesDialog({ open, onKeepEditing, onDiscard }: DiscardChangesDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = rootRef.current;
    if (!el) return;

    const stop = (e: Event) => e.stopPropagation();

    el.addEventListener('focusin', stop, true);
    el.addEventListener('pointerdown', stop, true);
    el.addEventListener('mousedown', stop, true);
    el.addEventListener('focusin', stop);
    el.addEventListener('pointerdown', stop);
    el.addEventListener('mousedown', stop);

    const captureOnDoc = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-discard-dialog-root]')) {
        e.stopPropagation();
      }
    };
    document.addEventListener('focusin', captureOnDoc, true);
    document.addEventListener('pointerdown', captureOnDoc, true);
    document.addEventListener('mousedown', captureOnDoc, true);

    return () => {
      el.removeEventListener('focusin', stop, true);
      el.removeEventListener('pointerdown', stop, true);
      el.removeEventListener('mousedown', stop, true);
      el.removeEventListener('focusin', stop);
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('mousedown', stop);
      document.removeEventListener('focusin', captureOnDoc, true);
      document.removeEventListener('pointerdown', captureOnDoc, true);
      document.removeEventListener('mousedown', captureOnDoc, true);
    };
  }, [open]);

  return createPortal(
    <div
      ref={rootRef}
      data-discard-dialog-root
      className={`fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-150 ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ zIndex: DISCARD_DIALOG_Z, pointerEvents: open ? 'auto' : undefined }}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(2px)', pointerEvents: open ? 'auto' : undefined }}
        onClick={onKeepEditing}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="discard-dialog-title"
        aria-describedby="discard-dialog-desc"
        className="relative w-full max-w-md rounded-xl border border-gray-dark bg-gray-darkest p-6 shadow-xl"
        style={{ pointerEvents: open ? 'auto' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="discard-dialog-title" className="text-lg font-semibold text-white-primary">
          ¿Descartar cambios?
        </h2>
        <p id="discard-dialog-desc" className="mt-2 text-sm text-gray-lightest">
          Tienes cambios sin guardar. Si cierras el formulario, se perderán.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="elegante-button-primary rounded-xl"
            style={{ pointerEvents: open ? 'auto' : undefined }}
            onClick={onKeepEditing}
          >
            Seguir editando
          </button>
          <button
            type="button"
            className="bg-transparent text-gray-lightest border border-gray-dark hover:bg-gray-dark font-semibold rounded-xl px-6 py-3 transition-colors"
            style={{ pointerEvents: open ? 'auto' : undefined }}
            onClick={onDiscard}
          >
            Descartar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
