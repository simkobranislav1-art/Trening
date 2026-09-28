/** Dátový model aplikácie. Všetky dátumy sú ISO 8601 reťazce (UTC), hmotnosti v kg. */

export type SetType = 'warmup' | 'working' | 'drop';
export type SessionStatus = 'active' | 'paused' | 'finished';
export type RecordKind = 'weight' | 'e1rm' | 'volume';
export type Theme = 'dark' | 'light';
export type EffortMode = 'rpe' | 'rir';

/** Cvik z knižnice (vstavaný aj vlastný). */
export interface Exercise {
  id: string;
  name: string;
  /** Pôvodný anglický názov (vyhľadávanie) – iba vstavané cviky. */
  nameEn?: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  category: string;
  instructions: string[];
  unilateral: boolean;
  custom: boolean;
}

/** Vlastný cvik uložený v databáze. */
export interface CustomExercise extends Omit<Exercise, 'custom'> {
  createdAt: string;
  updatedAt: string;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  note: string;
  /** Cviky s rovnakým ID tvoria superset. */
  supersetId?: string | null;
}

export interface Routine {
  id: string;
  name: string;
  note: string;
  exercises: RoutineExercise[];
  /** Ukážková rutina pribalená k aplikácii; dá sa odstrániť. */
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rir: number | null;
  done: boolean;
  completedAt: string | null;
  note?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  /** Názov v čase tréningu, aby história prežila zmazanie vlastného cviku. */
  exerciseName: string;
  note: string;
  sets: WorkoutSet[];
  /** Cviky s rovnakým ID za sebou tvoria superset. */
  supersetId?: string | null;
}

export interface WorkoutSession {
  id: string;
  routineId: string | null;
  name: string;
  note: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  pausedAt: string | null;
  /** Súčet už ukončených pozastavení v ms. */
  pausedMs: number;
  /** Koniec prebiehajúcej prestávky. */
  restEndsAt: string | null;
  /** Čistá dĺžka tréningu v sekundách; nastaví sa po ukončení. */
  durationSec: number | null;
  /** Posledná zmena uloženého tréningu (kvôli zlučovaniu záloh). */
  updatedAt: string;
  exercises: WorkoutExercise[];
}

/** Telesné miery; každé pole je voliteľné. Dátum je YYYY-MM-DD (miestny). */
export interface BodyEntry {
  id: string;
  date: string;
  weight: number | null;
  bodyFat: number | null;
  waist: number | null;
  chest: number | null;
  arm: number | null;
  thigh: number | null;
  note: string;
  updatedAt: string;
}

/** Záznam o zmazaní, aby sa zmazanie prenislo pri zlučovaní záloh. */
export interface Tombstone {
  id: string;
  kind: 'routine' | 'session' | 'customExercise' | 'bodyEntry';
  deletedAt: string;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  kind: RecordKind;
  value: number;
  weight: number;
  reps: number;
  /** Predchádzajúci rekord; null = prvý zaznamenaný výkon (základ, nie prekonanie). */
  previous: number | null;
  sessionId: string;
  achievedAt: string;
}

export interface AppSettings {
  id: 'app';
  theme: Theme;
  restSeconds: number;
  showEffort: boolean;
  effortMode: EffortMode;
  hiddenExerciseIds: string[];
  samplesSeeded: boolean;
  /** Týždenný plán: index 0 = pondelok … 6 = nedeľa, hodnota = ID rutiny. */
  weeklyPlan: (string | null)[];
  restSound: boolean;
  barWeight: number;
  plates: number[];
  lastBackupAt: string | null;
  /** O koľko kg navrhnúť zvýšenie váhy po zvládnutí hornej hranice opakovaní. */
  progressionStep: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  theme: 'dark',
  restSeconds: 120,
  showEffort: false,
  effortMode: 'rpe',
  hiddenExerciseIds: [],
  samplesSeeded: false,
  weeklyPlan: [null, null, null, null, null, null, null],
  restSound: true,
  barWeight: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  lastBackupAt: null,
  progressionStep: 2.5,
};

/** Polia pridané vo verzii 2 – používajú sa pri migrácii starších dát. */
export const V2_SETTINGS_DEFAULTS = {
  weeklyPlan: DEFAULT_SETTINGS.weeklyPlan,
  restSound: DEFAULT_SETTINGS.restSound,
  barWeight: DEFAULT_SETTINGS.barWeight,
  plates: DEFAULT_SETTINGS.plates,
  lastBackupAt: DEFAULT_SETTINGS.lastBackupAt,
  progressionStep: DEFAULT_SETTINGS.progressionStep,
};
