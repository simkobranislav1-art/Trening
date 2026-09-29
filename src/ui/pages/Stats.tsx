import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MUSCLE_LABELS, muscleLabel } from '../../domain/exercises';
import { fmtInt, fmtSets, fmtShortDate } from '../../domain/format';
import { muscleLoad, neglectedMuscles, weeklyBuckets } from '../../domain/statistics';
import { BarChart } from '../components/BarChart';
import { Card, Chip, EmptyState, SectionTitle, Spinner, Tag } from '../components/basic';
import { HistoryTabs } from '../components/HistoryTabs';
import { PageHeader } from '../components/PageHeader';
import { useFinishedSessions, useLibrary } from '../hooks/data';

export function StatsPage() {
  const sessions = useFinishedSessions();
  const lib = useLibrary();
  const [days, setDays] = useState(30);

  if (!sessions || !lib) {
    return (
      <>
        <PageHeader title="História" />
        <HistoryTabs />
        <Spinner />
      </>
    );
  }

  const weeks = weeklyBuckets(sessions, 8);
  const load = muscleLoad(sessions, (id) => lib.byId(id)?.primaryMuscle, days);
  const maxSets = Math.max(1, ...Object.values(load).map((l) => l.sets));
  const rows = Object.keys(MUSCLE_LABELS)
    .map((m) => ({ muscle: m, sets: load[m]?.sets ?? 0, volume: load[m]?.volume ?? 0 }))
    .sort((a, b) => b.sets - a.sets);
  const lagging = neglectedMuscles(load, Object.keys(MUSCLE_LABELS));

  return (
    <>
      <PageHeader title="História" />
      <HistoryTabs />
      <div className="px-4 pb-8">
        {sessions.length === 0 ? (
          <EmptyState title="Zatiaľ bez štatistík" hint="Zobrazia sa po prvom dokončenom tréningu." />
        ) : (
          <>
            <SectionTitle>Tréningy za týždeň</SectionTitle>
            <Card>
              <BarChart
                ariaLabel="Počet tréningov za posledných 8 týždňov"
                bars={weeks.map((w) => ({ label: fmtShortDate(w.weekStart.toISOString()), value: w.count }))}
              />
            </Card>

            <SectionTitle>Objem za týždeň (kg)</SectionTitle>
            <Card>
              <BarChart
                ariaLabel="Objem za posledných 8 týždňov"
                format={(n) => fmtInt(n)}
                bars={weeks.map((w) => ({ label: fmtShortDate(w.weekStart.toISOString()), value: w.volume }))}
              />
            </Card>

            <SectionTitle>Série podľa svalovej partie</SectionTitle>
            <div className="mb-3 flex gap-2" role="group" aria-label="Obdobie">
              <Chip active={days === 7} onClick={() => setDays(7)}>
                7 dní
              </Chip>
              <Chip active={days === 30} onClick={() => setDays(30)}>
                30 dní
              </Chip>
              <Chip active={days === 90} onClick={() => setDays(90)}>
                90 dní
              </Chip>
            </div>
            <Card>
              <ul className="flex flex-col gap-3">
                {rows.map((r) => (
                  <li key={r.muscle}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{muscleLabel(r.muscle)}</span>
                      <span className="tnum text-muted">{fmtSets(r.sets)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-raised" role="presentation">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(r.sets / maxSets) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Počítajú sa dokončené pracovné série podľa hlavnej partie cviku (bez zahrievacích).</p>
            </Card>

            <SectionTitle>Zaostávajúce partie ({days} dní)</SectionTitle>
            {lagging.length === 0 ? (
              <p className="px-1 text-muted">Trénoval si všetky partie.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {lagging.map((m) => (
                  <Tag key={m}>{muscleLabel(m)}</Tag>
                ))}
              </div>
            )}
          </>
        )}

        <SectionTitle>Ďalšie</SectionTitle>
        <Card className="!p-0">
          <Link to="/telo" className="flex min-h-[56px] items-center justify-between px-4 font-medium">
            Telesná váha a miery <span className="text-muted">›</span>
          </Link>
        </Card>
      </div>
    </>
  );
}
