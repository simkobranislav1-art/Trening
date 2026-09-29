import { useState } from 'react';
import { deleteBodyEntry, saveBodyEntry } from '../../db/repo';
import { localDayKey } from '../../domain/calendar';
import { fmtNumber, uid } from '../../domain/format';
import type { BodyEntry } from '../../domain/types';
import { Button, Card, Chip, EmptyState, ErrorNote, Field, SectionTitle, Spinner } from '../components/basic';
import { LineChart } from '../components/LineChart';
import { NumberField } from '../components/NumberField';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog, Sheet } from '../components/Sheet';
import { useBodyEntries } from '../hooks/data';

type Metric = 'weight' | 'bodyFat' | 'waist' | 'chest' | 'arm' | 'thigh';

const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'weight', label: 'Váha', unit: 'kg' },
  { key: 'bodyFat', label: 'Telesný tuk', unit: '%' },
  { key: 'waist', label: 'Pás', unit: 'cm' },
  { key: 'chest', label: 'Hruď', unit: 'cm' },
  { key: 'arm', label: 'Paža', unit: 'cm' },
  { key: 'thigh', label: 'Stehno', unit: 'cm' },
];

const blank = (): BodyEntry => ({
  id: uid(),
  date: localDayKey(new Date()),
  weight: null,
  bodyFat: null,
  waist: null,
  chest: null,
  arm: null,
  thigh: null,
  note: '',
  updatedAt: new Date().toISOString(),
});

export function BodyPage() {
  const entries = useBodyEntries();
  const [metric, setMetric] = useState<Metric>('weight');
  const [edit, setEdit] = useState<BodyEntry | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  if (!entries) {
    return (
      <>
        <PageHeader title="Telo" back="/historia/statistiky" />
        <Spinner />
      </>
    );
  }

  const m = METRICS.find((x) => x.key === metric)!;
  const points = entries
    .filter((e) => e[metric] !== null)
    .map((e) => ({ date: e.date + 'T12:00:00', value: e[metric] as number }))
    .reverse();
  const latest = entries.find((e) => e[metric] !== null);
  const first = points[0];
  const change = latest && first && points.length > 1 ? (latest[metric] as number) - first.value : null;

  const open = (e: BodyEntry, fresh: boolean) => {
    setError('');
    setIsNew(fresh);
    setEdit(e);
  };
  const save = async () => {
    if (!edit) return;
    if (METRICS.every((x) => edit[x.key] === null)) return setError('Zadaj aspoň jednu hodnotu.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(edit.date)) return setError('Zadaj platný dátum.');
    await saveBodyEntry(edit);
    setEdit(null);
  };

  return (
    <>
      <PageHeader
        title="Telo"
        back="/historia/statistiky"
        action={
          <Button variant="primary" small onClick={() => open(blank(), true)}>
            + Záznam
          </Button>
        }
      />
      <div className="px-4 pb-8">
        {entries.length === 0 ? (
          <EmptyState
            title="Zatiaľ žiadne záznamy"
            hint="Zapíš si váhu alebo obvody a sleduj vývoj v čase."
            action={<Button variant="primary" onClick={() => open(blank(), true)}>Pridať záznam</Button>}
          />
        ) : (
          <>
            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Sledovaná hodnota">
              {METRICS.map((x) => (
                <Chip key={x.key} active={metric === x.key} onClick={() => setMetric(x.key)}>
                  {x.label}
                </Chip>
              ))}
            </div>
            <Card>
              <div className="mb-2 flex items-end justify-between">
                <p className="tnum text-3xl font-bold">{latest ? `${fmtNumber(latest[metric] as number)} ${m.unit}` : '–'}</p>
                {change !== null && (
                  <p className={`t-num text-[16px] ${change === 0 ? 'text-muted' : change < 0 ? 'text-good' : 'text-warn'}`}>
                    {change > 0 ? '+' : ''}
                    {fmtNumber(Math.round(change * 10) / 10)} {m.unit}
                  </p>
                )}
              </div>
              <LineChart points={points} unit={m.unit} caption={`${m.label} v čase`} />
            </Card>

            <SectionTitle>Záznamy</SectionTitle>
            <div className="flex flex-col gap-2">
              {entries.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => open(e, false)}
                  className="rounded-2xl bg-surface px-4 py-3 text-left"
                  aria-label={`Upraviť záznam z ${e.date}`}
                >
                  <p className="font-semibold">{new Date(e.date + 'T12:00:00').toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="tnum text-sm text-muted">
                    {METRICS.filter((x) => e[x.key] !== null)
                      .map((x) => `${x.label} ${fmtNumber(e[x.key] as number)} ${x.unit}`)
                      .join(' · ')}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={isNew ? 'Nový záznam' : 'Upraviť záznam'}>
        {edit && (
          <div className="flex flex-col gap-4">
            {error && <ErrorNote>{error}</ErrorNote>}
            <Field label="Dátum">
              <input type="date" className="field" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              {METRICS.map((x) => (
                <label key={x.key} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-muted">
                    {x.label} ({x.unit})
                  </span>
                  <NumberField
                    decimal
                    label={`${x.label} v ${x.unit}`}
                    value={edit[x.key]}
                    max={999}
                    onChange={(v) => setEdit({ ...edit, [x.key]: v })}
                    className="h-14 w-full text-xl"
                  />
                </label>
              ))}
            </div>
            <Field label="Poznámka">
              <input className="field" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
            </Field>
            <Button variant="primary" block onClick={save}>
              Uložiť
            </Button>
            {!isNew && (
              <Button variant="danger" block onClick={() => setConfirmDel(true)}>
                Odstrániť záznam
              </Button>
            )}
          </div>
        )}
      </Sheet>
      <ConfirmDialog
        open={confirmDel}
        danger
        title="Odstrániť záznam?"
        message="Záznam sa natrvalo odstráni."
        confirmLabel="Odstrániť"
        onCancel={() => setConfirmDel(false)}
        onConfirm={async () => {
          if (edit) await deleteBodyEntry(edit.id);
          setConfirmDel(false);
          setEdit(null);
        }}
      />
    </>
  );
}
