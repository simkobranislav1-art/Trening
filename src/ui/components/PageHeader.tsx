import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/** Jednoriadková hlavička: späť, nadpis, akcie. Pri posune dostane rozmazané pozadie. */
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
  titleAction?: ReactNode;
  subtitle?: string;
  compact?: boolean;
}) {
  const nav = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={`pt-safe sticky top-0 z-20 backdrop-blur-xl transition-colors ${
        scrolled ? 'bg-bg/85 shadow-[0_0.5px_0_rgb(var(--line))]' : 'bg-bg/60'
      }`}
    >
      <div className="flex min-h-[56px] items-center gap-1 px-4 py-2">
        {back && (
          <button
            type="button"
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            aria-label="Späť"
            className="press -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-ink"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="min-w-0">
            <h1 className={`t-large line-clamp-2 ${title.length > 30 ? '!text-[20px]' : title.length > 18 ? '!text-[24px]' : ''}`}>{title}</h1>
            {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
          </div>
          {titleAction}
        </div>
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      </div>
    </header>
  );
}
