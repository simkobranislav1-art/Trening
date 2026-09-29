import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

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
      className={`press inline-flex items-center justify-center gap-2 font-semibold disabled:pointer-events-none disabled:opacity-35 ${
        small ? 'min-h-[44px] rounded-xl px-4 text-[15px]' : 'min-h-[52px] rounded-[14px] px-5 text-[16px]'
      } ${block ? 'w-full' : ''} ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

/** Zoskupený zoznam (ako v iOS Nastaveniach): riadky oddelené jemnou čiarou. */
export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`divide-y divide-line overflow-hidden rounded-2xl bg-surface ${className}`}>{children}</div>;
}

/** Jednoduchá plocha, keď nejde o zoznam riadkov. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface p-4 ${className}`}>{children}</div>;
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

/** Riadok zoznamu; s `to` je odkaz, s `onClick` tlačidlo. Min. výška 56 px. */
export function Row({ title, subtitle, leading, trailing, to, onClick, chevron, danger, label, disabled }: RowProps) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className={`block text-[17px] font-medium leading-snug ${danger ? 'text-danger' : ''}`}>{title}</span>
        {subtitle && <span className="mt-0.5 block text-[14px] leading-snug text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-muted">{trailing}</span>}
      {chevron && (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-faint" aria-hidden>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const cls = 'flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-raised/70 transition-colors';
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

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="t-label">{children}</h2>
      {action}
    </div>
  );
}

/** Číslo s popisom. */
export function Stat({ label, value, unit, tone }: { label: string; value: ReactNode; unit?: string; tone?: 'accent' }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className={`t-num mt-1.5 text-[28px] ${tone === 'accent' ? 'text-good' : ''}`}>
        {value}
        {unit && <span className="ml-1 text-[20px] font-medium text-muted">{unit}</span>}
      </p>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-7 text-center">
      <p className="t-title">{title}</p>
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
    <p role="alert" className="mb-3 rounded-xl bg-danger/15 px-4 py-3 text-[15px] text-danger">
      {children}
    </p>
  );
}

/** Filtrovací čip; aktívny je neutrálny (biely), aby signálna farba zostala pre hlavné akcie. */
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`press min-h-[40px] shrink-0 rounded-full px-4 text-[15px] font-medium ${
        active ? 'bg-ink text-bg' : 'bg-raised text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' | 'good' }) {
  const t = {
    muted: 'bg-raised text-muted',
    accent: 'bg-accent text-on-accent',
    good: 'bg-good/20 text-good',
  }[tone];
  return (
    <span className={`inline-block rounded-md px-1.5 py-[3px] text-[11px] font-bold uppercase leading-none tracking-[0.06em] ${t}`}>
      {children}
    </span>
  );
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
      className="flex min-h-[60px] w-full items-center justify-between gap-4 px-4 py-2 text-left"
    >
      <span>
        <span className="block text-[17px] font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[14px] leading-snug text-muted">{hint}</span>}
      </span>
      <span className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-raised'}`}>
        <span
          className={`absolute top-[3px] h-6 w-6 rounded-full shadow transition-all ${
            checked ? 'left-[25px] bg-white' : 'left-[3px] bg-ink/90'
          }`}
        />
      </span>
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block px-1 text-[13px] text-muted">{hint}</span>}
    </label>
  );
}
