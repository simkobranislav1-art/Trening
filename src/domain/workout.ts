import { uid } from './format';
import type { Exercise, Routine, WorkoutExercise, WorkoutSession, WorkoutSet } from './types';

export const newSet = (init: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: uid(),
  type: 'working',
  weight: null,
  reps: null,
  rpe: null,
  rir: null,
  done: false,
  completedAt: null,
  ...init,
});

export const newWorkoutExercise = (ex: Pick<Exercise, 'id' | 'name'>, sets = 3): WorkoutExercise => ({
  id: uid(),
  exerciseId: ex.id,
  exerciseName: ex.name,
  note: '',
  sets: Array.from({ length: Math.max(1, sets) }, () => newSet()),
});

export function newSession(name: string, exercises: WorkoutExercise[], routineId: string | null = null): WorkoutSession {
  const startedAt = new Date().toISOString();
  return {
    id: uid(),
    routineId,
    name,
    note: '',
    status: 'active',
    startedAt,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    restEndsAt: null,
    durationSec: null,
    updatedAt: startedAt,
    exercises,
  };
}

/** Pre každý nový tréning vytvorí nové ID supersetov, aby sa nemiešali medzi tréningami. */
function remapSupersets<T extends { supersetId?: string | null }>(items: T[]): T[] {
  const map = new Map<string, string>();
  return items.map((i) => {
    if (!i.supersetId) return { ...i, supersetId: null };
    if (!map.has(i.supersetId)) map.set(i.supersetId, uid());
    return { ...i, supersetId: map.get(i.supersetId)! };
  });
}

export const sessionFromRoutine = (r: Routine): WorkoutSession =>
  newSession(
    r.name,
    remapSupersets(
      r.exercises.map((re) => ({
        ...newWorkoutExercise({ id: re.exerciseId, name: re.exerciseName }, re.sets),
        note: re.note,
        supersetId: re.supersetId ?? null,
      })),
    ),
    r.id,
  );

/** Opakovanie tréningu: rovnaké cviky a počet sérií, bez vyplnených hodnôt. */
export const sessionFromPast = (s: WorkoutSession): WorkoutSession =>
  newSession(
    s.name,
    remapSupersets(
      s.exercises.map((e) => ({
        ...newWorkoutExercise({ id: e.exerciseId, name: e.exerciseName }, e.sets.length),
        note: e.note,
        supersetId: e.supersetId ?? null,
      })),
    ),
    s.routineId,
  );

/** Presunie prvok z pozície `from` na pozíciu `to`. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * Prepne superset medzi cvikom `index` a nasledujúcim. Ak už sú spojené, oddelí ich
 * (cviky zostávajúce osamote v skupine sa uvoľnia).
 */
export function toggleSupersetWithNext<T extends { supersetId?: string | null }>(list: T[], index: number): T[] {
  if (index < 0 || index >= list.length - 1) return list;
  const a = list[index];
  const b = list[index + 1];
  let next: T[];
  if (a.supersetId && a.supersetId === b.supersetId) {
    next = list.map((x, i) => (i === index + 1 ? { ...x, supersetId: null } : x));
  } else {
    const id = a.supersetId ?? b.supersetId ?? uid();
    next = list.map((x, i) => (i === index || i === index + 1 ? { ...x, supersetId: id } : x));
  }
  // skupina s jediným členom nie je superset
  return next.map((x) =>
    x.supersetId && next.filter((y) => y.supersetId === x.supersetId).length < 2 ? { ...x, supersetId: null } : x,
  );
}

/** True, ak je cvik `index` posledný v svojom supersete (alebo nie je v žiadnom). */
export function isLastInSuperset(list: { supersetId?: string | null }[], index: number): boolean {
  const id = list[index]?.supersetId;
  return !id || list[index + 1]?.supersetId !== id;
}

/** Presunie prvok o `delta` miest; mimo rozsahu nič nemení. */
export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(to, 0, item);
  return copy;
}

/** Ubehnutý čistý čas tréningu v sekundách (bez pozastavení). */
export function elapsedSeconds(s: WorkoutSession, nowMs: number): number {
  if (s.durationSec !== null) return s.durationSec;
  const end = s.status === 'paused' && s.pausedAt ? Date.parse(s.pausedAt) : nowMs;
  return Math.max(0, (end - Date.parse(s.startedAt) - s.pausedMs) / 1000);
}

export function pauseSession(s: WorkoutSession): WorkoutSession {
  if (s.status !== 'active') return s;
  return { ...s, status: 'paused', pausedAt: new Date().toISOString() };
}

export function resumeSession(s: WorkoutSession): WorkoutSession {
  if (s.status !== 'paused') return s;
  const extra = s.pausedAt ? Date.now() - Date.parse(s.pausedAt) : 0;
  return { ...s, status: 'active', pausedAt: null, pausedMs: s.pausedMs + Math.max(0, extra) };
}

/**
 * Uzavrie tréning: zahodí nedokončené série a prázdne cviky, spočíta trvanie.
 * Vracia null, ak nezostala žiadna dokončená séria.
 */
export function finalizeSession(s: WorkoutSession, now = new Date()): WorkoutSession | null {
  const exercises = s.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
    .filter((e) => e.sets.length > 0);
  if (exercises.length === 0) return null;
  const running = resumeSession(s);
  const durationSec = Math.max(0, (now.getTime() - Date.parse(running.startedAt) - running.pausedMs) / 1000);
  return {
    ...running,
    exercises,
    status: 'finished',
    endedAt: now.toISOString(),
    pausedAt: null,
    restEndsAt: null,
    durationSec,
    updatedAt: now.toISOString(),
  };
}

/** Čo by sa pri ukončení zahodilo. */
export const unfinishedSetCount = (s: WorkoutSession): number =>
  s.exercises.reduce((a, e) => a + e.sets.filter((x) => !x.done).length, 0);
