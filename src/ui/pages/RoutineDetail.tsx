import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { fmtNumber, fmtSets } from '../../domain/format';
import { buildHistoryIndex } from '../../domain/stats';
import type { Routine } from '../../domain/types';
import { sessionFromRoutine } from '../../domain/workout';
import { Button, EmptyState, SectionTitle, Spinner, Tag } from '../components/basic';
import { ExerciseAvatar } from '../components/ExerciseImages';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions, useLibrary } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

/** Náhľad rutiny: cviky s kruhovou fotkou, pruhované riadky sérií a minulý výkon. */
export function RoutineDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const lib = useLibrary();
  const sessions = useFinishedSessions();
  const { session, start } = useWorkout();
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);
  const history = useMemo(() => buildHistoryIndex(sessions ?? []), [sessions]);

  useEffect(() => {
    db.routines.get(id).then((r) => setRoutine(r ?? null));
  }, [id]);

  if (routine === undefined || !lib || !sessions) return <Spinner />;
  if (routine === null) {
    return (
      <>
        <PageHeader title="Rutina" back="/trening" />
        <div className="px-4">
          <EmptyState title="Rutina sa nenašla" action={<Link to="/trening"><Button>Späť na tréning</Button></Link>} />
        </div>
      </>
    );
  }

  const totalSets = routine.exercises.reduce((a, e) => a + e.sets, 0);

  return (
    <>
      <PageHeader title="Rutina" back="/trening" />
      <div className="px-4 pb-8">
        <h2 className="flex flex-wrap items-center gap-2 text-[26px] font-medium leading-tight tracking-[-0.02em]">
          {routine.name}
          {routine.isSample && <Tag>Ukážka</Tag>}
        </h2>
        <p className="mt-1 text-[16px] text-muted">
          {routine.exercises.length} cvikov · {fmtSets(totalSets)}
        </p>
        {routine.note && <p className="mt-2 text-[16px] text-muted">{routine.note}</p>}

        <Button
          variant="primary"
          block
          className="mt-4"
          disabled={!!session || routine.exercises.length === 0}
          onClick={async () => {
            await start(sessionFromRoutine(routine));
            nav('/trening');
          }}
        >
          Spustiť rutinu
        </Button>
        {session && <p className="mt-2 text-center text-[14px] text-muted">Najprv ukonči prebiehajúci tréning.</p>}

        <SectionTitle
          action={
            <Link to={`/rutiny/${routine.id}`} className="press text-[17px] text-accent-ink">
              Upraviť rutinu
            </Link>
          }
        >
          <span className="text-[16px] font-normal text-muted">Cviky</span>
        </SectionTitle>

        {routine.exercises.length === 0 ? (
          <EmptyState title="Rutina je prázdna" hint="Pridaj cviky v úprave rutiny." />
        ) : (
          <div className="flex flex-col gap-8">
            {routine.exercises.map((re) => {
              const ex = lib.byId(re.exerciseId);
              const lastSets = (history.get(re.exerciseId)?.[0]?.sets ?? []).filter((s) => s.done && s.type !== 'warmup');
              return (
                <section key={re.id} aria-label={lib.nameOf(re.exerciseId, re.exerciseName)} className={re.supersetId ? 'border-l-2 border-accent pl-3' : ''}>
                  <Link to={`/cviky/${encodeURIComponent(re.exerciseId)}`} className="flex items-center gap-3">
                    <ExerciseAvatar id={re.exerciseId} count={ex?.images ?? 0} />
                    <span className="min-w-0 flex-1 text-[20px] leading-tight text-accent-ink">{lib.nameOf(re.exerciseId, re.exerciseName)}</span>
                  </Link>
                  {re.note && <p className="mt-2 text-[16px] text-muted">{re.note}</p>}
                  <div className="t-label -mx-4 mt-3 grid grid-cols-[64px_1fr] px-4 pb-2">
                    <span>Séria</span>
                    <span>Minule</span>
                  </div>
                  <ul className="-mx-4">
                    {Array.from({ length: re.sets }, (_, i) => {
                      const prev = lastSets[i];
                      return (
                        <li key={i} className={`grid min-h-[46px] grid-cols-[64px_1fr] items-center px-4 text-[18px] ${i % 2 === 1 ? 'bg-surface' : ''}`}>
                          <span>{i + 1}</span>
                          <span className={`t-num ${prev ? '' : 'text-faint'}`}>{prev ? `${fmtNumber(prev.weight ?? 0)} kg × ${prev.reps}` : '–'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
