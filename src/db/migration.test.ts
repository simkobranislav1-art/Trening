import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { parseBackup } from '../domain/backup';
import { FitnessDB } from './db';
import { deleteRoutine, exportAll, mergeFromBackup, saveBodyEntry, deleteBodyEntry, importAll, ensureSeeded } from './repo';

/** Databáza tak, ako ju vytvorila verzia 1 aplikácie. */
async function createV1(name: string) {
  const old = new Dexie(name);
  old.version(1).stores({
    settings: 'id',
    customExercises: 'id, name',
    routines: 'id, createdAt',
    sessions: 'id, status, startedAt',
    personalRecords: 'id, exerciseId, sessionId, achievedAt',
  });
  await old.table('settings').put({
    id: 'app',
    theme: 'light',
    restSeconds: 90,
    showEffort: true,
    effortMode: 'rir',
    hiddenExerciseIds: ['x'],
    samplesSeeded: true,
  });
  await old.table('sessions').put({
    id: 's1',
    routineId: null,
    name: 'Starý tréning',
    note: '',
    status: 'finished',
    startedAt: '2025-01-01T10:00:00.000Z',
    endedAt: '2025-01-01T11:00:00.000Z',
    pausedAt: null,
    pausedMs: 0,
    restEndsAt: null,
    durationSec: 3600,
    exercises: [
      {
        id: 'e1',
        exerciseId: 'fed-barbell-squat',
        exerciseName: 'Barbell Squat',
        note: '',
        sets: [{ id: 'a', type: 'working', weight: 100, reps: 5, rpe: null, rir: null, done: true, completedAt: null }],
      },
    ],
  });
  old.close();
}

describe('migrácia databázy v1 → v2', () => {
  it('zachová históriu a doplní nové polia', async () => {
    await createV1('mig-1');
    const db = new FitnessDB('mig-1');
    const s = await db.sessions.get('s1');
    expect(s?.name).toBe('Starý tréning');
    expect(s?.exercises[0].sets[0].weight).toBe(100);
    expect(s?.updatedAt).toBe('2025-01-01T11:00:00.000Z');
    const st = await db.settings.get('app');
    expect(st).toMatchObject({ theme: 'light', restSeconds: 90, restSound: true, barWeight: 20, progressionStep: 2.5 });
    expect(st?.weeklyPlan).toHaveLength(7);
    expect(await db.bodyEntries.count()).toBe(0);
    db.close();
  });
});

describe('záloha verzie 1', () => {
  it('sa dá importovať a prevedie na aktuálny formát', async () => {
    const v1 = {
      app: 'fitness-pwa',
      version: 1,
      exportedAt: '2025-02-01T10:00:00.000Z',
      data: {
        settings: { id: 'app', theme: 'dark', restSeconds: 120, showEffort: false, effortMode: 'rpe', hiddenExerciseIds: [], samplesSeeded: true },
        customExercises: [],
        routines: [],
        sessions: [
          {
            id: 's1', routineId: null, name: 'T', note: '', status: 'finished',
            startedAt: '2025-01-01T10:00:00.000Z', endedAt: '2025-01-01T11:00:00.000Z', pausedAt: null, pausedMs: 0,
            restEndsAt: null, durationSec: 3600, exercises: [],
          },
        ],
        personalRecords: [],
      },
    };
    const res = parseBackup(JSON.stringify(v1));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.version).toBe(2);
      expect(res.backup.data.sessions[0].updatedAt).toBe('2025-01-01T11:00:00.000Z');
      expect(res.backup.data.settings.plates.length).toBeGreaterThan(0);
      expect(res.backup.data.bodyEntries).toEqual([]);
    }
    const db = new FitnessDB('imp-v1');
    expect((await importAll(JSON.stringify(v1), db)).ok).toBe(true);
    expect(await db.sessions.count()).toBe(1);
    db.close();
  });
});

describe('synchronizácia cez súbor', () => {
  it('dve zariadenia sa zlúčia a zmazanie sa prenesie', async () => {
    const a = new FitnessDB('sync-a');
    const b = new FitnessDB('sync-b');
    await ensureSeeded(a);
    await saveBodyEntry({ id: 'w1', date: '2026-01-01', weight: 80, bodyFat: null, waist: null, chest: null, arm: null, thigh: null, note: '', updatedAt: '' }, a);

    // B dostane všetko z A
    const r1 = await mergeFromBackup(JSON.stringify(await exportAll(a)), b);
    expect(r1.ok).toBe(true);
    expect(await b.routines.count()).toBe(3);
    expect(await b.bodyEntries.count()).toBe(1);

    // A zmaže rutinu aj záznam, B ich po zlúčení stratí
    const routineId = (await a.routines.toArray())[0].id;
    await deleteRoutine(routineId, a);
    await deleteBodyEntry('w1', a);
    const r2 = await mergeFromBackup(JSON.stringify(await exportAll(a)), b);
    expect(r2).toMatchObject({ ok: true });
    expect(await b.routines.count()).toBe(2);
    expect(await b.bodyEntries.count()).toBe(0);
    a.close();
    b.close();
  });

  it('chybný súbor nič nezmení', async () => {
    const db = new FitnessDB('sync-bad');
    await ensureSeeded(db);
    expect((await mergeFromBackup('nie json', db)).ok).toBe(false);
    expect(await db.routines.count()).toBe(3);
    db.close();
  });

  it('zmazanie rutiny ju odstráni aj z týždenného plánu', async () => {
    const db = new FitnessDB('plan-del');
    await ensureSeeded(db);
    const id = (await db.routines.toArray())[0].id;
    const st = (await db.settings.get('app'))!;
    await db.settings.put({ ...st, weeklyPlan: [id, null, null, null, null, null, null] });
    await deleteRoutine(id, db);
    expect((await db.settings.get('app'))!.weeklyPlan[0]).toBeNull();
    db.close();
  });
});
