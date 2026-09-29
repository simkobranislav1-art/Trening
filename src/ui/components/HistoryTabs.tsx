import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/historia', label: 'Zoznam', end: true },
  { to: '/historia/kalendar', label: 'Kalendár' },
  { to: '/historia/statistiky', label: 'Štatistiky' },
];

/** Segmentový prepínač zobrazení histórie. */
export function HistoryTabs() {
  return (
    <nav aria-label="Zobrazenie histórie" className="mx-4 mb-4 mt-1 grid grid-cols-3 gap-0.5 rounded-xl bg-surface p-[3px]">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          replace
          className={({ isActive }) =>
            `flex min-h-[38px] items-center justify-center rounded-[9px] text-[15px] font-semibold transition-colors ${
              isActive ? 'bg-raised text-ink shadow-sm' : 'text-muted'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
