import { useRef, useState, type ReactNode } from 'react';
import { reorder } from '../../domain/workout';
import { Button } from './basic';
import { Sheet } from './Sheet';

interface Item {
  id: string;
  label: string;
  hint?: string;
}

/**
 * Zoznam s presúvaním ťahaním za úchyt (☰), funguje prstom aj myšou.
 * Pre klávesnicu a čítačky obrazovky má každý riadok aj tlačidlá ↑ ↓.
 */
export function SortableList({ items, onReorder }: { items: Item[]; onReorder: (from: number, to: number) => void }) {
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<{ from: number; over: number; dy: number } | null>(null);
  const start = useRef<{ y: number; from: number; heights: number[] } | null>(null);

  const targetIndex = (from: number, dy: number, heights: number[]): number => {
    // súčet výšok riadkov, o ktoré sa riadok posunul
    let acc = 0;
    let idx = from;
    if (dy > 0) {
      while (idx < heights.length - 1 && acc + heights[idx + 1] / 2 < dy) {
        acc += heights[idx + 1];
        idx++;
      }
    } else {
      while (idx > 0 && acc + heights[idx - 1] / 2 < -dy) {
        acc += heights[idx - 1];
        idx--;
      }
    }
    return idx;
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => {
        let shift = 0;
        if (drag) {
          const h = (rowRefs.current[drag.from]?.offsetHeight ?? 0) + 8;
          if (i === drag.from) shift = drag.dy;
          else if (drag.from < drag.over && i > drag.from && i <= drag.over) shift = -h;
          else if (drag.from > drag.over && i < drag.from && i >= drag.over) shift = h;
        }
        return (
          <li
            key={it.id}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            style={{ transform: `translateY(${shift}px)`, transition: drag && i === drag.from ? 'none' : 'transform 120ms' }}
            className={`flex min-h-[60px] items-center gap-2 rounded-xl bg-card2 px-2 ${
              drag?.from === i ? 'relative z-10 shadow-xl ring-2 ring-accent' : ''
            }`}
          >
            <button
              type="button"
              aria-label={`Presunúť ${it.label} ťahaním`}
              className="flex h-12 w-12 shrink-0 cursor-grab touch-none items-center justify-center text-2xl text-muted"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                start.current = {
                  y: e.clientY,
                  from: i,
                  heights: rowRefs.current.map((r) => (r?.offsetHeight ?? 60) + 8),
                };
                setDrag({ from: i, over: i, dy: 0 });
              }}
              onPointerMove={(e) => {
                const s = start.current;
                if (!s) return;
                const dy = e.clientY - s.y;
                setDrag({ from: s.from, over: targetIndex(s.from, dy, s.heights), dy });
              }}
              onPointerUp={() => {
                const s = start.current;
                start.current = null;
                if (s && drag && drag.over !== s.from) onReorder(s.from, drag.over);
                setDrag(null);
              }}
              onPointerCancel={() => {
                start.current = null;
                setDrag(null);
              }}
            >
              ☰
            </button>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 block font-semibold leading-tight">{it.label}</span>
              {it.hint && <span className="block truncate text-sm text-muted">{it.hint}</span>}
            </span>
            <button
              type="button"
              aria-label={`${it.label}: posunúť vyššie`}
              disabled={i === 0}
              onClick={() => onReorder(i, i - 1)}
              className="h-11 w-10 rounded-lg text-lg disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`${it.label}: posunúť nižšie`}
              disabled={i === items.length - 1}
              onClick={() => onReorder(i, i + 1)}
              className="h-11 w-10 rounded-lg text-lg disabled:opacity-30"
            >
              ↓
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ReorderSheet({
  open,
  onClose,
  items,
  onReorder,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  onReorder: (from: number, to: number) => void;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Poradie cvikov">
      <p className="mb-3 text-sm text-muted">Ťahaj za ☰ alebo použi šípky.</p>
      <SortableList items={items} onReorder={onReorder} />
      {footer}
      <Button variant="primary" block className="mt-4" onClick={onClose}>
        Hotovo
      </Button>
    </Sheet>
  );
}

export { reorder };
