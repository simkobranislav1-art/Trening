import { useMemo, useState } from 'react';
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  equipmentLabel,
  filterExercises,
  muscleLabel,
} from '../../domain/exercises';
import type { Exercise } from '../../domain/types';
import { Chip, EmptyState, Tag } from './basic';
import { ExerciseThumb } from './ExerciseImages';

/** Vyhľadávanie a filtre + zoznam cvikov. Ťuknutie volá `onPick`. */
export function ExerciseBrowser({
  exercises,
  onPick,
  selected,
  hiddenIds,
  emptyHint,
}: {
  exercises: Exercise[];
  onPick: (e: Exercise) => void;
  selected?: Set<string>;
  hiddenIds?: Set<string>;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const shown = useMemo(
    () => filterExercises(exercises, { query, muscle, equipment }),
    [exercises, query, muscle, equipment],
  );
  const muscles = useMemo(() => Object.keys(MUSCLE_LABELS).filter((m) => exercises.some((e) => e.primaryMuscle === m)), [exercises]);
  const equipments = useMemo(
    () => Object.keys(EQUIPMENT_LABELS).filter((q) => exercises.some((e) => e.equipment === q)),
    [exercises],
  );

  return (
    <div>
      <input
        type="search"
        className="field mb-3"
        placeholder="Hľadať cvik"
        aria-label="Hľadať cvik"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div role="group" aria-label="Svalová partia" className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={muscle === null} onClick={() => setMuscle(null)}>
          Všetky svaly
        </Chip>
        {muscles.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
            {muscleLabel(m)}
          </Chip>
        ))}
      </div>
      <div role="group" aria-label="Vybavenie" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={equipment === null} onClick={() => setEquipment(null)}>
          Všetko vybavenie
        </Chip>
        {equipments.map((q) => (
          <Chip key={q} active={equipment === q} onClick={() => setEquipment(equipment === q ? null : q)}>
            {equipmentLabel(q)}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Nič sa nenašlo" hint={emptyHint ?? 'Skús upraviť hľadanie alebo filtre.'} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
          {shown.map((e) => {
            const isSel = selected?.has(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onPick(e)}
                  aria-pressed={selected ? isSel : undefined}
                  className={`flex min-h-[64px] w-full items-center gap-3 px-4 py-2 text-left active:bg-card2 ${
                    isSel ? 'bg-accent/15' : ''
                  }`}
                >
                  <ExerciseThumb id={e.id} count={e.images ?? 0} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {muscleLabel(e.primaryMuscle)} · {equipmentLabel(e.equipment)}
                    </span>
                  </span>
                  {e.custom && <Tag tone="accent">Vlastný</Tag>}
                  {hiddenIds?.has(e.id) && <Tag>Skrytý</Tag>}
                  {isSel && <span className="text-xl text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
