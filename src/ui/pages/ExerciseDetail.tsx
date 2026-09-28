import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateSettings } from '../../db/repo';
import { estimate1RM } from '../../domain/calc';
import { categoryLabel, equipmentLabel, muscleLabel } from '../../domain/exercises';
import { fmtDate, fmtKg, fmtNumber } from '../../domain/format';
import { buildHistoryIndex, currentRecords, exerciseStats, progressSeries } from '../../domain/stats';
import type { RecordKind, WorkoutSet } from '../../domain/types';
import { Button, Card, EmptyState, SectionTitle, Spinner, Tag } from '../components/basic';
import { ExerciseImages } from '../components/ExerciseImages';
import { LineChart } from '../components/LineChart';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions, useLibrary, useRecords, useSettings } from '../hooks/data';

const RECORD_LABEL: Record<RecordKind, string> = {
  weight: 'Najvyššia váha',
  e1rm: 'Odhadované 1RM',
  volume: 'Najväčší objem série',
};

const setLine = (s: WorkoutSet) =>
  `${s.weight ? fmtNumber(s.weight) : '0'} kg × ${s.reps ?? 0}${s.type === 'warmup' ? ' (zahriatie)' : s.type === 'drop' ? ' (drop)' : ''}`;

export function ExerciseDetail() {
  const { id = '' } = useParams();
  const lib = useLibrary();
  const sessions = useFinishedSessions();
  const records = useRecords();
  const settings = useSettings();

  const entries = useMemo(() => buildHistoryIndex(sessions ?? []).get(id) ?? [], [sessions, id]);

  if (!lib || !sessions || !records || !settings) return <Spinner />;
  const ex = lib.byId(id);
  // Cvik už nemusí existovať (odstránený vlastný) – história sa aj tak dá zobraziť.
  const fallbackName = sessions.flatMap((s) => s.exercises).find((e) => e.exerciseId === id)?.exerciseName;
  if (!ex && !fallbackName) {
    return (
      <>
        <PageHeader title="Cvik" back="/cviky" />
        <div className="px-4">
          <EmptyState title="Cvik sa nenašiel" action={<Link to="/cviky"><Button>Späť na cviky</Button></Link>} />
        </div>
      </>
    );
  }

  const stats = exerciseStats(entries);
  const recs = currentRecords(records, id);
  const isHidden = lib.hidden.has(id);
  const toggleHidden = () =>
    updateSettings({
      hiddenExerciseIds: isHidden ? settings.hiddenExerciseIds.filter((x) => x !== id) : [...settings.hiddenExerciseIds, id],
    });

  return (
    <>
      <PageHeader
        title={ex?.name ?? fallbackName ?? 'Cvik'}
        back="/cviky"
        action={
          ex?.custom ? (
            <Link to={`/cviky/${encodeURIComponent(id)}/upravit`}>
              <Button small tabIndex={-1}>Upraviť</Button>
            </Link>
          ) : undefined
        }
      />
      <div className="px-4 pb-8">
        {ex && !!ex.images && <ExerciseImages id={ex.id} count={ex.images} name={ex.name} />}
        {ex && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Tag tone="accent">{muscleLabel(ex.primaryMuscle)}</Tag>
            <Tag>{equipmentLabel(ex.equipment)}</Tag>
            <Tag>{categoryLabel(ex.category)}</Tag>
            {ex.unilateral && <Tag>Jednostranný</Tag>}
            {ex.custom && <Tag tone="good">Vlastný</Tag>}
            {isHidden && <Tag>Skrytý</Tag>}
          </div>
        )}
        {ex && ex.secondaryMuscles.length > 0 && (
          <p className="mb-2 text-muted">Ďalšie svaly: {ex.secondaryMuscles.map(muscleLabel).join(', ')}</p>
        )}

        <SectionTitle>Štatistiky</SectionTitle>
        {entries.length === 0 ? (
          <EmptyState title="Zatiaľ bez histórie" hint="Štatistiky a graf sa zobrazia po prvom dokončenom tréningu s týmto cvikom." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Posledný výkon" value={stats.last ? lastSummary(stats.last.sets) : '–'} />
              <Stat label="Najvyššia váha" value={fmtKg(stats.maxWeight)} />
              <Stat label="Najlepšie opakovania" value={String(stats.bestReps)} />
              <Stat label="Odhadované 1RM" value={fmtKg(Math.round(stats.best1RM * 10) / 10)} />
            </div>

            <SectionTitle>Osobné rekordy</SectionTitle>
            <Card className="divide-y divide-line !p-0">
              {recs.length === 0 && <p className="p-4 text-muted">Zatiaľ žiadne.</p>}
              {recs.map((r) => (
                <div key={r.kind} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{RECORD_LABEL[r.kind]}</p>
                    <p className="text-sm text-muted">
                      {fmtDate(r.achievedAt)} · {fmtNumber(r.weight)} kg × {r.reps}
                    </p>
                  </div>
                  <p className="tnum shrink-0 whitespace-nowrap text-xl font-bold">{fmtNumber(Math.round(r.value * 10) / 10)}&nbsp;kg</p>
                </div>
              ))}
            </Card>

            <SectionTitle>Progres</SectionTitle>
            <Card>
              <LineChart points={progressSeries(entries)} />
            </Card>

            <SectionTitle>História sérií</SectionTitle>
            <div className="flex flex-col gap-3">
              {entries.map((en) => (
                <Link key={en.sessionId} to={`/historia/${en.sessionId}`}>
                  <Card>
                    <p className="mb-2 font-semibold">{fmtDate(en.date)}</p>
                    <ul className="tnum space-y-1 text-muted">
                      {en.sets.map((s, i) => (
                        <li key={s.id}>
                          {i + 1}. {setLine(s)} {s.done && s.reps ? `· 1RM ${fmtNumber(Math.round(estimate1RM(s.weight ?? 0, s.reps) * 10) / 10)}` : ''}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}

        {ex && ex.instructions.length > 0 && (
          <>
            <SectionTitle>Návod</SectionTitle>
            <Card>
              <ol className="list-decimal space-y-3 pl-5 leading-relaxed">
                {ex.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {!ex.custom && <p className="mt-4 text-xs text-muted">Návod je v angličtine (zdroj: Free Exercise DB).</p>}
            </Card>
          </>
        )}

        {ex && (
          <div className="mt-6">
            <Button block onClick={() => void toggleHidden()}>
              {isHidden ? 'Zobraziť cvik v knižnici' : 'Skryť cvik z knižnice'}
            </Button>
            {!isHidden && <p className="mt-2 text-center text-sm text-muted">Skrytý cvik sa nebude ponúkať pri pridávaní do tréningu.</p>}
          </div>
        )}
      </div>
    </>
  );
}

function lastSummary(sets: WorkoutSet[]): string {
  const work = sets.filter((s) => s.done && s.type !== 'warmup');
  const top = work.reduce<WorkoutSet | null>((a, s) => (!a || (s.weight ?? 0) > (a.weight ?? 0) ? s : a), null);
  return top ? `${fmtNumber(top.weight ?? 0)} × ${top.reps}` : '–';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="tnum mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
