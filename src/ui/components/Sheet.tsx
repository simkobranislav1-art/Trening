import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './basic';

/** Spodný panel (dialóg). Zatvára sa Esc, ťuknutím na pozadie alebo tlačidlom. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tall?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex w-full max-w-lg animate-sheet-up flex-col rounded-t-3xl bg-surface outline-none md:rounded-3xl ${
          tall ? 'h-[90dvh]' : 'max-h-[90dvh]'
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-faint/60 md:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3">
          <h2 className="t-title min-w-0 break-words">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavrieť"
            className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-muted"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6 pb-safe">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      <p className="mb-5 text-[16px] text-muted">{message}</p>
      <div className="flex flex-col gap-3">
        <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button block onClick={onCancel}>
          Zrušiť
        </Button>
      </div>
    </Sheet>
  );
}
