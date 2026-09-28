import type { PersonalRecord, RecordKind, WorkoutExercise, WorkoutSession, WorkoutSet } from './types';

/**
 * Pravidlá výpočtu:
 *  - objem série = váha × opakovania,
 *  - do objemu a rekordov sa počítajú iba DOKONČENÉ série,
 *  - ZAHRIEVACIE série sa NEPOČÍTAJÚ (ani do objemu, ani do rekordov),
 *  - pracovné a drop série sa počítajú.
 */

export const setVolume = (s: Pick<WorkoutSet, 'weight' | 'reps'>): number => (s.weight ?? 0) * (s.reps ?? 0);

export const countsTowardsStats = (s: WorkoutSet): boolean => s.done && s.type !== 'warmup' && (s.reps ?? 0) > 0;

export const countedSets = (sets: WorkoutSet[]): WorkoutSet[] => sets.filter(countsTowardsStats);

export const exerciseVolume = (e: WorkoutExercise): number => countedSets(e.sets).reduce((a, s) => a + setVolume(s), 0);

export const workoutVolume = (exercises: WorkoutExercise[]): number => exercises.reduce((a, e) => a + exerciseVolume(e), 0);

/** Počet dokončených ssérií (vrátane zahrievacích) – na zobrazenie v histórii. */
export const doneSetCount = (exercises: WorkoutExercise[]): number =>
  exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);

/** Epleyho vzorec: 1RM = váha × (1 + opakovania / 30). */
export function estimate1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  return weight * (1 + reps / 30);
}

export interface Bests {
  weight: number;
  e1rm: number;
  volume: number;
}

export const emptyBests = (): Bests => ({ weight: 0, e1rm: 0, volume: 0 });

export interface RecordHit {
  kind: RecordKind;
  value: number;
  weight: number;
  reps: number;
  /** null = prvý výkon (základ). */
  previous: number | null;
}

interface Candidate {
  value: number;
  weight: number;
  reps: number;
}

const KINDS: RecordKind[] = ['weight', 'e1rm', 'volume'];

/** Najlepšie hodnoty z množiny sérií (iba započítané série). */
export function bestOfSets(sets: WorkoutSet[]): Partial<Record<RecordKind, Candidate>> {
  const best: Partial<Record<RecordKind, Candidate>> = {};
  for (const s of countedSets(sets)) {
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    const values: Record<RecordKind, number> = { weight: w, e1rm: estimate1RM(w, r), volume: w * r };
    for (const kind of KINDS) {
      const v = values[kind];
      if (v > 0 && (!best[kind] || v > best[kind]!.value)) best[kind] = { value: v, weight: w, reps: r };
    }
  }
  return best;
}

/**
 * Detekcia osobných rekordov: porovná najlepšie série s doterajšími maximami.
 * `previous` = null znamená, že cvik ešte nemá žiadnu históriu.
 */
export function detectRecords(previous: Bests | null, sets: WorkoutSet[]): { hits: RecordHit[]; bests: Bests } {
  const base = previous ?? emptyBests();
  const best = bestOfSets(sets);
  const bests = { ...base };
  const hits: RecordHit[] = [];
  for (const kind of KINDS) {
    const c = best[kind];
    if (c && c.value > base[kind]) {
      hits.push({ ...c, kind, previous: previous && base[kind] > 0 ? base[kind] : null });
      bests[kind] = c.value;
    }
  }
  return { hits, bests };
}

/** Prepočíta všetky rekordy z dokončených tréningov v chronologickom poradí. */
export function computePersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  const finished = sessions
    .filter((s) => s.status === 'finished')
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const bestsByExercise = new Map<string, Bests>();
  const out: PersonalRecord[] = [];
  for (const session of finished) {
    const setsByExercise = new Map<string, WorkoutSet[]>();
    for (const ex of session.exercises) {
      setsByExercise.set(ex.exerciseId, [...(setsByExercise.get(ex.exerciseId) ?? []), ...ex.sets]);
    }
    for (const [exerciseId, sets] of setsByExercise) {
      const { hits, bests } = detectRecords(bestsByExercise.get(exerciseId) ?? null, sets);
      if (hits.length) bestsByExercise.set(exerciseId, bests);
      for (const h of hits) {
        out.push({
          id: `${session.id}:${exerciseId}:${h.kind}`,
          exerciseId,
          kind: h.kind,
          value: h.value,
          weight: h.weight,
          reps: h.reps,
          previous: h.previous,
          sessionId: session.id,
          achievedAt: session.endedAt ?? session.startedAt,
        });
      }
    }
  }
  return out;
}
