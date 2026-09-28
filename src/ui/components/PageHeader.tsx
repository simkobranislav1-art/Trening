import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({
  title,
  back,
  action,
  titleAction,
  subtitle,
}: {
  title: string;
  back?: boolean | string;
  action?: ReactNode;
  /** Malé tlačidlo hneď vedľa názvu (napr. premenovanie). */
  titleAction?: ReactNode;
  subtitle?: string;
}) {
  const nav = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-20 bg-bg/95 backdrop-blur">
      <div className="flex min-h-[64px] items-center gap-2 px-4 py-2">
        {back && (
          <button
            type="button"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            aria-label="Späť"
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-3xl text-accent"
          >
            ‹
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h1 className="line-clamp-2 min-w-0 text-2xl font-bold leading-tight">{title}</h1>
            {titleAction}
          </div>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
