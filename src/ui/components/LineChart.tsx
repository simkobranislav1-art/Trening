import { fmtNumber, fmtShortDate } from '../../domain/format';

/** Jednoduchý SVG graf progresu (bez knižníc). */
export function LineChart({
  points,
  unit = 'kg',
  caption = 'Odhadované 1RM podľa tréningov',
}: {
  points: { date: string; value: number }[];
  unit?: string;
  caption?: string;
}) {
  if (points.length < 2) {
    return <p className="py-6 text-center text-muted">Graf sa zobrazí po aspoň dvoch záznamoch.</p>;
  }
  const W = 320;
  const H = 150;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1);
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${caption}: od ${fmtNumber(Math.round(points[0].value * 10) / 10)} do ${fmtNumber(Math.round(last.value * 10) / 10)} ${unit}`}
      >
        <path d={path} fill="none" stroke="rgb(var(--accent-ink))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.date + i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4.5 : 3} fill="rgb(var(--accent-ink))" />
        ))}
        <text x={pad.l} y={H - 5} fontSize="10" fill="rgb(var(--muted))">
          {fmtShortDate(points[0].date)}
        </text>
        <text x={W - pad.r} y={H - 5} fontSize="10" textAnchor="end" fill="rgb(var(--muted))">
          {fmtShortDate(last.date)}
        </text>
        <text x={W - pad.r} y={10} fontSize="10" textAnchor="end" fill="rgb(var(--muted))">
          max {fmtNumber(Math.round(max * 10) / 10)} {unit}
        </text>
      </svg>
      <figcaption className="mt-1 text-center text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
