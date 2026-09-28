import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteFinishedSession, updateFinishedSession } from '../../db/repo';
import { db } from '../../db/db';
import { doneSetCount, exerciseVolume, workoutVolume } from '../../domain/calc';
import { fmtDate, fmtDuration, fmtNumber, fmtTime, fmtVolume } from '../../domain/format';
import type { WorkoutSession } from '../../domain/types';
import { sessionFromPast } from '../../domain/workout';
import { Button, Card, EmptyState, SectionTitle, Spinner, Tag } from '../components/basic';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog, Sheet } from '../components/Sheet';
import { useLibrary, useRecords, useSettings } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

export function HistoryDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { session: active, start } = useWorkout();
  const records = useRecords();
  const settings = useSettings();
  const lib = useLibrary();
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [s, setS] = useState<WorkoutSession | null | undefined>(undefined);
  const [note, setNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    db.sessions.get(id).then((found) => {
      setS(found && found.status === 'finished' ? found : null);
      setNote(found?.note ?? '');
    });
  }, [id]);

  if (s === undefined || !records || !settings || !lib) return <Spinner />;
  if (s === null) {
    return (
      <>
        <PageHeader title="Tréning" back="/historia" />
        <div className="px-4">
          <EmptyState title="Tréning sa nenašiel" action={<Link to="/historia"><Button>Späť na históriu</Button></Link>} />
        </div>
      </>
    );
  }

  const prs = records.filter((r) => r.sessionId === s.id && r.previous !== null);
  const effort = settings.showEffort ? settings.effortMode : null;

  return (
    <>
      <PageHeader
        title={s.name || 'Tréning'}
        subtitle={`${fmtDate(s.startedAt)} · ${fmtTime(s.startedAt)}`}
        back="/historia"
        titleAction={
          <button
            type="button"
            aria-label="Premenovať tréning"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-muted"
            onClick={() => {
              setNameDraft(s.name);
              setRenameOpen(true);
            }}
          >
            ✎
          </button>
        }
      />
      <div className="px-4 pb-8">
        <div className="grid grid-cols-3 gap-3">
          <Card className="!p-3">
            <p className="text-xs text-muted">Trvanie</p>
            <p className="tnum text-lg font-bold">{fmtDuration(s.durationSec ?? 0)}</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xs text-muted">Série</p>
            <p className="tnum text-lg font-bold">{doneSetCount(s.exercises)}</p>
          </Card>
          <Card className="!p-3">
            <p className="text-xs text-muted">Objem</p>
            <p className="tnum text-lg font-bold">{fmtVolume(workoutVolume(s.exercises))}</p>
          </Card>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {s.exercises.map((e) => {
            const exPrs = prs.filter((r) => r.exerciseId === e.exerciseId);
            let n = 0;
            return (
              <Card key={e.id}>
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/cviky/${encodeURIComponent(e.exerciseId)}`} className="text-lg font-bold text-accent">
                    {lib.nameOf(e.exerciseId, e.exerciseName)}
                  </Link>
                  {exPrs.length > 0 && <Tag tone="good">Rekord</Tag>}
                </div>
                {e.note && <p className="mt-1 text-sm text-muted">{e.note}</p>}
                <ul className="tnum mt-3 space-y-1.5">
                  {e.sets.map((set) => {
                    if (set.type !== 'warmup') n += 1;
                    const label = set.type === 'warmup' ? 'Z' : set.type === 'drop' ? 'D' : String(n);
                    const eff = effort && set[effort] != null ? ` · ${effort.toUpperCase()} ${fmtNumber(set[effort]!)}` : '';
                    return (
                      <li key={set.id} className="flex items-center gap-3">
                        <span className="w-7 text-center font-bold text-muted">{label}</span>
                        <span className="text-lg font-semibold">
                          {fmtNumber(set.weight ?? 0)} kg × {set.reps ?? 0}
                        </span>
                        <span className="text-sm text-muted">{eff}</span>
                        {set.note && <span className="min-w-0 truncate text-sm text-muted">„{set.note}“</span>}
                      </li>
                    );
                  })}
                </ul>
                <p className="tnum mt-2 text-sm text-muted">Objem cviku: {fmtVolume(exerciseVolume(e))}</p>
              </Card>
            );
          })}
        </div>

        <SectionTitle>Poznámka</SectionTitle>
        <textarea
          className="field min-h-[90px]"
          aria-label="Poznámka k tréningu"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== s.note && updateFinishedSession(s.id, { note }).then(() => setS({ ...s, note }))}
        />

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="primary"
            block
            disabled={!!active}
            onClick={async () => {
              await start(sessionFromPast(s));
              nav('/trening');
            }}
          >
            Zopakovať tréning
          </Button>
          {active && <p className="text-center text-sm text-muted">Najprv ukonči prebiehajúci tréning.</p>}
          <Button variant="danger" block onClick={() => setConfirmDel(true)}>
            Odstrániť tréning
          </Button>
        </div>
      </div>
      <Sheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Názov tréningu">
        <input className="field mb-4" aria-label="Názov tréningu" value={nameDraft} maxLength={60} onChange={(e) => setNameDraft(e.target.value)} autoFocus />
        <Button
          variant="primary"
          block
          onClick={async () => {
            await updateFinishedSession(s.id, { name: nameDraft.trim() });
            setS({ ...s, name: nameDraft.trim() });
            setRenameOpen(false);
          }}
        >
          Uložiť
        </Button>
      </Sheet>
      <ConfirmDialog
        open={confirmDel}
        danger
        title="Odstrániť tréning?"
        message="Tréning sa natrvalo odstráni z histórie a prepočítajú sa rekordy."
        confirmLabel="Odstrániť"
        onCancel={() => setConfirmDel(false)}
        onConfirm={async () => {
          await deleteFinishedSession(s.id);
          nav('/historia', { replace: true });
        }}
      />
    </>
  );
}
