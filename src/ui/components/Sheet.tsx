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
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative flex w-full max-w-lg flex-col rounded-t-3xl bg-card outline-none md:rounded-3xl ${
          tall ? 'h-[88dvh]' : 'max-h-[88dvh]'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavrieť"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card2 text-xl"
          >
            ✕
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
      <p className="mb-5 text-muted">{message}</p>
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
