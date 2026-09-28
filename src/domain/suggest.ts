import { countedSets } from './calc';
import type { WorkoutSet } from './types';

export interface Suggestion {
  weight: number;
  reps: number;
  reason: string;
}

export const REP_RANGE = { min: 8, max: 12 } as const;

/**
 * Návrh pracovnej váhy z minulého tréningu (dvojitá progresia, rozsah 8–12 opakovaní):
 *  - ak najťažšia séria dosiahla 12 opakovaní → rovnaké opakovania na vyššej váhe (+krok),
 *  - inak rovnaká váha a o opakovanie viac.
 * Je to iba odporúčanie – nič sa nevyplní bez ťuknutia.
 */
export function suggestNext(lastSets: WorkoutSet[], step: number): Suggestion | null {
  const work = countedSets(lastSets);
  if (work.length === 0) return null;
  const top = work.reduce((a, s) => {
    const aw = a.weight ?? 0;
    const sw = s.weight ?? 0;
    return sw > aw || (sw === aw && (s.reps ?? 0) > (a.reps ?? 0)) ? s : a;
  });
  const weight = top.weight ?? 0;
  const reps = top.reps ?? 0;
  if (reps >= REP_RANGE.max && weight > 0) {
    return {
      weight: Math.round((weight + step) * 100) / 100,
      reps: REP_RANGE.min,
      reason: `Minule ${reps} opakovaní – pridaj váhu`,
    };
  }
  return { weight, reps: reps + 1, reason: 'Skús o opakovanie viac ako minule' };
}
