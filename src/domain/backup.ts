import {
  V2_SETTINGS_DEFAULTS,
  type AppSettings,
  type BodyEntry,
  type CustomExercise,
  type PersonalRecord,
  type Routine,
  type Tombstone,
  type WorkoutExercise,
  type WorkoutSession,
  type WorkoutSet,
} from './types';

export const BACKUP_APP = 'fitness-pwa';
/** Verzia formátu zálohy. Pri zmene modelu zvýš a v `migrateBackup` doplň prevod. */
export const BACKUP_VERSION = 2;

export interface BackupData {
  settings: AppSettings;
  customExercises: CustomExercise[];
  routines: Routine[];
  sessions: WorkoutSession[];
  personalRecords: PersonalRecord[];
  bodyEntries: BodyEntry[];
  tombstones: Tombstone[];
}

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export const createBackup = (data: BackupData, now = new Date()): BackupFile => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  data,
});

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

class Invalid extends Error {}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(path: string, what: string): never {
  throw new Invalid(`${path}: ${what}`);
}

const str = (o: Obj, k: string, path: string): string => {
  const v = o[k];
  if (typeof v !== 'string') fail(`${path}.${k}`, 'očakáva sa text');
  return v;
};
const nonEmpty = (o: Obj, k: string, path: string): string => {
  const v = str(o, k, path);
  if (v.trim() === '') fail(`${path}.${k}`, 'nesmie byť prázdne');
  return v;
};
const isoDate = (o: Obj, k: string, path: string): string => {
  const v = str(o, k, path);
  if (Number.isNaN(Date.parse(v))) fail(`${path}.${k}`, 'neplatný dátum');
  return v;
};
const nullableIso = (o: Obj, k: string, path: string): string | null => (o[k] === null ? null : isoDate(o, k, path));
const num = (o: Obj, k: string, path: string, min = 0): number => {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min) fail(`${path}.${k}`, 'očakáva sa nezáporné číslo');
  return v;
};
const nullableNum = (o: Obj, k: string, path: string): number | null => (o[k] === null ? null : num(o, k, path));
const bool = (o: Obj, k: string, path: string): boolean => {
  const v = o[k];
  if (typeof v !== 'boolean') fail(`${path}.${k}`, 'očakáva sa áno/nie');
  return v;
};
const oneOf = <T extends string>(o: Obj, k: string, path: string, allowed: readonly T[]): T => {
  const v = o[k];
  if (typeof v !== 'string' || !allowed.includes(v as T)) fail(`${path}.${k}`, `povolené: ${allowed.join(', ')}`);
  return v as T;
};
const strArray = (o: Obj, k: string, path: string): string[] => {
  const v = o[k];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) fail(`${path}.${k}`, 'očakáva sa zoznam textov');
  return v as string[];
};
const list = <T>(o: Obj, k: string, path: string, each: (item: Obj, p: string) => T): T[] => {
  const v = o[k];
  if (!Array.isArray(v)) fail(`${path}.${k}`, 'očakáva sa zoznam');
  return v.map((item, i) => {
    if (!isObj(item)) fail(`${path}.${k}[${i}]`, 'očakáva sa objekt');
    return each(item, `${path}.${k}[${i}]`);
  });
};

const numArray = (o: Obj, k: string, path: string): number[] => {
  const v = o[k];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'number' || !Number.isFinite(x) || x < 0)) {
    fail(`${path}.${k}`, 'očakáva sa zoznam čísel');
  }
  return v as number[];
};

const parseWeeklyPlan = (o: Obj, p: string): (string | null)[] => {
  const v = o.weeklyPlan;
  if (!Array.isArray(v) || v.length !== 7 || v.some((x) => x !== null && typeof x !== 'string')) {
    fail(`${p}.weeklyPlan`, 'očakáva sa 7 hodnôt (ID rutiny alebo null)');
  }
  return v as (string | null)[];
};

const parseSettings = (o: Obj, p: string): AppSettings => ({
  id: 'app',
  theme: oneOf(o, 'theme', p, ['dark', 'light'] as const),
  restSeconds: num(o, 'restSeconds', p),
  showEffort: bool(o, 'showEffort', p),
  effortMode: oneOf(o, 'effortMode', p, ['rpe', 'rir'] as const),
  hiddenExerciseIds: strArray(o, 'hiddenExerciseIds', p),
  samplesSeeded: bool(o, 'samplesSeeded', p),
  weeklyPlan: parseWeeklyPlan(o, p),
  restSound: bool(o, 'restSound', p),
  barWeight: num(o, 'barWeight', p),
  plates: numArray(o, 'plates', p),
  lastBackupAt: nullableIso(o, 'lastBackupAt', p),
  progressionStep: num(o, 'progressionStep', p),
});

const parseCustomExercise = (o: Obj, p: string): CustomExercise => ({
  id: nonEmpty(o, 'id', p),
  name: nonEmpty(o, 'name', p),
  primaryMuscle: nonEmpty(o, 'primaryMuscle', p),
  secondaryMuscles: strArray(o, 'secondaryMuscles', p),
  equipment: nonEmpty(o, 'equipment', p),
  category: nonEmpty(o, 'category', p),
  instructions: strArray(o, 'instructions', p),
  unilateral: bool(o, 'unilateral', p),
  createdAt: isoDate(o, 'createdAt', p),
  updatedAt: isoDate(o, 'updatedAt', p),
});

const parseRoutine = (o: Obj, p: string): Routine => ({
  id: nonEmpty(o, 'id', p),
  name: nonEmpty(o, 'name', p),
  note: str(o, 'note', p),
  isSample: bool(o, 'isSample', p),
  createdAt: isoDate(o, 'createdAt', p),
  updatedAt: isoDate(o, 'updatedAt', p),
  exercises: list(o, 'exercises', p, (e, ep) => ({
    id: nonEmpty(e, 'id', ep),
    exerciseId: nonEmpty(e, 'exerciseId', ep),
    exerciseName: nonEmpty(e, 'exerciseName', ep),
    sets: num(e, 'sets', ep, 1),
    note: str(e, 'note', ep),
    ...(e.supersetId === undefined ? {} : { supersetId: optNullableStr(e, 'supersetId', ep) }),
  })),
});

/** Voliteľný text: chýbajúci kľúč zostane chýbajúci, aby import nemenil tvar dát. */
const optNullableStr = (o: Obj, k: string, path: string): string | null | undefined => {
  const v = o[k];
  if (v === undefined || v === null) return v;
  if (typeof v !== 'string') fail(`${path}.${k}`, 'očakáva sa text');
  return v;
};

const parseSet = (o: Obj, p: string): WorkoutSet => ({
  id: nonEmpty(o, 'id', p),
  type: oneOf(o, 'type', p, ['warmup', 'working', 'drop'] as const),
  weight: nullableNum(o, 'weight', p),
  reps: nullableNum(o, 'reps', p),
  rpe: nullableNum(o, 'rpe', p),
  rir: nullableNum(o, 'rir', p),
  done: bool(o, 'done', p),
  completedAt: nullableIso(o, 'completedAt', p),
  ...(o.note === undefined ? {} : { note: str(o, 'note', p) }),
});

const parseWorkoutExercise = (o: Obj, p: string): WorkoutExercise => ({
  id: nonEmpty(o, 'id', p),
  exerciseId: nonEmpty(o, 'exerciseId', p),
  exerciseName: nonEmpty(o, 'exerciseName', p),
  note: str(o, 'note', p),
  sets: list(o, 'sets', p, parseSet),
  ...(o.supersetId === undefined ? {} : { supersetId: optNullableStr(o, 'supersetId', p) }),
});

const parseSession = (o: Obj, p: string): WorkoutSession => ({
  id: nonEmpty(o, 'id', p),
  routineId: o.routineId === null ? null : nonEmpty(o, 'routineId', p),
  name: str(o, 'name', p),
  note: str(o, 'note', p),
  status: oneOf(o, 'status', p, ['active', 'paused', 'finished'] as const),
  startedAt: isoDate(o, 'startedAt', p),
  endedAt: nullableIso(o, 'endedAt', p),
  pausedAt: nullableIso(o, 'pausedAt', p),
  pausedMs: num(o, 'pausedMs', p),
  restEndsAt: nullableIso(o, 'restEndsAt', p),
  durationSec: nullableNum(o, 'durationSec', p),
  updatedAt: isoDate(o, 'updatedAt', p),
  exercises: list(o, 'exercises', p, parseWorkoutExercise),
});

const parseBodyEntry = (o: Obj, p: string): BodyEntry => {
  const date = str(o, 'date', p);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) fail(`${p}.date`, 'očakáva sa YYYY-MM-DD');
  return {
    id: nonEmpty(o, 'id', p),
    date,
    weight: nullableNum(o, 'weight', p),
    bodyFat: nullableNum(o, 'bodyFat', p),
    waist: nullableNum(o, 'waist', p),
    chest: nullableNum(o, 'chest', p),
    arm: nullableNum(o, 'arm', p),
    thigh: nullableNum(o, 'thigh', p),
    note: str(o, 'note', p),
    updatedAt: isoDate(o, 'updatedAt', p),
  };
};

const parseTombstone = (o: Obj, p: string): Tombstone => ({
  id: nonEmpty(o, 'id', p),
  kind: oneOf(o, 'kind', p, ['routine', 'session', 'customExercise', 'bodyEntry'] as const),
  deletedAt: isoDate(o, 'deletedAt', p),
});

const parseRecord = (o: Obj, p: string): PersonalRecord => ({
  id: nonEmpty(o, 'id', p),
  exerciseId: nonEmpty(o, 'exerciseId', p),
  kind: oneOf(o, 'kind', p, ['weight', 'e1rm', 'volume'] as const),
  value: num(o, 'value', p),
  weight: num(o, 'weight', p),
  reps: num(o, 'reps', p),
  previous: nullableNum(o, 'previous', p),
  sessionId: nonEmpty(o, 'sessionId', p),
  achievedAt: isoDate(o, 'achievedAt', p),
});

/** Prevod starších verzií zálohy na aktuálnu (v1 → v2). Chybné dáta necháva na validátory. */
function migrateBackup(file: Obj): Obj {
  if (file.version !== 1 || !isObj(file.data)) return file;
  const d = file.data;
  return {
    ...file,
    version: 2,
    data: {
      ...d,
      settings: isObj(d.settings) ? { ...V2_SETTINGS_DEFAULTS, ...d.settings } : d.settings,
      sessions: Array.isArray(d.sessions)
        ? d.sessions.map((s) => (isObj(s) && s.updatedAt === undefined ? { ...s, updatedAt: s.endedAt ?? s.startedAt } : s))
        : d.sessions,
      bodyEntries: d.bodyEntries ?? [],
      tombstones: d.tombstones ?? [],
    },
  };
}

function checkUnique(items: { id: string }[], path: string): void {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) fail(path, `duplicitné ID ${it.id}`);
    seen.add(it.id);
  }
}

/** Overí text zálohy. Nikdy nevyhodí výnimku; chyby vracia ako zrozumiteľný text. */
export function parseBackup(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Súbor nie je platný JSON.' };
  }
  try {
    if (!isObj(json) || json.app !== BACKUP_APP) {
      return { ok: false, error: 'Toto nie je záloha z tejto aplikácie.' };
    }
    if (typeof json.version !== 'number' || !Number.isInteger(json.version) || json.version < 1) {
      return { ok: false, error: 'Záloha má neplatnú verziu.' };
    }
    if (json.version > BACKUP_VERSION) {
      return { ok: false, error: 'Záloha pochádza z novšej verzie aplikácie. Najprv aktualizuj aplikáciu.' };
    }
    const file = migrateBackup(json);
    const exportedAt = isoDate(file, 'exportedAt', 'záloha');
    if (!isObj(file.data)) fail('záloha.data', 'chýbajú dáta');
    const d = file.data;
    if (!isObj(d.settings)) fail('data.settings', 'chýbajú nastavenia');
    const data: BackupData = {
      settings: parseSettings(d.settings, 'data.settings'),
      customExercises: list(d, 'customExercises', 'data', parseCustomExercise),
      routines: list(d, 'routines', 'data', parseRoutine),
      sessions: list(d, 'sessions', 'data', parseSession),
      personalRecords: list(d, 'personalRecords', 'data', parseRecord),
      bodyEntries: list(d, 'bodyEntries', 'data', parseBodyEntry),
      tombstones: list(d, 'tombstones', 'data', parseTombstone),
    };
    checkUnique(data.customExercises, 'data.customExercises');
    checkUnique(data.routines, 'data.routines');
    checkUnique(data.sessions, 'data.sessions');
    checkUnique(data.personalRecords, 'data.personalRecords');
    checkUnique(data.bodyEntries, 'data.bodyEntries');
    checkUnique(data.tombstones, 'data.tombstones');
    if (data.sessions.filter((s) => s.status !== 'finished').length > 1) {
      fail('data.sessions', 'môže byť najviac jeden rozpracovaný tréning');
    }
    return { ok: true, backup: { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, data } };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: `Neplatná záloha – ${e.message}` };
    throw e;
  }
}
