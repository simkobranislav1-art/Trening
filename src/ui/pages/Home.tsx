import { Link, useNavigate } from 'react-router-dom';
import { workoutVolume, doneSetCount } from '../../domain/calc';
import { fmtDate, fmtDay, fmtDuration, fmtNumber, fmtSets, fmtVolume } from '../../domain/format';
import { upcomingWorkout, weekSummary } from '../../domain/stats';
import { elapsedSeconds } from '../../domain/workout';
import { Button, Card, EmptyState, SectionTitle, Spinner, Tag } from '../components/basic';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions, useLibrary, useRecords, useRoutines, useSettings } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

const KIND_LABEL = { weight: 'váha', e1rm: '1RM', volume: 'objem série' } as const;

export function Home() {
  const nav = useNavigate();
  const { session } = useWorkout();
  const sessions = useFinishedSessions();
  const routines = useRoutines();
  const records = useRecords();
  const lib = useLibrary();
  const settings = useSettings();

  if (!sessions || !routines || !records || !lib || !settings) return <Spinner />;

  const last = sessions[0];
  const week = weekSummary(sessions);
  const upcoming = upcomingWorkout(routines, sessions, settings.weeklyPlan);
  const next = upcoming?.routine ?? null;
  const backupAgeDays = settings.lastBackupAt
    ? Math.floor((Date.now() - Date.parse(settings.lastBackupAt)) / 86_400_000)
    : null;
  const needsBackup = sessions.length > 0 && (backupAgeDays === null || backupAgeDays >= 7);
  const recent = records
    .filter((r) => r.previous !== null)
    .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Domov" />
      <div className="px-4 pb-6">
        {needsBackup && (
          <Link
            to="/nastavenia"
            className="mb-4 flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-warn/15 px-4 py-2 text-warn"
          >
            <span>
              <span className="block font-semibold">Čas na zálohu dát</span>
              <span className="block text-sm">
                {backupAgeDays === null ? 'Zatiaľ si nezálohoval.' : `Naposledy pred ${backupAgeDays} dňami.`}
              </span>
            </span>
            <span aria-hidden>›</span>
          </Link>
        )}
        <Button variant="primary" block className="!min-h-[64px] text-lg" onClick={() => nav('/trening')}>
          {session ? 'Pokračovať v tréningu' : 'Začať tréning'}
        </Button>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Card>
            <p className="text-sm text-muted">Tréningy tento týždeň</p>
            <p className="tnum mt-1 text-2xl font-bold">{week.count}</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Objem tento týždeň</p>
            <p className="tnum mt-1 whitespace-nowrap text-2xl font-bold">{fmtVolume(week.volume)}</p>
          </Card>
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-x-4">
          <div>
            <SectionTitle>Najbližší tréning</SectionTitle>
            {next ? (
              <Link to="/trening">
                <Card>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">{next.name}</p>
                    {next.isSample && <Tag>Ukážka</Tag>}
                  </div>
                  <p className="text-muted">
                    {upcoming?.source === 'plan' && upcoming.date
                      ? `${upcoming.date.toDateString() === new Date().toDateString() ? 'Dnes' : fmtDay(upcoming.date.toISOString())} · podľa plánu`
                      : 'Ďalšia rutina v poradí'}{' '}
                    · {next.exercises.length} cvikov
                  </p>
                </Card>
              </Link>
            ) : (
              <EmptyState title="Žiadna rutina" hint="Vytvor si rutinu v záložke Tréning." />
            )}
          </div>

          <div>
            <SectionTitle>Posledný tréning</SectionTitle>
            {last ? (
              <Link to={`/historia/${last.id}`}>
                <Card>
                  <p className="text-lg font-semibold">{last.name || 'Tréning'}</p>
                  <p className="text-muted">{fmtDate(last.startedAt)}</p>
                  <p className="tnum mt-2 text-muted">
                    {fmtDuration(elapsedSeconds(last, 0))} · {fmtSets(doneSetCount(last.exercises))} ·{' '}
                    {fmtVolume(workoutVolume(last.exercises))}
                  </p>
                </Card>
              </Link>
            ) : (
              <EmptyState title="Zatiaľ žiadny tréning" hint="Po prvom dokončenom tréningu sa zobrazí tu." />
            )}
          </div>
        </div>

        <SectionTitle>Posledné osobné rekordy</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState title="Zatiaľ bez rekordov" hint="Rekord vznikne, keď prekonáš svoj predchádzajúci výkon." />
        ) : (
          <Card className="divide-y divide-line !p-0">
            {recent.map((r) => (
              <Link key={r.id} to={`/cviky/${encodeURIComponent(r.exerciseId)}`} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold">{lib.byId(r.exerciseId)?.name ?? 'Cvik'}</p>
                  <p className="text-sm text-muted">
                    {fmtDate(r.achievedAt)} · {KIND_LABEL[r.kind]}
                  </p>
                </div>
                <p className="tnum shrink-0 text-lg font-bold text-good">
                  {fmtNumber(Math.round(r.value * 10) / 10)} kg
                </p>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
