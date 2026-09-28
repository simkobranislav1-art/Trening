import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/historia', label: 'Zoznam', end: true },
  { to: '/historia/kalendar', label: 'Kalendár' },
  { to: '/historia/statistiky', label: 'Štatistiky' },
];

export function HistoryTabs() {
  return (
    <nav aria-label="Zobrazenie histórie" className="mx-4 mb-4 grid grid-cols-3 gap-1 rounded-xl bg-card p-1">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          replace
          className={({ isActive }) =>
            `flex min-h-[44px] items-center justify-center rounded-lg text-[15px] font-semibold ${
              isActive ? 'bg-accent text-white' : 'text-muted'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
