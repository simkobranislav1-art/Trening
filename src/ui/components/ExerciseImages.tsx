import { useState } from 'react';

const url = (id: string, n: number): string => `${import.meta.env.BASE_URL}exercises/${id}-${n}.webp`;

/** Fotky začiatku a konca pohybu. Ak sa fotka nenačíta, nezaberá miesto. */
export function ExerciseImages({ id, count, name }: { id: string; count: number; name: string }) {
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const shown = Array.from({ length: count }, (_, i) => i).filter((i) => !failed.has(i));
  if (shown.length === 0) return null;
  const labels = ['Začiatok', 'Koniec'];
  return (
    <div className={`mb-4 grid gap-2 ${shown.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {shown.map((i) => (
        <figure key={i} className="overflow-hidden rounded-2xl bg-surface">
          <img
            src={url(id, i)}
            alt={`${name} – ${labels[i]?.toLowerCase() ?? `fotka ${i + 1}`}`}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
            onError={() => setFailed((f) => new Set(f).add(i))}
          />
          <figcaption className="px-3 py-1.5 text-xs text-muted">{labels[i] ?? `Fotka ${i + 1}`}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Malý náhľad do zoznamov; bez fotky sa nezobrazí nič. */
export function ExerciseThumb({ id, count, large }: { id: string; count: number; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!count || failed) return null;
  return (
    <img
      src={url(id, 0)}
      alt=""
      loading="lazy"
      className={`shrink-0 rounded-lg bg-raised object-cover ${large ? 'h-16 w-16' : 'h-12 w-12'}`}
      onError={() => setFailed(true)}
    />
  );
}
