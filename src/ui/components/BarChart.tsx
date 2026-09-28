import { fmtNumber } from '../../domain/format';

/** Jednoduchý stĺpcový graf; `label` sa zobrazí pod stĺpcom. */
export function BarChart({
  bars,
  ariaLabel,
  format = (n) => fmtNumber(n),
}: {
  bars: { label: string; value: number }[];
  ariaLabel: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const W = 320;
  const H = 130;
  const gap = 8;
  const bw = (W - gap * (bars.length - 1)) / bars.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 34}`} className="w-full" role="img" aria-label={ariaLabel}>
      {bars.map((b, i) => {
        const h = Math.max(b.value > 0 ? 3 : 0, (b.value / max) * (H - 20));
        const x = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={bw} height={h} rx="4" fill="rgb(var(--accent))" opacity={i === bars.length - 1 ? 1 : 0.55} />
            {b.value > 0 && (
              <text x={x + bw / 2} y={H - h - 5} fontSize="10" textAnchor="middle" fill="rgb(var(--ink))">
                {format(b.value)}
              </text>
            )}
            <text x={x + bw / 2} y={H + 16} fontSize="10" textAnchor="middle" fill="rgb(var(--muted))">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
