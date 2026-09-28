import { Link } from 'react-router-dom';
import { doneSetCount, workoutVolume } from '../../domain/calc';
import { fmtDay, fmtDuration, fmtSets, fmtMonth, fmtVolume } from '../../domain/format';
import type { WorkoutSession } from '../../domain/types';
import { Card, EmptyState, Spinner } from '../components/basic';
import { HistoryTabs } from '../components/HistoryTabs';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions } from '../hooks/data';

export function HistoryPage() {
  const sessions = useFinishedSessions();
  if (!sessions) return (<><PageHeader title="História" /><HistoryTabs /><Spinner /></>);

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
              <h2 className="mb-2 mt-5 px-1 text-sm font-semibold uppercase tracking-wide text-muted">{g.month}</h2>
              <div className="flex flex-col gap-3">
                {g.items.map((s) => (
                  <Link key={s.id} to={`/historia/${s.id}`}>
                    <Card>
                      <p className="text-sm text-muted first-letter:uppercase">{fmtDay(s.startedAt)}</p>
                      <p className="text-lg font-semibold">{s.name || 'Tréning'}</p>
                      <p className="tnum mt-1 text-muted">
                        {fmtDuration(s.durationSec ?? 0)} · {fmtSets(doneSetCount(s.exercises))} · {fmtVolume(workoutVolume(s.exercises))}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted">{s.exercises.map((e) => e.exerciseName).join(', ')}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
