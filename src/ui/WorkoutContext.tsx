import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { discardSession, finishSession, getActiveSession, saveSession } from '../db/repo';
import type { WorkoutSession } from '../domain/types';

interface WorkoutApi {
  /** undefined = načítava sa, null = žiadny aktívny tréning. */
  session: WorkoutSession | null | undefined;
  /** Zmení rozpracovaný tréning a automaticky ho uloží. */
  update: (fn: (s: WorkoutSession) => WorkoutSession) => void;
  start: (s: WorkoutSession) => Promise<void>;
  /** Vracia uložený tréning alebo null, ak nemal žiadnu dokončenú sériu. */
  finish: () => Promise<WorkoutSession | null>;
  discard: () => Promise<void>;
  error: string | null;
}

const Ctx = createContext<WorkoutApi | null>(null);

export const useWorkout = (): WorkoutApi => {
  const v = useContext(Ctx);
  if (!v) throw new Error('WorkoutProvider chýba');
  return v;
};

const SAVE_DELAY_MS = 40;

/**
 * Drží rozpracovaný tréning v pamäti (rýchle ovládanie) a zapisuje ho do IndexedDB:
 * krátko po každej zmene, pri skrytí stránky a pri zatvorení. Pri reloade sa načíta späť.
 */
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<WorkoutSession | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<WorkoutSession | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const flush = useCallback((): Promise<void> => {
    clearTimeout(timer.current);
    // Zápisy sa radia za sebou; každý uloží najnovší stav, takže sa rýchle zmeny zlúčia.
    chain.current = chain.current.then(async () => {
      if (!dirty.current || !latest.current) return;
      dirty.current = false;
      try {
        await saveSession(latest.current);
        setError(null);
      } catch {
        dirty.current = true;
        setError('Tréning sa nepodarilo uložiť. Skús to znova alebo ho exportuj v Nastaveniach.');
      }
    });
    return chain.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    getActiveSession()
      .then((s) => {
        if (cancelled) return;
        latest.current = s;
        setSession(s);
      })
      .catch(() => {
        if (!cancelled) {
          setSession(null);
          setError('Databázu sa nepodarilo otvoriť.');
        }
      });
    const onHide = () => void flush();
    const onVisibility = () => document.visibilityState === 'hidden' && onHide();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      void flush();
    };
  }, [flush]);

  const update = useCallback(
    (fn: (s: WorkoutSession) => WorkoutSession) => {
      if (!latest.current) return;
      const next = fn(latest.current);
      latest.current = next;
      dirty.current = true;
      setSession(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  const start = useCallback(async (s: WorkoutSession) => {
    await saveSession(s);
    latest.current = s;
    dirty.current = false;
    setSession(s);
  }, []);

  const finish = useCallback(async () => {
    const cur = latest.current;
    if (!cur) return null;
    await flush();
    const done = await finishSession(cur);
    if (done) {
      latest.current = null;
      setSession(null);
    }
    return done;
  }, [flush]);

  const discard = useCallback(async () => {
    const cur = latest.current;
    if (!cur) return;
    clearTimeout(timer.current);
    dirty.current = false;
    await chain.current;
    await discardSession(cur.id);
    latest.current = null;
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, update, start, finish, discard, error }),
    [session, update, start, finish, discard, error],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
