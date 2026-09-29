import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../db/db';
import { muscleLabel } from '../../domain/exercises';
import { fmtSets } from '../../domain/format';
import type { Routine } from '../../domain/types';
import { sessionFromRoutine } from '../../domain/workout';
import { Button, EmptyState, Spinner, Tag } from '../components/basic';
import { PageHeader } from '../components/PageHeader';
import { useLibrary } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

/** Náhľad rutiny: cviky s fotkami, počty sérií a poznámky. */
export function RoutineDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const lib = useLibrary();
  const { session, start } = useWorkout();
  const [routine, setRoutine] = useState<Routine | null | undefined>(undefined);

  useEffect(() => {
    db.routines.get(id).then((r) => setRoutine(r ?? null));
  }, [id]);

  if (routine === undefined || !lib) return <Spinner />;
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
      <PageHeader
        title={routine.name}
        subtitle={`${routine.exercises.length} cvikov · ${fmtSets(totalSets)}`}
        back="/trening"
        action={
          <Link to={`/rutiny/${routine.id}`}>
            <Button small tabIndex={-1}>Upraviť</Button>
          </Link>
        }
      />
      <div className="px-4 pb-8">
        {routine.isSample && (
          <div className="mb-3">
            <Tag>Ukážka</Tag>
          </div>
        )}
        {routine.note && <p className="mb-4 text-muted">{routine.note}</p>}

        {routine.exercises.length === 0 ? (
          <EmptyState title="Rutina je prázdna" hint="Pridaj cviky v úprave rutiny." />
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {routine.exercises.map((re, i) => {
              const ex = lib.byId(re.exerciseId);
              return (
                <li key={re.id}>
                  <Link
                    to={`/cviky/${encodeURIComponent(re.exerciseId)}`}
                    className={`block h-full overflow-hidden rounded-2xl bg-surface ${re.supersetId ? 'ring-2 ring-accent' : ''}`}
                  >
                    {!!ex?.images && (
                      <img
                        src={`${import.meta.env.BASE_URL}exercises/${re.exerciseId}-0.webp`}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-muted">{i + 1}.</p>
                      <p className="font-semibold leading-tight">{lib.nameOf(re.exerciseId, re.exerciseName)}</p>
                      <p className="mt-1 text-sm text-muted">
                        {fmtSets(re.sets)}
                        {ex ? ` · ${muscleLabel(ex.primaryMuscle)}` : ''}
                      </p>
                      {re.supersetId && <p className="mt-1 text-xs font-semibold text-accent-ink">Superset</p>}
                      {re.note && <p className="mt-1 text-sm text-muted">{re.note}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="primary"
            block
            disabled={!!session || routine.exercises.length === 0}
            onClick={async () => {
              await start(sessionFromRoutine(routine));
              nav('/trening');
            }}
          >
            Spustiť tréning
          </Button>
          {session && <p className="text-center text-sm text-muted">Najprv ukonči prebiehajúci tréning.</p>}
        </div>
      </div>
    </>
  );
}
