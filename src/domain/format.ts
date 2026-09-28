const LOCALE = 'sk-SK';

const num = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const int = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'numeric' });
const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });

export const fmtNumber = (n: number): string => num.format(n);
export const fmtInt = (n: number): string => int.format(Math.round(n));
/** 1 séria, 2–4 série, inak sérií. */
export const fmtSets = (n: number): string => `${n} ${n === 1 ? 'séria' : n >= 2 && n <= 4 ? 'série' : 'sérií'}`;
export const fmtKg = (n: number): string => `${num.format(n)}\u00a0kg`;
export const fmtVolume = (n: number): string => `${int.format(n)}\u00a0kg`;
export const fmtDate = (iso: string): string => dateFmt.format(new Date(iso));
export const fmtShortDate = (iso: string): string => shortDateFmt.format(new Date(iso));
export const fmtDay = (iso: string): string => dayFmt.format(new Date(iso));
export const fmtMonth = (iso: string): string => monthFmt.format(new Date(iso));
export const fmtTime = (iso: string): string => timeFmt.format(new Date(iso));

/** 3723 → "1:02:03", 95 → "1:35". */
export function fmtClock(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** 3723 → "1 h 2 min". */
export function fmtDuration(totalSec: number): string {
  const m = Math.round(totalSec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** Prijíma "82,5" aj "82.5"; prázdny alebo neplatný vstup → null. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const formatInputNumber = (n: number | null): string => (n === null ? '' : String(n).replace('.', ','));

/** Pondelok 00:00 miestneho času týždňa, do ktorého patrí `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
