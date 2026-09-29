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
      className="press mx-4 mb-3 flex min-h-[48px] items-center justify-between rounded-[10px] bg-accent px-4 text-on-accent md:mx-0"
    >
      <span className="flex items-center gap-2 font-semibold">
        <span className="h-2 w-2 animate-pulse rounded-full bg-on-accent" aria-hidden />
        {session.status === 'paused' ? 'Tréning pozastavený' : 'Prebieha tréning'}
      </span>
      <span className="t-num text-[18px]">{fmtClock(elapsedSeconds(session, now))}</span>
    </Link>
  );
}

const sideLink = (isActive: boolean) =>
  `flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[16px] transition-colors ${
    isActive ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
  }`;

export function Layout() {
  const { error } = useWorkout();
  return (
    <div className="min-h-dvh md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-bg px-4 py-8 md:flex">
        <p className="mb-8 px-3 text-[24px] font-bold tracking-[-0.02em]">
          Trén<span className="text-accent-ink">ing</span>
        </p>
        <nav aria-label="Hlavná navigácia" className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => sideLink(isActive)}>
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-accent-ink' : ''}>{n.icon}</span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {!IN_FRAME && (
          <NavLink to="/nahlad" className={({ isActive }) => `${sideLink(isActive)} mt-auto`}>
            <PhoneIcon />
            Mobilný náhľad
          </NavLink>
        )}
      </aside>

      <main className="mx-auto w-full max-w-3xl pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-12">
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
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden"
      >
        <ul className="pointer-events-auto mx-auto grid max-w-md grid-cols-5 gap-0.5 rounded-full border border-white/10 bg-surface/70 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium transition-colors ${
                    isActive ? 'bg-white/10 text-accent-ink' : 'text-ink/80'
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
