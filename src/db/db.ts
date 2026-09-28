import Dexie, { type Table } from 'dexie';
import {
  V2_SETTINGS_DEFAULTS,
  type AppSettings,
  type BodyEntry,
  type CustomExercise,
  type PersonalRecord,
  type Routine,
  type Tombstone,
  type WorkoutSession,
} from '../domain/types';

/**
 * Lokálna databáza (IndexedDB).
 *
 * MIGRÁCIE: schému nikdy neprepisuj – pridaj ďalší `this.version(n+1).stores({...})`
 * (uvádzaj iba zmenené tabuľky) a prípadne `.upgrade(tx => ...)` na prevod existujúcich
 * záznamov. Dexie tak zachová všetky uložené tréningy. Zároveň zvýš BACKUP_VERSION
 * v domain/backup.ts a doplň `migrateBackup`.
 */
export class FitnessDB extends Dexie {
  settings!: Table<AppSettings, string>;
  customExercises!: Table<CustomExercise, string>;
  routines!: Table<Routine, string>;
  sessions!: Table<WorkoutSession, string>;
  personalRecords!: Table<PersonalRecord, string>;
  bodyEntries!: Table<BodyEntry, string>;
  tombstones!: Table<Tombstone, string>;

  constructor(name = 'fitness-pwa') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      customExercises: 'id, name',
      routines: 'id, createdAt',
      sessions: 'id, status, startedAt',
      personalRecords: 'id, exerciseId, sessionId, achievedAt',
    });
    // v2: telesné miery, záznamy o zmazaní (synchronizácia), updatedAt tréningov, nové nastavenia.
    this.version(2)
      .stores({ bodyEntries: 'id, date', tombstones: 'id, kind' })
      .upgrade(async (tx) => {
        await tx
          .table('sessions')
          .toCollection()
          .modify((s: WorkoutSession) => {
            s.updatedAt ??= s.endedAt ?? s.startedAt;
          });
        await tx
          .table('settings')
          .toCollection()
          .modify((s: Record<string, unknown>) => {
            for (const [k, v] of Object.entries(V2_SETTINGS_DEFAULTS)) s[k] ??= v;
          });
      });
  }
}

export const db = new FitnessDB();
