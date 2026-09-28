import { describe, expect, it } from 'vitest';
import { mergeBackups } from './merge';
import type { BackupData } from './backup';
import { monthGrid, nextPlannedDay, plannedRoutineId, weekdayIndex } from './calendar';
import { plateBreakdown } from './plates';
import { muscleLoad, neglectedMuscles, weeklyBuckets } from './statistics';
import { upcomingWorkout } from './stats';
import { suggestNext } from './suggest';
import { DEFAULT_SETTINGS, type Routine, type WorkoutSession } from './types';
import { isLastInSuperset, newSet, newWorkoutExercise, reorder, sessionFromRoutine, toggleSupersetWithNext } from './workout';

const done = (w: number, r: number) => newSet({ weight: w, reps: r, done: true });

describe('návrh váhy', () => {
  it('pri 12 opakovaniach navrhne vyššiu váhu na 8 opakovaní', () => {
    expect(suggestNext([done(80, 12), done(80, 10)], 2.5)).toMatchObject({ weight: 82.5, reps: 8 });
  });
  it('inak rovnaká váha a o opakovanie viac', () => {
    expect(suggestNext([done(60, 8), done(60, 9)], 2.5)).toMatchObject({ weight: 60, reps: 10 });
  });
  it('ignoruje zahrievacie série a bez histórie nenavrhne nič', () => {
    expect(suggestNext([newSet({ weight: 100, reps: 12, done: true, type: 'warmup' })], 2.5)).toBeNull();
    expect(suggestNext([], 2.5)).toBeNull();
  });
});

describe('kalkulačka kotúčov', () => {
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  it('rozloží váhu na jednu stranu', () => {
    const r = plateBreakdown(100, 20, plates)!;
    expect(r.perSide).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.missing).toBe(0);
  });
  it('nahlási chýbajúcu váhu, ak sa nedá poskladať', () => {
    const r = plateBreakdown(21, 20, [5])!;
    expect(r.achieved).toBe(20);
    expect(r.missing).toBe(1);
  });
  it('váha menšia ako tyč nie je platná', () => {
    expect(plateBreakdown(10, 20, plates)).toBeNull();
  });
});

describe('kalendár a plán', () => {
  it('týždeň začína pondelkom', () => {
    expect(weekdayIndex(new Date(2026, 8, 28))).toBe(0); // pondelok 28. 9. 2026
    expect(weekdayIndex(new Date(2026, 8, 27))).toBe(6);
  });
  it('mriežka mesiaca má celé týždne', () => {
    const g = monthGrid(2026, 8);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[0][0].date.getDay()).toBe(1);
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });
  it('nájde najbližší naplánovaný deň', () => {
    const plan = [null, 'a', null, null, 'b', null, null];
    const n = nextPlannedDay(new Date(2026, 8, 28), plan)!; // pondelok
    expect(n.routineId).toBe('a');
    expect(plannedRoutineId(new Date(2026, 8, 25), plan)).toBe('b'); // piatok
    expect(nextPlannedDay(new Date(2026, 8, 28), Array(7).fill(null))).toBeNull();
  });
});

const routine = (id: string, name: string, at: number): Routine => ({
  id,
  name,
  note: '',
  exercises: [],
  isSample: false,
  createdAt: new Date(at).toISOString(),
  updatedAt: new Date(at).toISOString(),
});

const session = (id: string, startedAt: string, routineId: string | null, exId = 'bench', muscle = 'x'): WorkoutSession => ({
  id,
  routineId,
  name: id,
  note: '',
  status: 'finished',
  startedAt,
  endedAt: startedAt,
  pausedAt: null,
  pausedMs: 0,
  restEndsAt: null,
  durationSec: 60,
  updatedAt: startedAt,
  exercises: [{ id: 'we' + id, exerciseId: exId, exerciseName: muscle, note: '', sets: [done(100, 5), done(100, 5)] }],
});

describe('najbližší tréning', () => {
  const routines = [routine('a', 'A', 1), routine('b', 'B', 2)];
  const now = new Date(2026, 8, 28, 10); // pondelok
  it('berie plán, ak existuje', () => {
    const u = upcomingWorkout(routines, [], [null, 'b', null, null, null, null, null], now)!;
    expect(u.source).toBe('plan');
    expect(u.routine.id).toBe('b');
  });
  it('dnešný deň preskočí, ak už dnes bol tréning', () => {
    const plan = ['a', 'b', null, null, null, null, null];
    const u = upcomingWorkout(routines, [session('s', new Date(2026, 8, 28, 8).toISOString(), 'a')], plan, now)!;
    expect(u.routine.id).toBe('b');
  });
  it('bez plánu rotuje rutiny', () => {
    const u = upcomingWorkout(routines, [session('s', '2026-09-20T10:00:00Z', 'a')], Array(7).fill(null), now)!;
    expect(u.source).toBe('rotation');
    expect(u.routine.id).toBe('b');
  });
});

describe('štatistiky', () => {
  it('týždenné súčty a objem', () => {
    const now = new Date(2026, 8, 30, 12);
    const b = weeklyBuckets(
      [session('s1', new Date(2026, 8, 29, 9).toISOString(), null), session('s2', new Date(2026, 8, 15, 9).toISOString(), null)],
      4,
      now,
    );
    expect(b).toHaveLength(4);
    expect(b[3].count).toBe(1);
    expect(b[3].volume).toBe(1000);
    expect(b[1].count).toBe(1);
  });
  it('záťaž svalov a zaostávajúce partie', () => {
    const now = new Date(2026, 8, 30);
    const load = muscleLoad([session('s', new Date(2026, 8, 29).toISOString(), null, 'bench')], (id) => (id === 'bench' ? 'chest' : undefined), 7, now);
    expect(load.chest).toEqual({ sets: 2, volume: 1000 });
    expect(neglectedMuscles(load, ['chest', 'lats'])).toEqual(['lats']);
  });
});

describe('poradie a supersety', () => {
  it('reorder presúva prvok', () => {
    expect(reorder([1, 2, 3, 4], 0, 2)).toEqual([2, 3, 1, 4]);
    expect(reorder([1, 2], 0, 5)).toEqual([1, 2]);
  });
  it('superset sa dá spojiť a zrušiť', () => {
    const list = [{ supersetId: null }, { supersetId: null }, { supersetId: null }];
    const linked = toggleSupersetWithNext(list, 0);
    expect(linked[0].supersetId).toBeTruthy();
    expect(linked[0].supersetId).toBe(linked[1].supersetId);
    expect(linked[2].supersetId).toBeNull();
    expect(isLastInSuperset(linked, 0)).toBe(false);
    expect(isLastInSuperset(linked, 1)).toBe(true);
    const unlinked = toggleSupersetWithNext(linked, 0);
    expect(unlinked.every((x) => !x.supersetId)).toBe(true);
  });
  it('rutina prenesie superset do tréningu s novým ID', () => {
    const r = routine('r', 'R', 1);
    r.exercises = [
      { id: '1', exerciseId: 'a', exerciseName: 'A', sets: 2, note: '', supersetId: 'g' },
      { id: '2', exerciseId: 'b', exerciseName: 'B', sets: 2, note: '', supersetId: 'g' },
    ];
    const s = sessionFromRoutine(r);
    expect(s.exercises[0].supersetId).toBeTruthy();
    expect(s.exercises[0].supersetId).toBe(s.exercises[1].supersetId);
    expect(s.exercises[0].supersetId).not.toBe('g');
    expect(newWorkoutExercise({ id: 'x', name: 'X' }).supersetId).toBeUndefined();
  });
});

describe('zlučovanie záloh', () => {
  const base = (): BackupData => ({
    settings: DEFAULT_SETTINGS,
    customExercises: [],
    routines: [],
    sessions: [],
    personalRecords: [],
    bodyEntries: [],
    tombstones: [],
  });

  it('pridá nové a nahradí staršie verzie novšími', () => {
    const local = base();
    local.routines = [routine('a', 'Stará', 1000)];
    const incoming = base();
    incoming.routines = [routine('a', 'Nová', 5000), routine('b', 'B', 1000)];
    const { data, stats } = mergeBackups(local, incoming);
    expect(data.routines.map((r) => r.name).sort()).toEqual(['B', 'Nová']);
    expect(stats).toEqual({ added: 1, updated: 1, removed: 0 });
  });

  it('lokálna novšia verzia sa neprepíše', () => {
    const local = base();
    local.routines = [routine('a', 'Lokálna', 5000)];
    const incoming = base();
    incoming.routines = [routine('a', 'Cudzia', 1000)];
    expect(mergeBackups(local, incoming).data.routines[0].name).toBe('Lokálna');
  });

  it('zmazanie z druhého zariadenia sa prenesie', () => {
    const local = base();
    local.routines = [routine('a', 'A', 1000)];
    const incoming = base();
    incoming.tombstones = [{ id: 'a', kind: 'routine', deletedAt: new Date(9000).toISOString() }];
    const { data, stats } = mergeBackups(local, incoming);
    expect(data.routines).toHaveLength(0);
    expect(stats.removed).toBe(1);
  });

  it('úprava novšia ako zmazanie záznam zachová', () => {
    const local = base();
    local.routines = [routine('a', 'A', 9000)];
    const incoming = base();
    incoming.tombstones = [{ id: 'a', kind: 'routine', deletedAt: new Date(5000).toISOString() }];
    expect(mergeBackups(local, incoming).data.routines).toHaveLength(1);
  });

  it('nedokončený tréning z iného zariadenia sa neprenáša', () => {
    const local = base();
    const incoming = base();
    incoming.sessions = [{ ...session('s', '2026-01-01T10:00:00Z', null), status: 'active' }, session('t', '2026-01-02T10:00:00Z', null)];
    expect(mergeBackups(local, incoming).data.sessions.map((s) => s.id)).toEqual(['t']);
  });

  it('nastavenia ostávajú lokálne', () => {
    const local = base();
    local.settings = { ...DEFAULT_SETTINGS, restSeconds: 30 };
    const incoming = base();
    incoming.settings = { ...DEFAULT_SETTINGS, restSeconds: 300 };
    expect(mergeBackups(local, incoming).data.settings.restSeconds).toBe(30);
  });
});
