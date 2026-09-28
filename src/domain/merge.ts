import type { BackupData } from './backup';
import type { Tombstone } from './types';

export interface MergeStats {
  added: number;
  updated: number;
  removed: number;
}

export interface MergeResult {
  data: BackupData;
  stats: MergeStats;
}

interface Versioned {
  id: string;
  updatedAt: string;
}

/**
 * Zlúči jednu kolekciu podľa ID: novší `updatedAt` vyhráva (pri zhode ostáva lokálna verzia).
 * Záznam sa odstráni, ak existuje novší záznam o zmazaní.
 */
function mergeCollection<T extends Versioned>(
  local: T[],
  incoming: T[],
  tombs: Map<string, Tombstone>,
  stats: MergeStats,
): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  for (const inc of incoming) {
    const cur = byId.get(inc.id);
    if (!cur) {
      byId.set(inc.id, inc);
      stats.added++;
    } else if (inc.updatedAt > cur.updatedAt) {
      byId.set(inc.id, inc);
      stats.updated++;
    }
  }
  const out: T[] = [];
  for (const item of byId.values()) {
    const t = tombs.get(item.id);
    if (t && t.deletedAt >= item.updatedAt) {
      if (local.some((l) => l.id === item.id)) stats.removed++;
      else stats.added--;
      continue;
    }
    out.push(item);
  }
  return out;
}

/**
 * Synchronizácia cez súbor: zlúči zálohu z iného zariadenia do lokálnych dát bez straty.
 *  - nastavenia a rozpracovaný tréning ostávajú lokálne,
 *  - nedokončené tréningy z iného zariadenia sa neprenášajú,
 *  - zmazania sa prenášajú cez záznamy `tombstones`.
 * Osobné rekordy sa po zlúčení prepočítajú z histórie (rieši repozitár).
 */
export function mergeBackups(local: BackupData, incoming: BackupData): MergeResult {
  const tombs = new Map<string, Tombstone>();
  for (const t of [...local.tombstones, ...incoming.tombstones]) {
    const cur = tombs.get(t.id);
    if (!cur || t.deletedAt > cur.deletedAt) tombs.set(t.id, t);
  }
  const stats: MergeStats = { added: 0, updated: 0, removed: 0 };
  const localIds = new Set(local.sessions.map((s) => s.id));
  const incomingSessions = incoming.sessions.filter((s) => s.status === 'finished' || localIds.has(s.id));
  const data: BackupData = {
    settings: local.settings,
    customExercises: mergeCollection(local.customExercises, incoming.customExercises, tombs, stats),
    routines: mergeCollection(local.routines, incoming.routines, tombs, stats),
    sessions: mergeCollection(local.sessions, incomingSessions, tombs, stats),
    bodyEntries: mergeCollection(local.bodyEntries, incoming.bodyEntries, tombs, stats),
    personalRecords: local.personalRecords,
    tombstones: [...tombs.values()],
  };
  return { data, stats };
}
