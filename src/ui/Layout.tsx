import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { elapsedSeconds } from '../domain/workout';
import { fmtClock } from '../domain/format';
import { ClockIcon, DumbbellIcon, GearIcon, HomeIcon, ListIcon, PhoneIcon } from './components/Icons';
import { useNow } from './hooks/data';
import { useWorkout } from './WorkoutContext';

export const IN_FRAME = typeof window !== 'undefined' && window.self !== window.top;

const NAV = [
  { to: '/', label: 'Domov', icon: <HomeIcon />, end: true },
  { to: '/trening', label: 'Tréning', icon: <DumbbellIcon /> },
  { to: '/historia', label: 'História', icon: <ClockIcon /> },
  { to: '/cviky', label: 'Cviky', icon: <ListIcon /> },
  { to: '/nastavenia', label: 'Nastavenia', icon: <GearIcon /> },
];

function ActiveBanner() {
  const { session } = useWorkout();
  const { pathname } = useLocation();
  const now = useNow();
  if (!session || pathname === '/trening') return null;
  return (
    <Link
      to="/trening"
      className="mx-4 mb-3 flex min-h-[52px] items-center justify-between rounded-2xl bg-accent px-4 font-semibold text-white md:mx-0"
    >
      <span>{session.status === 'paused' ? 'Tréning pozastavený' : 'Prebieha tréning'}</span>
      <span className="tnum">{fmtClock(elapsedSeconds(session, now))} ›</span>
    </Link>
  );
}

export function Layout() {
  const { error } = useWorkout();
  return (
    <div className="min-h-dvh md:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-card px-3 py-6 md:flex">
        <p className="mb-6 px-3 text-xl font-bold">Tréning</p>
        <nav aria-label="Hlavná navigácia" className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center gap-3 rounded-xl px-3 font-medium ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-card2'
                }`
              }
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>
        {!IN_FRAME && (
          <NavLink
            to="/nahlad"
            className={({ isActive }) =>
              `mt-auto flex min-h-[48px] items-center gap-3 rounded-xl px-3 font-medium ${
                isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-card2'
              }`
            }
          >
            <PhoneIcon />
            Mobilný náhľad
          </NavLink>
        )}
      </aside>

      <main className="mx-auto w-full max-w-3xl pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10">
        {error && (
          <p role="alert" className="m-4 rounded-xl bg-danger/15 px-4 py-3 text-danger">
            {error}
          </p>
        )}
        <ActiveBanner />
        <Outlet />
      </main>

      <nav
        aria-label="Hlavná navigácia"
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                {n.icon}
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
