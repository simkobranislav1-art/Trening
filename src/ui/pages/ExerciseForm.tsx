import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { deleteCustomExercise, newCustomExercise, saveCustomExercise } from '../../db/repo';
import { CATEGORY_LABELS, EQUIPMENT_LABELS, MUSCLE_LABELS } from '../../domain/exercises';
import type { CustomExercise } from '../../domain/types';
import { Button, ErrorNote, Field, Spinner, Toggle } from '../components/basic';
import { ConfirmDialog } from '../components/Sheet';
import { PageHeader } from '../components/PageHeader';

export function ExerciseForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ex, setEx] = useState<CustomExercise | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [steps, setSteps] = useState('');

  useEffect(() => {
    if (!id) {
      setEx(newCustomExercise());
      return;
    }
    db.customExercises.get(decodeURIComponent(id)).then((found) => {
      if (!found) return setMissing(true);
      setEx(found);
      setSteps(found.instructions.join('\n'));
    });
  }, [id]);

  if (missing) return <p className="p-6 text-center text-muted">Vlastný cvik sa nenašiel. Vstavané cviky sa upraviť nedajú.</p>;
  if (!ex) return <Spinner />;

  const set = <K extends keyof CustomExercise>(k: K, v: CustomExercise[K]) => setEx({ ...ex, [k]: v });

  const save = async () => {
    if (!ex.name.trim()) return setError('Zadaj názov cviku.');
    try {
      await saveCustomExercise({
        ...ex,
        name: ex.name.trim(),
        secondaryMuscles: ex.secondaryMuscles.filter((m) => m !== ex.primaryMuscle),
        instructions: steps.split('\n').map((l) => l.trim()).filter(Boolean),
      });
      nav(`/cviky/${encodeURIComponent(ex.id)}`, { replace: true });
    } catch {
      setError('Cvik sa nepodarilo uložiť.');
    }
  };

  const toggleSecondary = (m: string) =>
    set('secondaryMuscles', ex.secondaryMuscles.includes(m) ? ex.secondaryMuscles.filter((x) => x !== m) : [...ex.secondaryMuscles, m]);

  return (
    <>
      <PageHeader title={id ? 'Upraviť cvik' : 'Nový cvik'} back />
      <form
        className="flex flex-col gap-4 px-4 pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Názov">
          <input className="field" value={ex.name} onChange={(e) => set('name', e.target.value)} maxLength={80} autoFocus={!id} />
        </Field>
        <Field label="Hlavná svalová partia">
          <select className="field" value={ex.primaryMuscle} onChange={(e) => set('primaryMuscle', e.target.value)}>
            {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-muted">Ďalšie svaly</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MUSCLE_LABELS)
              .filter(([k]) => k !== ex.primaryMuscle)
              .map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={ex.secondaryMuscles.includes(k)}
                  onClick={() => toggleSecondary(k)}
                  className={`min-h-[40px] rounded-full px-4 text-[15px] ${
                    ex.secondaryMuscles.includes(k) ? 'bg-accent text-on-accent' : 'bg-raised'
                  }`}
                >
                  {v}
                </button>
              ))}
          </div>
        </fieldset>
        <Field label="Vybavenie">
          <select className="field" value={ex.equipment} onChange={(e) => set('equipment', e.target.value)}>
            {Object.entries(EQUIPMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kategória">
          <select className="field" value={ex.category} onChange={(e) => set('category', e.target.value)}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Toggle checked={ex.unilateral} onChange={(v) => set('unilateral', v)} label="Jednostranný cvik" hint="Cvičí sa každá strana zvlášť." />
        <Field label="Návod (každý krok na nový riadok)">
          <textarea className="field min-h-[120px]" value={steps} onChange={(e) => setSteps(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" block>
          Uložiť
        </Button>
        {id && (
          <Button variant="danger" block onClick={() => setConfirmDel(true)}>
            Odstrániť cvik
          </Button>
        )}
      </form>
      <ConfirmDialog
        open={confirmDel}
        danger
        title="Odstrániť cvik?"
        message="Cvik zmizne z knižnice. História tréningov sa zachová."
        confirmLabel="Odstrániť"
        onCancel={() => setConfirmDel(false)}
        onConfirm={async () => {
          await deleteCustomExercise(ex.id);
          nav('/cviky', { replace: true });
        }}
      />
    </>
  );
}
