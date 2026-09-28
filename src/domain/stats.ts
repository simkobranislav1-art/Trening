import { bestOfSets, countedSets, estimate1RM, setVolume, workoutVolume } from './calc';
import { nextPlannedDay } from './calendar';
import { startOfWeek } from './format';
import type { PersonalRecord, Routine, WorkoutSession, WorkoutSet } from './types';

export interface HistoryEntry {
  sessionId: string;
  date: string;
  sets: WorkoutSet[];
}

/** Index: cvik → jeho výkony v dokončených tréningoch, od najnovšieho. */
export function buildHistoryIndex(sessions: WorkoutSession[]): Map<string, HistoryEntry[]> {
  const map = new Map<string, HistoryEntry[]>();
  const sorted = sessions
    .filter((s) => s.status === 'finished')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const s of sorted) {
    const perEx = new Map<string, WorkoutSet[]>();
    for (const e of s.exercises) perEx.set(e.exerciseId, [...(perEx.get(e.exerciseId) ?? []), ...e.sets]);
    for (const [exerciseId, sets] of perEx) {
      const list = map.get(exerciseId) ?? [];
      list.push({ sessionId: s.id, date: s.startedAt, sets });
      map.set(exerciseId, list);
    }
  }
  return map;
}

export interface ExerciseStats {
  sessions: number;
  last: HistoryEntry | null;
  maxWeight: number;
  bestReps: number;
  best1RM: number;
  bestSetVolume: number;
}

export function exerciseStats(entries: HistoryEntry[]): ExerciseStats {
  let maxWeight = 0;
  let bestReps = 0;
  let best1RM = 0;
  let bestSetVolume = 0;
  for (const en of entries) {
    for (const s of countedSets(en.sets)) {
      const w = s.weight ?? 0;
      const r = s.reps ?? 0;
      maxWeight = Math.max(maxWeight, w);
      bestReps = Math.max(bestReps, r);
      best1RM = Math.max(best1RM, estimate1RM(w, r));
      bestSetVolume = Math.max(bestSetVolume, setVolume(s));
    }
  }
  return { sessions: entries.length, last: entries[0] ?? null, maxWeight, bestReps, best1RM, bestSetVolume };
}

/** Body grafu: najlepší odhadovaný 1RM z každého tréningu, od najstaršieho. */
export function progressSeries(entries: HistoryEntry[]): { date: string; value: number }[] {
  return entries
    .map((en) => ({ date: en.date, value: bestOfSets(en.sets).e1rm?.value ?? 0 }))
    .filter((p) => p.value > 0)
    .reverse();
}

export function weekSummary(sessions: WorkoutSession[], now = new Date()): { count: number; volume: number } {
  const from = startOfWeek(now).getTime();
  const inWeek = sessions.filter((s) => s.status === 'finished' && Date.parse(s.startedAt) >= from);
  return { count: inWeek.length, volume: inWeek.reduce((a, s) => a + workoutVolume(s.exercises), 0) };
}

/**
 * Najbližší tréning = ďalšia rutina v poradí po naposledy odcvičenej rutine
 * (rotácia Push → Pull → Legs → Push …). Bez histórie je to prvá rutina.
 */
export function nextRoutine(routines: Routine[], sessions: WorkoutSession[]): Routine | null {
  if (routines.length === 0) return null;
  const ordered = [...routines].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = sessions
    .filter((s) => s.status === 'finished' && s.routineId && ordered.some((r) => r.id === s.routineId))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (!last) return ordered[0];
  const idx = ordered.findIndex((r) => r.id === last.routineId);
  return ordered[(idx + 1) % ordered.length];
}

/** Aktuálne (najlepšie) rekordy cviku podľa druhu. */
export function currentRecords(records: PersonalRecord[], exerciseId: string): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const r of records) {
    if (r.exerciseId !== exerciseId) continue;
    const cur = best.get(r.kind);
    if (!cur || r.value > cur.value) best.set(r.kind, r);
  }
  return [...best.values()];
}

export interface Upcoming {
  routine: Routine;
  /** plan = z týždenného plánu, rotation = ďalšia rutina v poradí */
  source: 'plan' | 'rotation';
  date: Date | null;
}

/**
 * Najbližší tréning: z týždenného plánu (dnes alebo najbližší naplánovaný deň;
 * dnešný sa preskočí, ak už dnes bol odcvičený), inak rotácia rutín.
 */
export function upcomingWorkout(
  routines: Routine[],
  sessions: WorkoutSession[],
  plan: (string | null)[],
  now = new Date(),
): Upcoming | null {
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const trainedToday = sessions.some((s) => {
    if (s.status !== 'finished') return false;
    const d = new Date(s.startedAt);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
  });
  const from = trainedToday ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : now;
  const planned = nextPlannedDay(from, plan);
  const routine = planned && routines.find((r) => r.id === planned.routineId);
  if (planned && routine) return { routine, source: 'plan', date: planned.date };
  const next = nextRoutine(routines, sessions);
  return next ? { routine: next, source: 'rotation', date: null } : null;
}
