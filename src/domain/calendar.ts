import { dayKey } from './format';

/** 0 = pondelok … 6 = nedeľa. */
export const weekdayIndex = (d: Date): number => (d.getDay() + 6) % 7;

export const WEEKDAYS_SHORT = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
export const WEEKDAYS_LONG = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

export interface DayCell {
  date: Date;
  key: string;
  inMonth: boolean;
}

/** Mriežka mesiaca po týždňoch (pondelok prvý). `month` je 0–11. */
export function monthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - weekdayIndex(first));
  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      week.push({ date, key: dayKey(date.toISOString()), inMonth: date.getMonth() === month });
    }
    if (w >= 4 && !week.some((c) => c.inMonth)) break;
    weeks.push(week);
  }
  return weeks;
}

export const localDayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** ID naplánovanej rutiny pre daný deň podľa týždenného plánu. */
export const plannedRoutineId = (date: Date, plan: (string | null)[]): string | null => plan[weekdayIndex(date)] ?? null;

/** Najbližší naplánovaný deň od `from` (vrátane) v nasledujúcich 7 dňoch. */
export function nextPlannedDay(from: Date, plan: (string | null)[]): { date: Date; routineId: string } | null {
  for (let i = 0; i < 7; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const routineId = plannedRoutineId(date, plan);
    if (routineId) return { date, routineId };
  }
  return null;
}
