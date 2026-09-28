import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseBackup } from '../domain/backup';
import { newSession, newSet, newWorkoutExercise } from '../domain/workout';
import { FitnessDB } from './db';
import {
  clearAll,
  ensureSeeded,
  exportAll,
  finishSession,
  getActiveSession,
  importAll,
  saveSession,
} from './repo';

let n = 0;
let db: FitnessDB;
beforeEach(() => {
  db = new FitnessDB(`test-${++n}`);
});

function filledSession() {
  const s = newSession('Test', [newWorkoutExercise({ id: 'fed-barbell-squat', name: 'Barbell Squat' }, 2)]);
  s.exercises[0].sets[0] = newSet({ weight: 100, reps: 5, done: true });
  return s;
}

describe('aktívny tréning', () => {
  it('prežije zatvorenie a znovuotvorenie databázy', async () => {
    const s = filledSession();
    await saveSession(s, db);
    db.close();

    const reopened = new FitnessDB(db.name);
    const restored = await getActiveSession(reopened);
    expect(restored).toEqual(s);
    reopened.close();
  });

  it('nedovolí dva súbežné aktívne tréningy', async () => {
    await saveSession(filledSession(), db);
    await expect(saveSession(filledSession(), db)).rejects.toThrow();
  });

  it('po ukončení zahodí nedokončené série a vytvorí rekordy', async () => {
    const s = filledSession();
    await saveSession(s, db);
    const done = await finishSession(s, db);
    expect(done?.exercises[0].sets).toHaveLength(1);
    expect(await getActiveSession(db)).toBeNull();
    expect((await db.personalRecords.toArray()).length).toBeGreaterThan(0);
  });

  it('tréning bez dokončenej série sa neuloží ako dokončený', async () => {
    const s = newSession('Prázdny', [newWorkoutExercise({ id: 'x', name: 'X' })]);
    expect(await finishSession(s, db)).toBeNull();
  });
});

describe('export a import', () => {
  it('záloha sa dá exportovať a importovať bez straty dát', async () => {
    await ensureSeeded(db);
    const s = filledSession();
    await saveSession(s, db);
    await finishSession(s, db);

    const backup = await exportAll(db);
    const text = JSON.stringify(backup);

    const other = new FitnessDB(`test-${++n}`);
    const res = await importAll(text, other);
    expect(res).toMatchObject({ ok: true, sessions: 1, routines: 3 });

    const again = await exportAll(other);
    expect(again.data.sessions).toEqual(backup.data.sessions);
    expect(again.data.routines).toEqual(backup.data.routines);
    expect(again.data.personalRecords).toEqual(backup.data.personalRecords);
  });

  it('import nahradí existujúce dáta', async () => {
    await ensureSeeded(db);
    const backup = await exportAll(db);
    await clearAll(db);
    expect(await db.routines.count()).toBe(0);
    await importAll(JSON.stringify(backup), db);
    expect(await db.routines.count()).toBe(3);
  });

  it('ukážkové rutiny sa po vymazaní dát znova nevytvoria', async () => {
    await ensureSeeded(db);
    await clearAll(db);
    await ensureSeeded(db);
    expect(await db.routines.count()).toBe(0);
  });
});

describe('validácia importu', () => {
  const valid = async () => {
    await ensureSeeded(db);
    const s = filledSession();
    await saveSession(s, db);
    await finishSession(s, db);
    return JSON.parse(JSON.stringify(await exportAll(db)));
  };

  it('odmietne neplatný JSON', () => {
    expect(parseBackup('{nie json')).toMatchObject({ ok: false });
  });

  it('odmietne cudzí súbor', () => {
    expect(parseBackup('{"hello":1}')).toMatchObject({ ok: false });
    expect(parseBackup('[]')).toMatchObject({ ok: false });
  });

  it('odmietne novšiu verziu', async () => {
    const b = await valid();
    b.version = 99;
    expect(parseBackup(JSON.stringify(b))).toMatchObject({ ok: false, error: expect.stringContaining('novšej') });
  });

  it('odmietne chýbajúce alebo chybné polia', async () => {
    const b = await valid();
    delete b.data.sessions;
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);

    const c = await valid();
    c.data.sessions[0].exercises[0].sets[0].reps = 'päť';
    const res = parseBackup(JSON.stringify(c));
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining('reps') });

    const d = await valid();
    d.data.sessions[0].startedAt = 'včera';
    expect(parseBackup(JSON.stringify(d)).ok).toBe(false);

    const e = await valid();
    e.data.settings.theme = 'pink';
    expect(parseBackup(JSON.stringify(e)).ok).toBe(false);
  });

  it('odmietne duplicitné ID', async () => {
    const b = await valid();
    b.data.routines.push(b.data.routines[0]);
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
  });

  it('chybný import nezmení existujúce dáta', async () => {
    await ensureSeeded(db);
    const before = await db.routines.count();
    const res = await importAll('{"app":"fitness-pwa","version":1}', db);
    expect(res.ok).toBe(false);
    expect(await db.routines.count()).toBe(before);
  });
});
