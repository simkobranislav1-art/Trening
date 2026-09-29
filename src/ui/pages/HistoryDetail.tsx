import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteFinishedSession, updateFinishedSession } from '../../db/repo';
import { db } from '../../db/db';
import { doneSetCount, exerciseVolume, workoutVolume } from '../../domain/calc';
import { fmtDate, fmtDuration, fmtNumber, fmtTime, fmtVolume } from '../../domain/format';
import type { WorkoutSession } from '../../domain/types';
import { sessionFromPast } from '../../domain/workout';
import { Button, EmptyState, SectionTitle, Spinner, Tag } from '../components/basic';
import { ExerciseAvatar } from '../components/ExerciseImages';
import { PencilIcon } from '../components/Icons';
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
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted"
            onClick={() => {
              setNameDraft(s.name);
              setRenameOpen(true);
            }}
          >
            <PencilIcon />
          </button>
        }
      />
      <div className="px-4 pb-8">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Trvanie', fmtDuration(s.durationSec ?? 0)],
            ['Série', String(doneSetCount(s.exercises))],
            ['Objem', fmtVolume(workoutVolume(s.exercises))],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-surface px-3 py-3">
              <p className="text-[12px] font-medium text-muted">{label}</p>
              <p className="t-num mt-1.5 whitespace-nowrap text-[20px]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-8">
          {s.exercises.map((e) => {
            const exPrs = prs.filter((r) => r.exerciseId === e.exerciseId);
            let n = 0;
            return (
              <section key={e.id} aria-label={lib.nameOf(e.exerciseId, e.exerciseName)}>
                <Link to={`/cviky/${encodeURIComponent(e.exerciseId)}`} className="flex items-center gap-3">
                  <ExerciseAvatar id={e.exerciseId} count={lib.byId(e.exerciseId)?.images ?? 0} />
                  <span className="min-w-0 flex-1 text-[20px] leading-tight text-accent-ink">{lib.nameOf(e.exerciseId, e.exerciseName)}</span>
                  {exPrs.length > 0 && <Tag tone="good">Rekord</Tag>}
                </Link>
                {e.note && <p className="mt-2 text-[16px] text-muted">{e.note}</p>}
                <div className="t-label -mx-4 mt-3 grid grid-cols-[64px_1fr] px-4 pb-2">
                  <span>Séria</span>
                  <span>Výkon</span>
                </div>
                <ul className="-mx-4">
                  {e.sets.map((set, i) => {
                    if (set.type !== 'warmup') n += 1;
                    const label = set.type === 'warmup' ? 'Z' : set.type === 'drop' ? 'D' : String(n);
                    const eff = effort && set[effort] != null ? ` · ${effort.toUpperCase()} ${fmtNumber(set[effort]!)}` : '';
                    return (
                      <li key={set.id} className={`grid min-h-[46px] grid-cols-[64px_1fr] items-center px-4 text-[18px] ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                        <span className={set.type === 'warmup' ? 'text-warn' : set.type === 'drop' ? 'text-accent-ink' : ''}>{label}</span>
                        <span className="t-num">
                          {fmtNumber(set.weight ?? 0)} kg × {set.reps ?? 0}
                          <span className="text-[15px] text-muted">{eff}</span>
                          {set.note && <span className="ml-2 text-[14px] text-muted">„{set.note}“</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[14px] text-muted">Objem cviku: {fmtVolume(exerciseVolume(e))}</p>
              </section>
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
