import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updateSettings } from '../../db/repo';
import { doneSetCount, workoutVolume } from '../../domain/calc';
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, localDayKey, monthGrid, plannedRoutineId } from '../../domain/calendar';
import { fmtDay, fmtDuration, fmtMonth, fmtSets, fmtVolume } from '../../domain/format';
import { sessionFromRoutine } from '../../domain/workout';
import { Button, Card, SectionTitle, Spinner } from '../components/basic';
import { HistoryTabs } from '../components/HistoryTabs';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions, useRoutines, useSettings } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

export function CalendarPage() {
  const sessions = useFinishedSessions();
  const routines = useRoutines();
  const settings = useSettings();
  const { session: active, start } = useWorkout();
  const nav = useNavigate();
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(localDayKey(today));

  const byDay = useMemo(() => {
    const m = new Map<string, NonNullable<typeof sessions>>();
    for (const s of sessions ?? []) {
      const k = localDayKey(new Date(s.startedAt));
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [sessions]);

  if (!sessions || !routines || !settings) {
    return (
      <>
        <PageHeader title="História" />
        <HistoryTabs />
        <Spinner />
      </>
    );
  }

  const weeks = monthGrid(cursor.getFullYear(), cursor.getMonth());
  const todayKey = localDayKey(today);
  const routineName = (id: string | null) => routines.find((r) => r.id === id)?.name;
  const selDate = new Date(selected + 'T12:00:00');
  const selPlanId = plannedRoutineId(selDate, settings.weeklyPlan);
  const selPlan = routines.find((r) => r.id === selPlanId);
  const selSessions = byDay.get(selected) ?? [];
  const setPlan = (weekday: number, id: string | null) =>
    updateSettings({ weeklyPlan: settings.weeklyPlan.map((x, i) => (i === weekday ? id : x)) });

  return (
    <>
      <PageHeader title="História" />
      <HistoryTabs />
      <div className="px-4 pb-8">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            aria-label="Predchádzajúci mesiac"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-2xl"
          >
            ‹
          </button>
          <h2 className="text-lg font-bold first-letter:uppercase">{fmtMonth(cursor.toISOString())}</h2>
          <button
            type="button"
            aria-label="Nasledujúci mesiac"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-2xl"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted" aria-hidden>
          {WEEKDAYS_SHORT.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Kalendár tréningov">
          {weeks.flat().map((c) => {
            const done = byDay.get(c.key)?.length ?? 0;
            const planned = !!plannedRoutineId(c.date, settings.weeklyPlan) && c.key >= todayKey && !done;
            const isSel = c.key === selected;
            return (
              <button
                key={c.key}
                type="button"
                role="gridcell"
                aria-selected={isSel}
                aria-label={`${fmtDay(c.date.toISOString())}${done ? `, tréningov: ${done}` : ''}${planned ? ', naplánovaný tréning' : ''}`}
                onClick={() => setSelected(c.key)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl text-[15px] ${
                  c.inMonth ? '' : 'opacity-35'
                } ${isSel ? 'bg-accent text-white' : c.key === todayKey ? 'bg-card2 font-bold' : 'bg-card'}`}
              >
                {c.date.getDate()}
                <span className="flex h-2 items-center gap-0.5">
                  {done > 0 && <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-white' : 'bg-good'}`} />}
                  {planned && <span className={`h-2 w-2 rounded-full border-2 ${isSel ? 'border-white' : 'border-accent'}`} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex gap-4 text-xs text-muted">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-good" />
            odcvičené
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full border-2 border-accent" />
            naplánované
          </span>
        </p>

        <SectionTitle>
          <span className="first-letter:uppercase">{fmtDay(selDate.toISOString())}</span>
        </SectionTitle>
        <div className="flex flex-col gap-3">
          {selSessions.map((s) => (
            <Link key={s.id} to={`/historia/${s.id}`}>
              <Card>
                <p className="text-lg font-semibold">{s.name || 'Tréning'}</p>
                <p className="tnum text-muted">
                  {fmtDuration(s.durationSec ?? 0)} · {fmtSets(doneSetCount(s.exercises))} · {fmtVolume(workoutVolume(s.exercises))}
                </p>
              </Card>
            </Link>
          ))}
          {selPlan && (
            <Card>
              <p className="text-sm text-muted">Naplánované</p>
              <p className="text-lg font-semibold">{selPlan.name}</p>
              {selected === todayKey && !selSessions.length && (
                <Button
                  variant="primary"
                  block
                  className="mt-3"
                  disabled={!!active}
                  onClick={async () => {
                    await start(sessionFromRoutine(selPlan));
                    nav('/trening');
                  }}
                >
                  {active ? 'Najprv ukonči prebiehajúci tréning' : 'Spustiť dnešný tréning'}
                </Button>
              )}
            </Card>
          )}
          {selSessions.length === 0 && !selPlan && <p className="px-1 text-muted">Tento deň bez tréningu ani plánu.</p>}
        </div>

        <SectionTitle>Týždenný plán</SectionTitle>
        <Card className="divide-y divide-line !p-0">
          {WEEKDAYS_LONG.map((day, i) => (
            <label key={day} className="flex min-h-[56px] items-center justify-between gap-3 px-4">
              <span className="font-medium">{day}</span>
              <select
                className="field !w-auto max-w-[55%] !py-2"
                value={settings.weeklyPlan[i] ?? ''}
                onChange={(e) => setPlan(i, e.target.value || null)}
                aria-label={`Rutina na ${day}`}
              >
                <option value="">Voľno</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </Card>
        <p className="mt-2 px-1 text-sm text-muted">
          Plán sa opakuje každý týždeň. {routineName(settings.weeklyPlan.find(Boolean) ?? null) ? '' : 'Zatiaľ nemáš nič naplánované.'}
        </p>
      </div>
    </>
  );
}
