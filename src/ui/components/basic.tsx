import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from './Icons';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-raised text-ink',
  danger: 'bg-danger/15 text-danger',
  ghost: 'text-accent-ink',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  small?: boolean;
}

export function Button({ variant = 'secondary', block, small, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`press inline-flex items-center justify-center gap-2 font-medium disabled:pointer-events-none disabled:opacity-35 ${
        small ? 'min-h-[40px] rounded-[10px] px-4 text-[16px]' : 'min-h-[48px] rounded-[10px] px-5 text-[17px]'
      } ${block ? 'w-full' : ''} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

/** Okrúhle tlačidlo s ikonou (späť, časovač, viac…). */
export function CircleButton({
  children,
  label,
  onClick,
  to,
  className = '',
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  to?: string;
  className?: string;
}) {
  const cls = `press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink ${className}`;
  if (to) {
    return (
      <Link to={to} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export const BackButton = ({ onClick }: { onClick: () => void }) => (
  <CircleButton label="Späť" onClick={onClick}>
    <ChevronLeftIcon />
  </CircleButton>
);

/** Zoskupený zoznam: riadky oddelené jemnou čiarou. */
export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line overflow-hidden rounded-xl bg-surface ${className}`}>{children}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-surface p-4 ${className}`}>{children}</div>;
}

interface RowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  chevron?: boolean;
  danger?: boolean;
  label?: string;
  disabled?: boolean;
}

/** Riadok zoznamu; s `to` je odkaz, s `onClick` tlačidlo. */
export function Row({ title, subtitle, leading, trailing, to, onClick, chevron, danger, label, disabled }: RowProps) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className={`block text-[17px] leading-snug ${danger ? 'text-danger' : ''}`}>{title}</span>
        {subtitle && <span className="mt-0.5 block text-[15px] leading-snug text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-muted">{trailing}</span>}
      {chevron && (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" className="shrink-0 text-faint" aria-hidden>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const cls = 'flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-raised';
  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} disabled:opacity-40`} aria-label={label} disabled={disabled}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** Nadpis sekcie ako v Hevy: biely, stredne veľký, akcia vpravo. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex min-h-[32px] items-center justify-between">
      <h2 className="text-[22px] font-medium leading-tight tracking-[-0.015em]">{children}</h2>
      {action}
    </div>
  );
}

/** Číslo s popisom. */
export function Stat({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: 'accent' }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-[14px] text-muted">{label}</p>
      <p className={`t-num mt-2 text-[26px] ${tone === 'accent' ? 'text-good' : ''}`}>
        {value}
        {unit && <span className="ml-1 text-[17px] text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-surface px-6 py-7 text-center">
      <p className="text-[18px] font-medium">{title}</p>
      {hint && <p className="max-w-xs text-[15px] text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label = 'Načítavam…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-20 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent-ink" />
      {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mb-3 rounded-[10px] bg-danger/15 px-4 py-3 text-[15px] text-danger">
      {children}
    </p>
  );
}

/** Čip ako v Hevy: aktívny je modrý. */
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`press min-h-[36px] shrink-0 rounded-full px-4 text-[16px] ${active ? 'bg-accent text-on-accent' : 'bg-raised text-ink'}`}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' | 'good' }) {
  const t = {
    muted: 'bg-raised text-muted',
    accent: 'bg-accent/20 text-accent-ink',
    good: 'bg-good/20 text-good',
  }[tone];
  return <span className={`inline-block rounded-md px-1.5 py-[3px] text-[11px] font-semibold uppercase leading-none tracking-[0.04em] ${t}`}>{children}</span>;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[56px] w-full items-center justify-between gap-4 px-4 py-2 text-left"
    >
      <span>
        <span className="block text-[17px]">{label}</span>
        {hint && <span className="mt-0.5 block text-[14px] leading-snug text-muted">{hint}</span>}
      </span>
      <span className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${checked ? 'bg-good' : 'bg-raised'}`}>
        <span className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-[2px]'}`} />
      </span>
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] uppercase tracking-[0.04em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-[13px] text-muted">{hint}</span>}
    </label>
  );
}
