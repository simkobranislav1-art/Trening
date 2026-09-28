import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../db/db';
import { buildLibrary } from '../../domain/exercises';
import { DEFAULT_SETTINGS, type AppSettings, type Exercise } from '../../domain/types';

/** Nastavenia doplnené o predvolené hodnoty (pre prípad starších záznamov). */
export function useSettings(): AppSettings | undefined {
  const s = useLiveQuery(() => db.settings.get('app'), []);
  return useMemo(() => (s ? { ...DEFAULT_SETTINGS, ...s } : undefined), [s]);
}

export const useRoutines = () => useLiveQuery(() => db.routines.orderBy('createdAt').toArray(), []);

export const useFinishedSessions = () =>
  useLiveQuery(() => db.sessions.where('status').equals('finished').reverse().sortBy('startedAt'), []);

export const useRecords = () => useLiveQuery(() => db.personalRecords.toArray(), []);

export const useBodyEntries = () => useLiveQuery(() => db.bodyEntries.orderBy('date').reverse().toArray(), []);

export const useCustomExercises = () => useLiveQuery(() => db.customExercises.toArray(), []);

export interface Library {
  /** Všetky cviky vrátane skrytých (na vyhľadanie podľa ID a v histórii). */
  all: Exercise[];
  /** Iba viditeľné cviky. */
  visible: Exercise[];
  hidden: Set<string>;
  byId: (id: string) => Exercise | undefined;
  /** Aktuálny názov cviku; ak už neexistuje, použije uložený názov z čias tréningu. */
  nameOf: (id: string, fallback: string) => string;
}

export function useLibrary(): Library | undefined {
  const custom = useCustomExercises();
  const settings = useSettings();
  return useMemo(() => {
    if (!custom || !settings) return undefined;
    const all = buildLibrary(custom);
    const hidden = new Set((settings ?? DEFAULT_SETTINGS).hiddenExerciseIds);
    const map = new Map(all.map((e) => [e.id, e]));
    return {
      all,
      hidden,
      visible: all.filter((e) => !hidden.has(e.id)),
      byId: (id) => map.get(id),
      nameOf: (id, fallback) => map.get(id)?.name ?? fallback,
    };
  }, [custom, settings]);
}

/** Aktuálny čas, obnovovaný každú `ms` milisekúnd. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
