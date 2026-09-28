export interface PlateCount {
  plate: number;
  count: number;
}

export interface PlateResult {
  perSide: PlateCount[];
  /** Skutočne dosiahnuteľná váha s dostupnými kotúčmi. */
  achieved: number;
  /** Koľko z cieľa sa nepodarilo poskladať (kg, celkovo). */
  missing: number;
}

/** Rozloží cieľovú váhu na kotúče na jednu stranu tyče (hladné priraďovanie od najťažšieho). */
export function plateBreakdown(target: number, bar: number, plates: number[]): PlateResult | null {
  if (!(target >= bar) || !(bar >= 0)) return null;
  let side = (target - bar) / 2;
  const perSide: PlateCount[] = [];
  const sorted = [...new Set(plates)].filter((p) => p > 0).sort((a, b) => b - a);
  for (const plate of sorted) {
    const count = Math.floor(Math.round((side / plate) * 1e6) / 1e6);
    if (count > 0) {
      perSide.push({ plate, count });
      side = Math.round((side - count * plate) * 1e6) / 1e6;
    }
  }
  const used = perSide.reduce((a, p) => a + p.plate * p.count, 0);
  const achieved = Math.round((bar + used * 2) * 100) / 100;
  return { perSide, achieved, missing: Math.round((target - achieved) * 100) / 100 };
}
