import { countedSets, setVolume } from './calc';
import { startOfWeek } from './format';
import type { WorkoutSession } from './types';

export interface WeekBucket {
  weekStart: Date;
  count: number;
  volume: number;
}

/** Posledných `weeks` týždňov (od najstaršieho); týždeň začína v pondelok. */
export function weeklyBuckets(sessions: WorkoutSession[], weeks: number, now = new Date()): WeekBucket[] {
  const current = startOfWeek(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: new Date(current.getFullYear(), current.getMonth(), current.getDate() - i * 7), count: 0, volume: 0 });
  }
  for (const s of sessions) {
    if (s.status !== 'finished') continue;
    const t = Date.parse(s.startedAt);
    const idx = buckets.findIndex((b, i) => {
      const end = i + 1 < buckets.length ? buckets[i + 1].weekStart.getTime() : Infinity;
      return t >= b.weekStart.getTime() && t < end;
    });
    if (idx < 0) continue;
    buckets[idx].count += 1;
    for (const e of s.exercises) for (const set of countedSets(e.sets)) buckets[idx].volume += setVolume(set);
  }
  return buckets;
}

export interface MuscleLoad {
  sets: number;
  volume: number;
}

/**
 * Počet pracovných sérií a objem podľa hlavnej svalovej partie cviku
 * za posledných `days` dní. Cviky bez známej partie sa preskočia.
 */
export function muscleLoad(
  sessions: WorkoutSession[],
  muscleOf: (exerciseId: string) => string | undefined,
  days: number,
  now = new Date(),
): Record<string, MuscleLoad> {
  const since = now.getTime() - days * 86_400_000;
  const out: Record<string, MuscleLoad> = {};
  for (const s of sessions) {
    if (s.status !== 'finished' || Date.parse(s.startedAt) < since) continue;
    for (const e of s.exercises) {
      const m = muscleOf(e.exerciseId);
      if (!m) continue;
      const sets = countedSets(e.sets);
      const cur = (out[m] ??= { sets: 0, volume: 0 });
      cur.sets += sets.length;
      cur.volume += sets.reduce((a, x) => a + setVolume(x), 0);
    }
  }
  return out;
}

/** Partie bez jedinej série v danom období (zaostávajúce). */
export const neglectedMuscles = (load: Record<string, MuscleLoad>, all: string[]): string[] =>
  all.filter((m) => !load[m] || load[m].sets === 0);
