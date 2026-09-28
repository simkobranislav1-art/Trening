import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { deleteRoutine, saveRoutine } from '../../db/repo';
import { uid } from '../../domain/format';
import type { Routine } from '../../domain/types';
import { moveItem, reorder, sessionFromRoutine, toggleSupersetWithNext } from '../../domain/workout';
import { Button, Card, EmptyState, ErrorNote, Field, Spinner } from '../components/basic';
import { ExerciseThumb } from '../components/ExerciseImages';
import { ExercisePicker } from '../components/ExercisePicker';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/Sheet';
import { ReorderSheet } from '../components/Sortable';
import { useLibrary } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

const blank = (): Routine => {
  const now = new Date().toISOString();
  return { id: uid(), name: '', note: '', exercises: [], isSample: false, createdAt: now, updatedAt: now };
};

export function RoutineEdit() {
  const { id } = useParams();
  const isNew = id === 'nova';
  const nav = useNavigate();
  const { session, start } = useWorkout();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const lib = useLibrary();
  const [reorderOpen, setReorderOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (isNew) return setRoutine(blank());
    db.routines.get(id ?? '').then((r) => (r ? setRoutine(r) : setMissing(true)));
  }, [id, isNew]);

  if (missing) return <p className="p-6 text-center text-muted">Rutina sa nenašla.</p>;
  if (!routine || !lib) return <Spinner />;

  const patch = (p: Partial<Routine>) => setRoutine({ ...routine, ...p });
  const save = async (): Promise<boolean> => {
    if (!routine.name.trim()) {
      setError('Zadaj názov rutiny.');
      return false;
    }
    try {
      await saveRoutine({ ...routine, name: routine.name.trim() });
      return true;
    } catch {
      setError('Rutinu sa nepodarilo uložiť.');
      return false;
    }
  };

  return (
    <>
      <PageHeader title={isNew ? 'Nová rutina' : 'Upraviť rutinu'} back="/trening" />
      <div className="flex flex-col gap-4 px-4 pb-8">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Názov">
          <input className="field" value={routine.name} maxLength={60} onChange={(e) => patch({ name: e.target.value })} autoFocus={isNew} />
        </Field>
        <Field label="Poznámka">
          <textarea className="field min-h-[80px]" value={routine.note} onChange={(e) => patch({ note: e.target.value })} />
        </Field>

        <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted">Cviky</h2>
        {routine.exercises.length === 0 && <EmptyState title="Bez cvikov" hint="Pridaj aspoň jeden cvik." />}
        {routine.exercises.map((re, i) => (
          <Card key={re.id} className={`!p-3 ${re.supersetId ? 'border-l-4 border-accent' : ''}`}>
            <div className="mb-2 flex items-center gap-3 px-1">
              <ExerciseThumb id={re.exerciseId} count={lib.byId(re.exerciseId)?.images ?? 0} />
              <p className="text-lg font-semibold leading-tight">{lib.nameOf(re.exerciseId, re.exerciseName)}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" role="group" aria-label={`Počet sérií, ${lib.nameOf(re.exerciseId, re.exerciseName)}`}>
                <Button
                  small
                  aria-label="Menej sérií"
                  disabled={re.sets <= 1}
                  onClick={() => patch({ exercises: routine.exercises.map((x) => (x.id === re.id ? { ...x, sets: x.sets - 1 } : x)) })}
                >
                  −
                </Button>
                <span className="tnum w-24 text-center font-semibold">{re.sets} sérií</span>
                <Button
                  small
                  aria-label="Viac sérií"
                  disabled={re.sets >= 20}
                  onClick={() => patch({ exercises: routine.exercises.map((x) => (x.id === re.id ? { ...x, sets: x.sets + 1 } : x)) })}
                >
                  +
                </Button>
              </div>
              <div className="flex gap-1">
                <Button small aria-label="Posunúť vyššie" disabled={i === 0} onClick={() => patch({ exercises: moveItem(routine.exercises, i, -1) })}>
                  ↑
                </Button>
                <Button small aria-label="Posunúť nižšie" disabled={i === routine.exercises.length - 1} onClick={() => patch({ exercises: moveItem(routine.exercises, i, 1) })}>
                  ↓
                </Button>
                <Button small variant="danger" aria-label={`Odstrániť ${lib.nameOf(re.exerciseId, re.exerciseName)}`} onClick={() => patch({ exercises: routine.exercises.filter((x) => x.id !== re.id) })}>
                  ✕
                </Button>
              </div>
            </div>
            {i < routine.exercises.length - 1 && (
              <Button
                small
                block
                className="mt-3"
                onClick={() => patch({ exercises: toggleSupersetWithNext(routine.exercises, i) })}
              >
                {re.supersetId && re.supersetId === routine.exercises[i + 1].supersetId
                  ? 'Zrušiť superset s nasledujúcim'
                  : 'Superset s nasledujúcim cvikom'}
              </Button>
            )}
            <input
              className="field mt-3"
              placeholder="Poznámka ku cviku"
              aria-label={`Poznámka, ${lib.nameOf(re.exerciseId, re.exerciseName)}`}
              value={re.note}
              onChange={(e) => patch({ exercises: routine.exercises.map((x) => (x.id === re.id ? { ...x, note: e.target.value } : x)) })}
            />
          </Card>
        ))}
        <div className="flex gap-3">
          <Button block onClick={() => setPicker(true)}>
            + Pridať cvik
          </Button>
          {routine.exercises.length > 1 && (
            <Button block onClick={() => setReorderOpen(true)}>
              Poradie
            </Button>
          )}
        </div>

        <Button
          variant="primary"
          block
          onClick={async () => {
            if (await save()) nav('/trening', { replace: true });
          }}
        >
          Uložiť rutinu
        </Button>
        {!isNew && (
          <>
            <Button
              block
              disabled={!!session}
              onClick={async () => {
                if (!(await save())) return;
                await start(sessionFromRoutine(routine));
                nav('/trening', { replace: true });
              }}
            >
              Uložiť a spustiť tréning
            </Button>
            {session && <p className="text-center text-sm text-muted">Najprv ukonči prebiehajúci tréning.</p>}
            <Button variant="danger" block onClick={() => setConfirmDel(true)}>
              Odstrániť rutinu
            </Button>
          </>
        )}
      </div>

      <ReorderSheet
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        items={routine.exercises.map((e) => ({ id: e.id, label: lib.nameOf(e.exerciseId, e.exerciseName) }))}
        onReorder={(from, to) => patch({ exercises: reorder(routine.exercises, from, to) })}
      />
      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onAdd={(list) =>
          patch({
            exercises: [
              ...routine.exercises,
              ...list.map((e) => ({ id: uid(), exerciseId: e.id, exerciseName: e.name, sets: 3, note: '' })),
            ],
          })
        }
      />
      <ConfirmDialog
        open={confirmDel}
        danger
        title="Odstrániť rutinu?"
        message={`Rutina „${routine.name}“ sa odstráni. Odcvičené tréningy zostanú v histórii.`}
        confirmLabel="Odstrániť"
        onCancel={() => setConfirmDel(false)}
        onConfirm={async () => {
          await deleteRoutine(routine.id);
          nav('/trening', { replace: true });
        }}
      />
    </>
  );
}
