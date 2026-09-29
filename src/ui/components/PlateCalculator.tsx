import { useState } from 'react';
import { updateSettings } from '../../db/repo';
import { fmtNumber } from '../../domain/format';
import { plateBreakdown } from '../../domain/plates';
import type { AppSettings } from '../../domain/types';
import { Button, Chip } from './basic';
import { NumberField } from './NumberField';

const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

/** Kalkulačka kotúčov: koľko kotúčov dať na každú stranu tyče. */
export function PlateCalculator({ settings, initial }: { settings: AppSettings; initial?: number | null }) {
  const [target, setTarget] = useState<number | null>(initial ?? null);
  const result = target === null ? null : plateBreakdown(target, settings.barWeight, settings.plates);

  const togglePlate = (p: number) =>
    updateSettings({
      plates: settings.plates.includes(p) ? settings.plates.filter((x) => x !== p) : [...settings.plates, p].sort((a, b) => b - a),
    });

  return (
    <div>
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <span className="mb-1.5 block text-sm font-medium text-muted">Cieľová váha (kg)</span>
          <NumberField decimal label="Cieľová váha v kg" value={target} onChange={setTarget} placeholder="100" max={999} className="h-14 w-full text-2xl" />
        </label>
        <div className="flex items-center gap-1">
          <Button small aria-label="Zmenšiť váhu o 2,5 kg" onClick={() => setTarget(Math.max(0, (target ?? 0) - 2.5))}>
            −2,5
          </Button>
          <Button small aria-label="Zväčšiť váhu o 2,5 kg" onClick={() => setTarget((target ?? 0) + 2.5)}>
            +2,5
          </Button>
        </div>
      </div>

      <div className="mt-5 min-h-[120px]" aria-live="polite">
        {target === null ? (
          <p className="text-muted">Zadaj cieľovú váhu.</p>
        ) : !result ? (
          <p className="text-danger">Cieľová váha je menšia ako tyč ({fmtNumber(settings.barWeight)} kg).</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-medium text-muted">Na každú stranu (tyč {fmtNumber(settings.barWeight)} kg):</p>
            {result.perSide.length === 0 ? (
              <p className="text-lg font-semibold">Samotná tyč</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {result.perSide.map((p) => (
                  <li key={p.plate} className="rounded-xl bg-accent/15 px-4 py-2 text-lg font-bold text-accent-ink">
                    {p.count} × {fmtNumber(p.plate)} kg
                  </li>
                ))}
              </ul>
            )}
            {result.missing !== 0 && (
              <p className="mt-3 text-warn">
                S dostupnými kotúčmi vyjde {fmtNumber(result.achieved)} kg (chýba {fmtNumber(result.missing)} kg).
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium text-muted">Kotúče, ktoré máš k dispozícii</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dostupné kotúče">
          {ALL_PLATES.map((p) => (
            <Chip key={p} active={settings.plates.includes(p)} onClick={() => togglePlate(p)}>
              {fmtNumber(p)}
            </Chip>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-medium">Váha tyče</span>
          <div className="flex items-center gap-1">
            <Button small aria-label="Ľahšia tyč" disabled={settings.barWeight <= 0} onClick={() => updateSettings({ barWeight: Math.max(0, settings.barWeight - 2.5) })}>
              −
            </Button>
            <span className="tnum w-16 text-center text-lg font-bold">{fmtNumber(settings.barWeight)} kg</span>
            <Button small aria-label="Ťažšia tyč" onClick={() => updateSettings({ barWeight: settings.barWeight + 2.5 })}>
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
