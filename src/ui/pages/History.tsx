import { doneSetCount, workoutVolume } from '../../domain/calc';
import { fmtDuration, fmtInt, fmtMonth, fmtSets, fmtShortDate } from '../../domain/format';
import type { WorkoutSession } from '../../domain/types';
import { EmptyState, Group, Row, Spinner } from '../components/basic';
import { HistoryTabs } from '../components/HistoryTabs';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions } from '../hooks/data';

export function HistoryPage() {
  const sessions = useFinishedSessions();
  if (!sessions) {
    return (
      <>
        <PageHeader title="História" />
        <HistoryTabs />
        <Spinner />
      </>
    );
  }

  const groups: { month: string; items: WorkoutSession[] }[] = [];
  for (const s of sessions) {
    const month = fmtMonth(s.startedAt);
    const g = groups[groups.length - 1];
    if (g && g.month === month) g.items.push(s);
    else groups.push({ month, items: [s] });
  }

  return (
    <>
      <PageHeader title="História" />
      <HistoryTabs />
      <div className="px-4 pb-6">
        {sessions.length === 0 ? (
          <EmptyState title="Zatiaľ žiadne tréningy" hint="Dokončené tréningy sa zobrazia tu." />
        ) : (
          groups.map((g) => (
            <section key={g.month} aria-label={g.month}>
              <h2 className="t-label mb-2.5 mt-7 px-1 first:mt-0">{g.month}</h2>
              <Group>
                {g.items.map((s) => (
                  <Row
                    key={s.id}
                    to={`/historia/${s.id}`}
                    chevron
                    title={s.name || 'Tréning'}
                    subtitle={`${fmtShortDate(s.startedAt)} · ${fmtDuration(s.durationSec ?? 0)} · ${fmtSets(doneSetCount(s.exercises))} · ${fmtInt(workoutVolume(s.exercises))} kg`}
                  />
                ))}
              </Group>
            </section>
          ))
        )}
      </div>
    </>
  );
}
