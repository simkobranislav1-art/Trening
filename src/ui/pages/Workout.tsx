import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doneSetCount, workoutVolume } from '../../domain/calc';
import { plannedRoutineId } from '../../domain/calendar';
import { fmtClock, fmtNumber, fmtVolume } from '../../domain/format';
import { buildHistoryIndex, type HistoryEntry } from '../../domain/stats';
import { suggestNext } from '../../domain/suggest';
import type { AppSettings, Exercise, Routine, SetType, WorkoutExercise, WorkoutSession, WorkoutSet } from '../../domain/types';
import {
  elapsedSeconds,
  isLastInSuperset,
  newSession,
  newSet,
  newWorkoutExercise,
  pauseSession,
  reorder,
  resumeSession,
  sessionFromRoutine,
  toggleSupersetWithNext,
  unfinishedSetCount,
} from '../../domain/workout';
import { Button, Card, Chip, EmptyState, ErrorNote, SectionTitle, Spinner, Tag } from '../components/basic';
import { ExercisePicker } from '../components/ExercisePicker';
import { NumberField } from '../components/NumberField';
import { PlateCalculator } from '../components/PlateCalculator';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog, Sheet } from '../components/Sheet';
import { ReorderSheet } from '../components/Sortable';
import { useFinishedSessions, useLibrary, useNow, useRoutines, useSettings } from '../hooks/data';
import { beep, unlockAudio } from '../sound';
import { useWorkout } from '../WorkoutContext';

export function WorkoutPage() {
  const { session } = useWorkout();
  if (session === undefined) return <Spinner />;
  return session ? <ActiveWorkout session={session} /> : <StartWorkout />;
}

// --- Začiatok tréningu ----------------------------------------------------

function StartWorkout() {
  const { start } = useWorkout();
  const routines = useRoutines();
  const settings = useSettings();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const todayPlanId = settings ? plannedRoutineId(new Date(), settings.weeklyPlan) : null;

  const begin = async (s: WorkoutSession) => {
    try {
      await start(s);
    } catch {
      setError('Tréning sa nepodarilo spustiť.');
    }
  };

  return (
    <>
      <PageHeader title="Tréning" />
      <div className="px-4 pb-6">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button variant="primary" block className="!min-h-[64px] text-lg" onClick={() => begin(newSession('Tréning', []))}>
          Prázdny tréning
        </Button>

        <SectionTitle
          action={
            <Button variant="ghost" small onClick={() => nav('/rutiny/nova')}>
              + Nová rutina
            </Button>
          }
        >
          Rutiny
        </SectionTitle>
        {!routines ? (
          <Spinner />
        ) : routines.length === 0 ? (
          <EmptyState
            title="Žiadne rutiny"
            hint="Rutina je šablóna cvikov, z ktorej spustíš tréning jedným ťuknutím."
            action={<Button variant="primary" onClick={() => nav('/rutiny/nova')}>Vytvoriť rutinu</Button>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {routines.map((r) => (
              <RoutineCard key={r.id} routine={r} plannedToday={r.id === todayPlanId} onStart={() => begin(sessionFromRoutine(r))} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RoutineCard({ routine, onStart, plannedToday }: { routine: Routine; onStart: () => void; plannedToday?: boolean }) {
  const lib = useLibrary();
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-semibold">{routine.name}</p>
            {routine.isSample && <Tag>Ukážka</Tag>}
            {plannedToday && <Tag tone="accent">Dnes</Tag>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {routine.exercises.map((e) => lib?.nameOf(e.exerciseId, e.exerciseName) ?? e.exerciseName).join(', ') || 'Bez cvikov'}
          </p>
        </div>
        <Link
          to={`/rutiny/${routine.id}`}
          className="flex min-h-[44px] shrink-0 items-center px-2 font-medium text-accent"
          aria-label={`Upraviť rutinu ${routine.name}`}
        >
          Upraviť
        </Link>
      </div>
      <Button variant="primary" block className="mt-3" onClick={onStart}>
        Spustiť
      </Button>
    </Card>
  );
}

// --- Aktívny tréning ------------------------------------------------------

function ActiveWorkout({ session }: { session: WorkoutSession }) {
  const { update, finish, discard } = useWorkout();
  const settings = useSettings();
  const sessions = useFinishedSessions();
  const nav = useNavigate();
  const now = useNow(1000);
  const lib = useLibrary();
  const [picker, setPicker] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState('');

  const history = useMemo(() => buildHistoryIndex(sessions ?? []), [sessions]);
  if (!settings || !sessions || !lib) return <Spinner />;

  const paused = session.status === 'paused';
  const updateExercise = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    update((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

  const startRest = (seconds: number) =>
    update((s) => ({ ...s, restEndsAt: new Date(Date.now() + seconds * 1000).toISOString() }));

  const doFinish = async () => {
    try {
      const done = await finish();
      setConfirmFinish(false);
      if (done) nav(`/historia/${done.id}`, { replace: true });
    } catch {
      setError('Tréning sa nepodarilo uložiť.');
    }
  };

  const doneSets = doneSetCount(session.exercises);

  return (
    <>
      <PageHeader
        title={session.name || 'Tréning'}
        subtitle={paused ? 'Pozastavené' : undefined}
        titleAction={
          <button
            type="button"
            onClick={() => setRenameOpen(true)}
            aria-label="Premenovať tréning"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-muted"
          >
            ✎
          </button>
        }
        action={
          <div className="flex items-center gap-2">
            <span className="tnum text-xl font-bold" aria-label="Čas tréningu">
              {fmtClock(elapsedSeconds(session, now))}
            </span>
            <Button small onClick={() => update(paused ? resumeSession : pauseSession)}>
              {paused ? 'Pokračovať' : 'Pauza'}
            </Button>
          </div>
        }
      />
      <RestBar session={session} settings={settings} onStart={startRest} onChange={(iso) => update((s) => ({ ...s, restEndsAt: iso }))} />

      <div className="flex flex-col gap-4 px-4 pb-6 pt-2">
        {error && <ErrorNote>{error}</ErrorNote>}
        {session.exercises.length === 0 && (
          <EmptyState title="Prázdny tréning" hint="Pridaj cviky a začni zapisovať série." />
        )}
        {session.exercises.map((we, i) => {
          const sid = we.supersetId;
          const samePrev = !!sid && session.exercises[i - 1]?.supersetId === sid;
          const sameNext = !!sid && session.exercises[i + 1]?.supersetId === sid;
          return (
            <ExerciseCard
              key={we.id}
              we={we}
              displayName={lib.nameOf(we.exerciseId, we.exerciseName)}
              total={session.exercises.length}
              supersetPos={sid ? (samePrev ? (sameNext ? 'middle' : 'last') : 'first') : null}
              canLink={i < session.exercises.length - 1}
              linkedToNext={sameNext}
              last={history.get(we.exerciseId)?.[0]}
              settings={settings}
              onChange={(fn) => updateExercise(we.id, fn)}
              onCompleted={() => {
                unlockAudio();
                if (isLastInSuperset(session.exercises, i)) startRest(settings.restSeconds);
              }}
              onReorderRequest={() => setReorderOpen(true)}
              onToggleLink={() => update((s) => ({ ...s, exercises: toggleSupersetWithNext(s.exercises, i) }))}
              onRemove={() => update((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== we.id) }))}
            />
          );
        })}

        <div className="flex gap-3">
          <Button variant="primary" block onClick={() => setPicker(true)}>
            + Pridať cvik
          </Button>
          {session.exercises.length > 1 && (
            <Button block onClick={() => setReorderOpen(true)}>
              Poradie
            </Button>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Poznámka k tréningu</span>
          <textarea
            className="field min-h-[80px]"
            value={session.note}
            onChange={(e) => update((s) => ({ ...s, note: e.target.value }))}
          />
        </label>

        <p className="text-center text-sm text-muted">
          Ťuk na číslo série mení typ: číslo = pracovná, Z = zahrievacia, D = drop set. Zahrievacie série sa
          nezapočítavajú do objemu ani rekordov.
        </p>

        <div className="flex flex-col gap-3">
          <Button variant="primary" block className="!bg-good" onClick={() => setConfirmFinish(true)}>
            Ukončiť tréning
          </Button>
          <Button variant="danger" block onClick={() => setConfirmDiscard(true)}>
            Zahodiť tréning
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onAdd={(list: Exercise[]) =>
          update((s) => ({ ...s, exercises: [...s.exercises, ...list.map((e) => newWorkoutExercise(e, 3))] }))
        }
      />

      <ReorderSheet
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        items={session.exercises.map((e) => ({
          id: e.id,
          label: lib.nameOf(e.exerciseId, e.exerciseName),
          hint: e.supersetId ? 'Superset' : undefined,
        }))}
        onReorder={(from, to) => update((s) => ({ ...s, exercises: reorder(s.exercises, from, to) }))}
      />

      <Sheet open={renameOpen} onClose={() => setRenameOpen(false)} title="Názov tréningu">
        <input
          className="field mb-4"
          aria-label="Názov tréningu"
          value={session.name}
          maxLength={60}
          onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && setRenameOpen(false)}
          autoFocus
        />
        <Button variant="primary" block onClick={() => setRenameOpen(false)}>
          Hotovo
        </Button>
      </Sheet>

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Ukončiť tréning?">
        {doneSets === 0 ? (
          <>
            <p className="mb-5 text-muted">Nemáš dokončenú žiadnu sériu, takže nie je čo uložiť.</p>
            <div className="flex flex-col gap-3">
              <Button block onClick={() => setConfirmFinish(false)}>
                Pokračovať v tréningu
              </Button>
              <Button
                variant="danger"
                block
                onClick={async () => {
                  await discard();
                  setConfirmFinish(false);
                }}
              >
                Zahodiť tréning
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="tnum mb-2 text-lg">
              {doneSets} dokončených sérií · {fmtVolume(workoutVolume(session.exercises))}
            </p>
            {unfinishedSetCount(session) > 0 && (
              <p className="mb-4 text-warn">
                {unfinishedSetCount(session)} nedokončených sérií sa neuloží.
              </p>
            )}
            <div className="flex flex-col gap-3">
              <Button variant="primary" block onClick={doFinish}>
                Ukončiť a uložiť
              </Button>
              <Button block onClick={() => setConfirmFinish(false)}>
                Pokračovať v tréningu
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="Zahodiť tréning?"
        message="Rozpracovaný tréning sa natrvalo zmaže a nedá sa vrátiť."
        confirmLabel="Zahodiť"
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          await discard();
          setConfirmDiscard(false);
        }}
      />
    </>
  );
}

// --- Prestávka ------------------------------------------------------------

function RestBar({
  session,
  settings,
  onStart,
  onChange,
}: {
  session: WorkoutSession;
  settings: AppSettings;
  onStart: (sec: number) => void;
  onChange: (iso: string | null) => void;
}) {
  const now = useNow(250);
  const end = session.restEndsAt ? Date.parse(session.restEndsAt) : null;
  const remaining = end === null ? null : Math.ceil((end - now) / 1000);
  const over = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!over) return;
    if (settings.restSound) beep();
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* nepodporované */
    }
    const t = setTimeout(() => onChange(null), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, session.restEndsAt]);

  if (remaining === null || end === null) {
    return (
      <div className="px-4 pb-1">
        <Button small block onClick={() => onStart(settings.restSeconds)}>
          Spustiť prestávku ({fmtClock(settings.restSeconds)})
        </Button>
      </div>
    );
  }
  const shift = (sec: number) => onChange(new Date(end + sec * 1000).toISOString());
  return (
    <div className="px-4 pb-1">
      <div
        role="timer"
        aria-live="off"
        className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 ${over ? 'bg-good/20' : 'bg-accent/15'}`}
      >
        <div>
          <p className="text-xs font-medium text-muted">{over ? 'Prestávka skončila' : 'Prestávka'}</p>
          <p className="tnum text-3xl font-bold">{over ? '0:00' : fmtClock(remaining)}</p>
        </div>
        <div className="flex gap-2">
          <Button small onClick={() => shift(-15)} aria-label="Skrátiť o 15 sekúnd">
            −15
          </Button>
          <Button small onClick={() => shift(15)} aria-label="Predĺžiť o 15 sekúnd">
            +15
          </Button>
          <Button small variant="primary" onClick={() => onChange(null)}>
            {over ? 'Hotovo' : 'Preskočiť'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Cvik a série ---------------------------------------------------------

const TYPE_LABEL: Record<SetType, string> = { working: 'Pracovná', warmup: 'Zahrievacia', drop: 'Drop set' };

type SupersetPos = 'first' | 'middle' | 'last' | null;

function ExerciseCard({
  we,
  displayName,
  total,
  supersetPos,
  canLink,
  linkedToNext,
  last,
  settings,
  onChange,
  onCompleted,
  onReorderRequest,
  onToggleLink,
  onRemove,
}: {
  we: WorkoutExercise;
  displayName: string;
  total: number;
  supersetPos: SupersetPos;
  canLink: boolean;
  linkedToNext: boolean;
  last: HistoryEntry | undefined;
  settings: AppSettings;
  onChange: (fn: (e: WorkoutExercise) => WorkoutExercise) => void;
  onCompleted: () => void;
  onReorderRequest: () => void;
  onToggleLink: () => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [plates, setPlates] = useState(false);
  const [editSet, setEditSet] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const prevSets = useMemo(() => (last?.sets ?? []).filter((s) => s.done), [last]);
  const suggestion = useMemo(() => suggestNext(last?.sets ?? [], settings.progressionStep), [last, settings.progressionStep]);
  // Minulá séria sa páruje podľa poradia v rámci rovnakého typu (zahrievacie k zahrievacím…).
  const prevFor = (s: WorkoutSet): WorkoutSet | undefined => {
    const sameType = we.sets.filter((x) => (x.type === 'warmup') === (s.type === 'warmup'));
    const pos = sameType.findIndex((x) => x.id === s.id);
    return prevSets.filter((p) => (p.type === 'warmup') === (s.type === 'warmup'))[pos];
  };

  const setSet = (id: string, patch: Partial<WorkoutSet>) =>
    onChange((e) => ({ ...e, sets: e.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const applySuggestion = () => {
    if (!suggestion) return;
    onChange((e) => ({
      ...e,
      sets: e.sets.map((s) =>
        s.done || s.type === 'warmup' ? s : { ...s, weight: s.weight ?? suggestion.weight, reps: s.reps ?? suggestion.reps },
      ),
    }));
  };

  const editing = we.sets.find((s) => s.id === editSet) ?? null;
  let workingNo = 0;

  return (
    <Card
      className={`!p-3 ${supersetPos ? 'border-l-4 border-accent' : ''} ${
        supersetPos === 'first' || supersetPos === 'middle' ? '!mb-[-0.5rem] !rounded-b-md' : ''
      } ${supersetPos === 'last' || supersetPos === 'middle' ? '!rounded-t-md' : ''}`}
    >
      {supersetPos === 'first' && <p className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-accent">Superset</p>}
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <Link to={`/cviky/${encodeURIComponent(we.exerciseId)}`} className="block text-lg font-bold leading-tight text-accent">
            {displayName}
          </Link>
          {last && (
            <p className="tnum truncate text-sm text-muted">
              Minule:{' '}
              {last.sets
                .filter((s) => s.done && s.type !== 'warmup')
                .map((s) => `${fmtNumber(s.weight ?? 0)}×${s.reps}`)
                .join(' · ') || '–'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label={`Možnosti cviku ${displayName}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card2 text-2xl leading-none"
        >
          ⋯
        </button>
      </div>
      {we.note && (
        <button type="button" onClick={() => setMenu(true)} className="mb-2 w-full rounded-lg bg-card2 px-3 py-2 text-left text-sm text-muted">
          {we.note}
        </button>
      )}
      {suggestion && we.sets.some((s) => !s.done && s.type !== 'warmup' && (s.weight === null || s.reps === null)) && (
        <button
          type="button"
          onClick={applySuggestion}
          className="mb-2 flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl bg-accent/10 px-3 py-2 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-accent">
              Návrh: {fmtNumber(suggestion.weight)} kg × {suggestion.reps}
            </span>
            <span className="block text-xs text-muted">{suggestion.reason}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-accent">Použiť</span>
        </button>
      )}

      <div className="mb-1 grid grid-cols-[44px_1fr_84px_72px_52px] items-center gap-1.5 px-1 text-xs font-medium text-muted">
        <span className="text-center">Séria</span>
        <span className="text-center">Minule</span>
        <span className="text-center">kg</span>
        <span className="text-center">Opak.</span>
        <span />
      </div>

      <ul className="flex flex-col gap-1.5">
        {we.sets.map((s) => {
          if (s.type !== 'warmup') workingNo += 1;
          const label = s.type === 'warmup' ? 'Z' : s.type === 'drop' ? 'D' : String(workingNo);
          const prev = prevFor(s);
          const effortKey = settings.effortMode;
          return (
            <li key={s.id} className={`rounded-xl px-1 py-1 ${s.done ? 'bg-good/15' : ''}`}>
              <div className="grid grid-cols-[44px_1fr_84px_72px_52px] items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditSet(s.id)}
                  aria-label={`Séria ${label}, typ: ${TYPE_LABEL[s.type]}. Ťuknutím zmeníš typ, poznámku alebo sériu odstrániš.`}
                  className={`relative h-14 rounded-xl text-lg font-bold ${
                    s.type === 'warmup' ? 'bg-warn/20 text-warn' : s.type === 'drop' ? 'bg-accent/20 text-accent' : 'bg-card2'
                  }`}
                >
                  {label}
                  {s.note && <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />}
                </button>
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => prev && setSet(s.id, { weight: prev.weight, reps: prev.reps })}
                  aria-label={prev ? `Použiť minulý výkon ${fmtNumber(prev.weight ?? 0)} kg × ${prev.reps}` : 'Bez minulého výkonu'}
                  className="tnum h-14 rounded-xl text-sm text-muted disabled:opacity-40"
                >
                  {prev ? `${fmtNumber(prev.weight ?? 0)}×${prev.reps}` : '–'}
                </button>
                <NumberField
                  decimal
                  label={`Váha v kg, séria ${label}`}
                  value={s.weight}
                  placeholder={prev?.weight != null ? fmtNumber(prev.weight) : '0'}
                  max={999}
                  onChange={(v) => setSet(s.id, { weight: v })}
                  className="h-14 w-full text-xl"
                />
                <NumberField
                  label={`Opakovania, séria ${label}`}
                  value={s.reps}
                  placeholder={prev?.reps != null ? String(prev.reps) : '0'}
                  max={999}
                  onChange={(v) => setSet(s.id, { reps: v })}
                  className="h-14 w-full text-xl"
                />
                <button
                  type="button"
                  aria-pressed={s.done}
                  aria-label={s.done ? `Séria ${label} dokončená, zrušiť` : `Dokončiť sériu ${label}`}
                  onClick={() => {
                    if (s.done) return setSet(s.id, { done: false, completedAt: null });
                    const reps = s.reps ?? prev?.reps ?? null;
                    if (!reps) return; // bez opakovaní nedáva dokončenie zmysel
                    setSet(s.id, {
                      done: true,
                      completedAt: new Date().toISOString(),
                      reps,
                      weight: s.weight ?? prev?.weight ?? 0,
                    });
                    onCompleted();
                  }}
                  className={`h-14 rounded-xl text-2xl font-bold ${s.done ? 'bg-good text-white' : 'bg-card2 text-muted'}`}
                >
                  ✓
                </button>
              </div>
              {settings.showEffort && (
                <div className="mt-1 flex items-center justify-end gap-2 pr-1">
                  <span className="text-sm text-muted">{effortKey === 'rpe' ? 'RPE' : 'RIR'}</span>
                  <NumberField
                    decimal={effortKey === 'rpe'}
                    label={`${effortKey === 'rpe' ? 'RPE' : 'RIR'}, séria ${label}`}
                    value={s[effortKey]}
                    max={10}
                    placeholder="–"
                    onChange={(v) => setSet(s.id, { [effortKey]: v })}
                    className="h-11 w-20 text-lg"
                  />
                </div>
              )}
              {s.note && <p className="mt-1 px-2 text-sm text-muted">{s.note}</p>}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex gap-2">
        <Button block small onClick={() => onChange((e) => ({ ...e, sets: [...e.sets, newSet()] }))}>
          + Séria
        </Button>
        <Button
          block
          small
          disabled={we.sets.length === 0}
          onClick={() =>
            onChange((e) => {
              const l = e.sets[e.sets.length - 1];
              return { ...e, sets: [...e.sets, newSet({ type: l.type, weight: l.weight, reps: l.reps })] };
            })
          }
        >
          Duplikovať sériu
        </Button>
      </div>

      <Sheet open={!!editing} onClose={() => setEditSet(null)} title="Séria">
        {editing && (
          <>
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Typ série">
              {(['working', 'warmup', 'drop'] as SetType[]).map((t) => (
                <Chip key={t} active={editing.type === t} onClick={() => setSet(editing.id, { type: t })}>
                  {TYPE_LABEL[t]}
                </Chip>
              ))}
            </div>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-muted">Poznámka k sérii</span>
              <textarea
                className="field min-h-[80px]"
                value={editing.note ?? ''}
                onChange={(e) => setSet(editing.id, { note: e.target.value })}
              />
            </label>
            <p className="mb-4 text-sm text-muted">Zahrievacie série sa nezapočítavajú do objemu ani rekordov.</p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" onClick={() => setEditSet(null)}>
                Hotovo
              </Button>
              <Button
                variant="danger"
                disabled={we.sets.length <= 1}
                onClick={() => {
                  const id = editing.id;
                  setEditSet(null);
                  onChange((e) => ({ ...e, sets: e.sets.filter((x) => x.id !== id) }));
                }}
              >
                Odstrániť sériu
              </Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={menu} onClose={() => setMenu(false)} title={displayName}>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-muted">Poznámka ku cviku</span>
          <textarea className="field min-h-[90px]" value={we.note} onChange={(e) => onChange((x) => ({ ...x, note: e.target.value }))} />
        </label>
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => {
              setMenu(false);
              setPlates(true);
            }}
          >
            Kalkulačka kotúčov
          </Button>
          {canLink && (
            <Button onClick={onToggleLink}>{linkedToNext ? 'Zrušiť superset s nasledujúcim' : 'Superset s nasledujúcim cvikom'}</Button>
          )}
          {total > 1 && (
            <Button
              onClick={() => {
                setMenu(false);
                onReorderRequest();
              }}
            >
              Zmeniť poradie cvikov
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => {
              setMenu(false);
              if (we.sets.some((s) => s.done)) setConfirmRemove(true);
              else onRemove();
            }}
          >
            Odstrániť cvik z tréningu
          </Button>
          <Button variant="primary" onClick={() => setMenu(false)}>
            Hotovo
          </Button>
        </div>
      </Sheet>
      <Sheet open={plates} onClose={() => setPlates(false)} title="Kalkulačka kotúčov">
        <PlateCalculator
          settings={settings}
          initial={we.sets.find((x) => !x.done && x.weight)?.weight ?? suggestion?.weight ?? null}
        />
      </Sheet>
      <ConfirmDialog
        open={confirmRemove}
        danger
        title="Odstrániť cvik?"
        message="Cvik má dokončené série, ktoré sa stratia."
        confirmLabel="Odstrániť"
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          onRemove();
        }}
      />
    </Card>
  );
}
