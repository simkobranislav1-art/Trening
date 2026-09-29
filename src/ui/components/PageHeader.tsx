import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from './basic';

/**
 * Hlavička ako v Hevy:
 *  - záložky (bez `back`): veľký nadpis vľavo, akcie vpravo,
 *  - podstránky (`back`): okrúhle tlačidlo späť, nadpis vedľa neho, akcie vpravo.
 */
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
        scrolled ? 'bg-bg/85 shadow-[0_0.5px_0_rgb(var(--line))]' : 'bg-bg/70'
      }`}
    >
      <div className="flex min-h-[60px] items-center gap-3 px-4 py-2">
        {back && <BackButton onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} />}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="min-w-0">
            <h1
              className={`line-clamp-2 leading-tight tracking-[-0.015em] ${
                back ? 'text-[18px] font-medium' : 'text-[30px] font-medium'
              }`}
            >
              {title}
            </h1>
            {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
          </div>
          {titleAction}
        </div>
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      </div>
    </header>
  );
}
