import { describe, expect, it } from 'vitest';
import { detectRecords, computePersonalRecords, estimate1RM, setVolume, workoutVolume } from './calc';
import { BUILTIN_EXERCISES } from './exercises';
import { sampleRoutines } from './samples';
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from './types';
import { newSet } from './workout';

const set = (weight: number, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet =>
  newSet({ weight, reps, done: true, ...extra });

const ex = (id: string, sets: WorkoutSet[]): WorkoutExercise => ({ id: 'we-' + id, exerciseId: id, exerciseName: id, note: '', sets });

const session = (id: string, startedAt: string, exercises: WorkoutExercise[]): WorkoutSession => ({
  id,
  routineId: null,
  name: id,
  note: '',
  status: 'finished',
  startedAt,
  endedAt: startedAt,
  pausedAt: null,
  pausedMs: 0,
  restEndsAt: null,
  durationSec: 3600,
  updatedAt: startedAt,
  exercises,
});

describe('objem', () => {
  it('objem série = váha × opakovania', () => {
    expect(setVolume({ weight: 80, reps: 5 })).toBe(400);
    expect(setVolume({ weight: null, reps: 10 })).toBe(0);
  });

  it('objem tréningu sčíta iba dokončené pracovné série (bez zahrievacích)', () => {
    const e = ex('a', [
      set(40, 10, { type: 'warmup' }),
      set(80, 5),
      set(60, 8, { type: 'drop' }),
      newSet({ weight: 100, reps: 5, done: false }),
    ]);
    expect(workoutVolume([e])).toBe(80 * 5 + 60 * 8);
  });
});

describe('odhadované 1RM (Epley)', () => {
  it('váha × (1 + opakovania / 30)', () => {
    expect(estimate1RM(100, 3)).toBeCloseTo(110);
    expect(estimate1RM(60, 10)).toBeCloseTo(80);
  });
  it('neplatné vstupy dávajú 0', () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe('osobné rekordy', () => {
  it('prvý výkon je základ (previous = null)', () => {
    const { hits } = detectRecords(null, [set(100, 5)]);
    expect(hits.map((h) => h.kind).sort()).toEqual(['e1rm', 'volume', 'weight']);
    expect(hits.every((h) => h.previous === null)).toBe(true);
  });

  it('rekord vznikne iba pri prekonaní predchádzajúceho maxima', () => {
    const first = detectRecords(null, [set(100, 5)]);
    const same = detectRecords(first.bests, [set(100, 5)]);
    expect(same.hits).toHaveLength(0);
    const heavier = detectRecords(first.bests, [set(105, 3)]);
    const weight = heavier.hits.find((h) => h.kind === 'weight');
    expect(weight).toMatchObject({ value: 105, previous: 100 });
  });

  it('zahrievacie a nedokončené série rekord nespôsobia', () => {
    const { hits } = detectRecords(null, [set(200, 5, { type: 'warmup' }), newSet({ weight: 300, reps: 1, done: false })]);
    expect(hits).toHaveLength(0);
  });

  it('prepočet z histórie vytvorí rekordy chronologicky', () => {
    const records = computePersonalRecords([
      session('s2', '2025-02-01T10:00:00Z', [ex('bench', [set(110, 5)])]),
      session('s1', '2025-01-01T10:00:00Z', [ex('bench', [set(100, 5)])]),
    ]);
    const weights = records.filter((r) => r.kind === 'weight');
    expect(weights.map((r) => [r.sessionId, r.value, r.previous])).toEqual([
      ['s1', 100, null],
      ['s2', 110, 100],
    ]);
  });
});

describe('ukážkové rutiny', () => {
  it('odkazujú iba na existujúce cviky knižnice', () => {
    const ids = new Set(BUILTIN_EXERCISES.map((e) => e.id));
    for (const r of sampleRoutines()) for (const e of r.exercises) expect(ids.has(e.exerciseId)).toBe(true);
  });
  it('knižnica má stabilné unikátne ID a približne 100 cvikov', () => {
    const ids = BUILTIN_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(95);
  });
});
