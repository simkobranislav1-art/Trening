import { BACKUP_APP, createBackup, parseBackup, type BackupData, type BackupFile } from '../domain/backup';
import { computePersonalRecords } from '../domain/calc';
import { uid } from '../domain/format';
import { mergeBackups, type MergeStats } from '../domain/merge';
import { sampleRoutines } from '../domain/samples';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type BodyEntry,
  type CustomExercise,
  type Routine,
  type Tombstone,
  type WorkoutSession,
} from '../domain/types';
import { finalizeSession } from '../domain/workout';
import { db as defaultDb, type FitnessDB } from './db';

/** Vytvorí nastavenia a (raz) ukážkové rutiny. Volá sa pri štarte aplikácie. */
export async function ensureSeeded(db: FitnessDB = defaultDb): Promise<AppSettings> {
  return db.transaction('rw', db.settings, db.routines, async () => {
    const existing = await db.settings.get('app');
    if (existing?.samplesSeeded) return existing;
    const settings: AppSettings = { ...DEFAULT_SETTINGS, ...existing, samplesSeeded: true };
    if ((await db.routines.count()) === 0) await db.routines.bulkAdd(sampleRoutines());
    await db.settings.put(settings);
    return settings;
  });
}

export async function updateSettings(patch: Partial<AppSettings>, db: FitnessDB = defaultDb): Promise<void> {
  const cur = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...cur, ...patch, id: 'app' });
}

const tombstone = (id: string, kind: Tombstone['kind']): Tombstone => ({ id, kind, deletedAt: new Date().toISOString() });

// --- Rutiny ---------------------------------------------------------------

export async function saveRoutine(r: Routine, db: FitnessDB = defaultDb): Promise<void> {
  await db.routines.put({ ...r, updatedAt: new Date().toISOString() });
}

export async function deleteRoutine(id: string, db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.routines, db.tombstones, db.settings, async () => {
    await db.routines.delete(id);
    await db.tombstones.put(tombstone(id, 'routine'));
    const st = await db.settings.get('app');
    if (st?.weeklyPlan?.includes(id)) {
      await db.settings.put({ ...st, weeklyPlan: st.weeklyPlan.map((x) => (x === id ? null : x)) });
    }
  });
}

export async function removeSampleRoutines(db: FitnessDB = defaultDb): Promise<number> {
  const ids = (await db.routines.toArray()).filter((r) => r.isSample).map((r) => r.id);
  for (const id of ids) await deleteRoutine(id, db);
  return ids.length;
}

// --- Vlastné cviky --------------------------------------------------------

export async function saveCustomExercise(e: CustomExercise, db: FitnessDB = defaultDb): Promise<void> {
  await db.customExercises.put({ ...e, updatedAt: new Date().toISOString() });
}

export async function deleteCustomExercise(id: string, db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.customExercises, db.tombstones, async () => {
    await db.customExercises.delete(id);
    await db.tombstones.put(tombstone(id, 'customExercise'));
  });
}

// --- Tréningy -------------------------------------------------------------

export async function getActiveSession(db: FitnessDB = defaultDb): Promise<WorkoutSession | null> {
  const found = await db.sessions.where('status').anyOf('active', 'paused').first();
  return found ?? null;
}

/** Uloží rozpracovaný tréning. Odmietne druhý súbežný aktívny tréning. */
export async function saveSession(s: WorkoutSession, db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    if (s.status !== 'finished') {
      const other = await db.sessions.where('status').anyOf('active', 'paused').first();
      if (other && other.id !== s.id) throw new Error('Už prebieha iný tréning.');
    }
    await db.sessions.put(s);
  });
}

export async function rebuildPersonalRecords(db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.sessions, db.personalRecords, async () => {
    const sessions = await db.sessions.where('status').equals('finished').toArray();
    await db.personalRecords.clear();
    await db.personalRecords.bulkAdd(computePersonalRecords(sessions));
  });
}

/** Ukončí tréning. Vracia uložený tréning alebo null, ak nemal žiadnu dokončenú sériu. */
export async function finishSession(s: WorkoutSession, db: FitnessDB = defaultDb): Promise<WorkoutSession | null> {
  const done = finalizeSession(s);
  if (!done) return null;
  await db.sessions.put(done);
  await rebuildPersonalRecords(db);
  return done;
}

export const discardSession = (id: string, db: FitnessDB = defaultDb): Promise<void> => db.sessions.delete(id);

export async function deleteFinishedSession(id: string, db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.sessions, db.tombstones, async () => {
    await db.sessions.delete(id);
    await db.tombstones.put(tombstone(id, 'session'));
  });
  await rebuildPersonalRecords(db);
}

/** Zmení poznámku alebo názov dokončeného tréningu. */
export async function updateFinishedSession(
  id: string,
  patch: Partial<Pick<WorkoutSession, 'note' | 'name'>>,
  db: FitnessDB = defaultDb,
): Promise<void> {
  await db.sessions.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

// --- Telesné miery --------------------------------------------------------

export async function saveBodyEntry(e: BodyEntry, db: FitnessDB = defaultDb): Promise<void> {
  await db.bodyEntries.put({ ...e, updatedAt: new Date().toISOString() });
}

export async function deleteBodyEntry(id: string, db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.bodyEntries, db.tombstones, async () => {
    await db.bodyEntries.delete(id);
    await db.tombstones.put(tombstone(id, 'bodyEntry'));
  });
}

// --- Export / import / zlúčenie / vymazanie -------------------------------

const ALL_TABLES = (db: FitnessDB) => [
  db.settings,
  db.customExercises,
  db.routines,
  db.sessions,
  db.personalRecords,
  db.bodyEntries,
  db.tombstones,
];

async function readAll(db: FitnessDB): Promise<BackupData> {
  return {
    settings: { ...DEFAULT_SETTINGS, ...(await db.settings.get('app')) },
    customExercises: await db.customExercises.toArray(),
    routines: await db.routines.toArray(),
    sessions: await db.sessions.toArray(),
    personalRecords: await db.personalRecords.toArray(),
    bodyEntries: await db.bodyEntries.toArray(),
    tombstones: await db.tombstones.toArray(),
  };
}

export async function exportAll(db: FitnessDB = defaultDb): Promise<BackupFile> {
  return db.transaction('r', ALL_TABLES(db), async () => createBackup(await readAll(db)));
}

export type ImportOutcome =
  | { ok: true; sessions: number; routines: number; customExercises: number }
  | { ok: false; error: string };

/** Zapíše celé dáta (nahradí všetko) a prepočíta rekordy. Volať v transakcii. */
async function writeAll(db: FitnessDB, data: BackupData): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
  await db.settings.put({ ...data.settings, samplesSeeded: true });
  await db.customExercises.bulkAdd(data.customExercises);
  await db.routines.bulkAdd(data.routines);
  await db.sessions.bulkAdd(data.sessions);
  await db.bodyEntries.bulkAdd(data.bodyEntries);
  await db.tombstones.bulkAdd(data.tombstones);
  await db.personalRecords.bulkAdd(computePersonalRecords(data.sessions));
}

/** Overí a NAHRADÍ všetky dáta zálohou. Pri chybnom súbore sa nič nezmení. */
export async function importAll(text: string, db: FitnessDB = defaultDb): Promise<ImportOutcome> {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  const { data } = parsed.backup;
  await db.transaction('rw', ALL_TABLES(db), () => writeAll(db, data));
  return { ok: true, sessions: data.sessions.length, routines: data.routines.length, customExercises: data.customExercises.length };
}

export type MergeOutcome = { ok: true; stats: MergeStats } | { ok: false; error: string };

/**
 * Synchronizácia cez súbor: zlúči zálohu z iného zariadenia s lokálnymi dátami
 * (nič sa nestratí, novšie verzie a zmazania vyhrávajú). Nastavenia a rozpracovaný tréning ostanú.
 */
export async function mergeFromBackup(text: string, db: FitnessDB = defaultDb): Promise<MergeOutcome> {
  const parsed = parseBackup(text);
  if (!parsed.ok) return parsed;
  const incoming = parsed.backup.data;
  const stats = await db.transaction('rw', ALL_TABLES(db), async () => {
    const local = await readAll(db);
    const merged = mergeBackups(local, incoming);
    await writeAll(db, merged.data);
    // writeAll zapisuje samplesSeeded = true; ostatné nastavenia zostali lokálne.
    return merged.stats;
  });
  return { ok: true, stats };
}

/** Vymaže všetko; ukážkové dáta sa už znova nevytvoria. */
export async function clearAll(db: FitnessDB = defaultDb): Promise<void> {
  await db.transaction('rw', ALL_TABLES(db), async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.settings.put({ ...DEFAULT_SETTINGS, samplesSeeded: true });
  });
}

export const newCustomExercise = (): CustomExercise => {
  const now = new Date().toISOString();
  return {
    id: `custom-${uid()}`,
    name: '',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    equipment: 'barbell',
    category: 'strength',
    instructions: [],
    unilateral: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const BACKUP_FILE_PREFIX = BACKUP_APP;
