import { Link, useNavigate } from 'react-router-dom';
import { doneSetCount, workoutVolume } from '../../domain/calc';
import { fmtDay, fmtDuration, fmtInt, fmtNumber, fmtSets, fmtShortDate } from '../../domain/format';
import { upcomingWorkout, weekSummary } from '../../domain/stats';
import { Button, EmptyState, Group, Row, SectionTitle, Spinner, Stat, Tag } from '../components/basic';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions, useLibrary, useRecords, useRoutines, useSettings } from '../hooks/data';
import { useWorkout } from '../WorkoutContext';

const KIND_LABEL = { weight: 'Váha', e1rm: 'Odhad. 1RM', volume: 'Objem série' } as const;

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
  const backupAgeDays = settings.lastBackupAt ? Math.floor((Date.now() - Date.parse(settings.lastBackupAt)) / 86_400_000) : null;
  const needsBackup = sessions.length > 0 && (backupAgeDays === null || backupAgeDays >= 7);
  const recent = records
    .filter((r) => r.previous !== null)
    .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt))
    .slice(0, 5);
  const today = new Date();
  const whenText =
    upcoming?.source === 'plan' && upcoming.date
      ? upcoming.date.toDateString() === today.toDateString()
        ? 'Dnes podľa plánu'
        : `${fmtDay(upcoming.date.toISOString())} · podľa plánu`
      : 'Ďalšia v poradí';

  return (
    <>
      <PageHeader title="Domov" subtitle={fmtDay(today.toISOString())} />
      <div className="px-4 pb-6">
        {needsBackup && (
          <Link to="/nastavenia" className="press mb-4 flex items-center gap-3 rounded-2xl bg-warn/15 px-4 py-3 text-warn">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Čas na zálohu dát</span>
              <span className="block text-[14px] opacity-90">
                {backupAgeDays === null ? 'Zatiaľ si nezálohoval.' : `Naposledy pred ${backupAgeDays} dňami.`}
              </span>
            </span>
            <span aria-hidden>›</span>
          </Link>
        )}

        <Button variant="primary" block className="!min-h-[60px] !rounded-2xl !text-[18px]" onClick={() => nav('/trening')}>
          {session ? 'Pokračovať v tréningu' : 'Začať tréning'}
        </Button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Tréningy tento týždeň" value={week.count} />
          <Stat label="Objem tento týždeň" value={fmtInt(week.volume)} unit="kg" />
        </div>

        <div className="md:grid md:grid-cols-2 md:gap-x-4">
          <div>
            <SectionTitle>Najbližší tréning</SectionTitle>
            {next ? (
              <Group>
                <Row
                  to={`/rutiny/${next.id}/detail`}
                  chevron
                  title={
                    <span className="flex items-center gap-2">
                      {next.name}
                      {next.isSample && <Tag>Ukážka</Tag>}
                    </span>
                  }
                  subtitle={`${whenText} · ${next.exercises.length} cvikov`}
                />
              </Group>
            ) : (
              <EmptyState title="Žiadna rutina" hint="Vytvor si rutinu v záložke Tréning." />
            )}
          </div>

          <div>
            <SectionTitle>Posledný tréning</SectionTitle>
            {last ? (
              <Group>
                <Row
                  to={`/historia/${last.id}`}
                  chevron
                  title={last.name || 'Tréning'}
                  subtitle={`${fmtShortDate(last.startedAt)} · ${fmtDuration(last.durationSec ?? 0)} · ${fmtSets(doneSetCount(last.exercises))} · ${fmtInt(workoutVolume(last.exercises))} kg`}
                />
              </Group>
            ) : (
              <EmptyState title="Zatiaľ nič" hint="Po prvom dokončenom tréningu sa zobrazí tu." />
            )}
          </div>
        </div>

        <SectionTitle>Posledné rekordy</SectionTitle>
        {recent.length === 0 ? (
          <EmptyState title="Zatiaľ bez rekordov" hint="Rekord vznikne, keď prekonáš svoj predchádzajúci výkon." />
        ) : (
          <Group>
            {recent.map((r) => (
              <Row
                key={r.id}
                to={`/cviky/${encodeURIComponent(r.exerciseId)}`}
                title={lib.byId(r.exerciseId)?.name ?? 'Cvik'}
                subtitle={`${KIND_LABEL[r.kind]} · ${fmtShortDate(r.achievedAt)}`}
                trailing={
                  <span className="t-num text-[26px] text-accent-ink">
                    {fmtNumber(Math.round(r.value * 10) / 10)}
                    <span className="ml-0.5 text-[15px] text-muted">kg</span>
                  </span>
                }
              />
            ))}
          </Group>
        )}
      </div>
    </>
  );
}
