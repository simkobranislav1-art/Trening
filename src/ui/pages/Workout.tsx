import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doneSetCount, workoutVolume } from '../../domain/calc';
import { plannedRoutineId } from '../../domain/calendar';
import { fmtClock, fmtNumber, fmtVolume } from '../../domain/format';
import { buildHistoryIndex, type HistoryEntry } from '../../domain/stats';
import { suggestNext } from '../../domain/suggest';
import type { AppSettings, Exercise, SetType, WorkoutExercise, WorkoutSession, WorkoutSet } from '../../domain/types';
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
import { Button, Chip, CircleButton, EmptyState, ErrorNote, SectionTitle, Spinner, Tag } from '../components/basic';
import { ExerciseAvatar } from '../components/ExerciseImages';
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  MoreIcon,
  MoreVerticalIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  TimerIcon,
} from '../components/Icons';
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

  const lib = useLibrary();
  return (
    <>
      <PageHeader title="Tréning" />
      <div className="px-4 pb-6">
        {error && <ErrorNote>{error}</ErrorNote>}
        <button
          type="button"
          onClick={() => begin(newSession('Tréning', []))}
          className="press flex min-h-[48px] w-full items-center gap-3 rounded-[10px] bg-surface px-4 text-[18px]"
        >
          <PlusIcon />
          Začať prázdny tréning
        </button>

        <SectionTitle
          action={
            <button type="button" onClick={() => nav('/rutiny/nova')} aria-label="Nová rutina" className="press flex h-10 w-10 items-center justify-center rounded-full text-ink">
              <PlusIcon size={24} />
            </button>
          }
        >
          Rutiny
        </SectionTitle>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => nav('/rutiny/nova')} className="press flex min-h-[48px] items-center gap-3 rounded-[10px] bg-surface px-4 text-[18px]">
            <ClipboardIcon />
            Nová rutina
          </button>
          <button type="button" onClick={() => nav('/cviky')} className="press flex min-h-[48px] items-center gap-3 rounded-[10px] bg-surface px-4 text-[18px]">
            <SearchIcon />
            Cviky
          </button>
        </div>

        <p className="mb-3 mt-6 flex items-center gap-2 text-[17px] text-muted">
          <span aria-hidden>▾</span> Moje rutiny{routines ? ` (${routines.length})` : ''}
        </p>

        {!routines || !lib ? (
          <Spinner />
        ) : routines.length === 0 ? (
          <EmptyState title="Žiadne rutiny" hint="Rutina je šablóna cvikov, z ktorej spustíš tréning jedným ťuknutím." />
        ) : (
          <div className="flex flex-col gap-3">
            {routines.map((r) => (
              <div key={r.id} className="rounded-xl bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/rutiny/${r.id}/detail`} className="min-w-0 flex-1" aria-label={`Zobraziť rutinu ${r.name}`}>
                    <p className="flex flex-wrap items-center gap-2 text-[20px] font-medium leading-tight">
                      {r.name}
                      {r.isSample && <Tag>Ukážka</Tag>}
                      {r.id === todayPlanId && <Tag tone="accent">Dnes</Tag>}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[16px] leading-snug text-muted">
                      {r.exercises.map((e) => lib.nameOf(e.exerciseId, e.exerciseName)).join(', ') || 'Bez cvikov'}
                    </p>
                  </Link>
                  <Link to={`/rutiny/${r.id}`} aria-label={`Upraviť rutinu ${r.name}`} className="press -mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink">
                    <MoreIcon />
                  </Link>
                </div>
                <Button variant="primary" block small className="mt-3 !min-h-[42px] !text-[17px]" onClick={() => begin(sessionFromRoutine(r))}>
                  Spustiť rutinu
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
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
      <header className="pt-safe sticky top-0 z-20 bg-surface/90 shadow-[0_0.5px_0_rgb(var(--line))] backdrop-blur-xl">
        <div className="flex min-h-[60px] items-center gap-2.5 px-4 py-2">
          <CircleButton label="Domov" to="/" className="!bg-raised">
            <ChevronDownIcon />
          </CircleButton>
          <button type="button" onClick={() => setRenameOpen(true)} className="min-w-0 flex-1 truncate text-left text-[18px]" aria-label="Premenovať tréning">
            {session.name || 'Tréning'}
          </button>
          <CircleButton
            label={paused ? 'Pokračovať v tréningu' : 'Pozastaviť tréning'}
            onClick={() => update(paused ? resumeSession : pauseSession)}
            className="!bg-raised"
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </CircleButton>
          <CircleButton label={`Spustiť prestávku ${fmtClock(settings.restSeconds)}`} onClick={() => startRest(settings.restSeconds)} className="!bg-raised">
            <TimerIcon />
          </CircleButton>
          <button
            type="button"
            onClick={() => setConfirmFinish(true)}
            className="press h-10 shrink-0 rounded-full bg-accent px-4 text-[17px] font-medium text-on-accent"
          >
            Ukončiť
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 border-b border-line px-4 py-3.5" aria-label="Priebeh tréningu">
        <div>
          <p className="text-[14px] text-muted">{paused ? 'Pozastavené' : 'Trvanie'}</p>
          <p className="t-num mt-1.5 text-[22px] text-accent-ink" aria-label="Čas tréningu">
            {fmtClock(elapsedSeconds(session, now))}
          </p>
        </div>
        <div>
          <p className="text-[14px] text-muted">Objem</p>
          <p className="t-num mt-1.5 text-[22px]">{fmtVolume(workoutVolume(session.exercises))}</p>
        </div>
        <div>
          <p className="text-[14px] text-muted">Série</p>
          <p className="t-num mt-1.5 text-[22px]">{doneSets}</p>
        </div>
      </div>

      <RestBar session={session} settings={settings} onChange={(iso) => update((s) => ({ ...s, restEndsAt: iso }))} />

      <div className="flex flex-col gap-9 px-4 pb-6 pt-5">
        {error && <ErrorNote>{error}</ErrorNote>}
        {session.exercises.length === 0 && (
          <EmptyState title="Prázdny tréning" hint="Pridaj cviky a začni zapisovať série." />
        )}
        {session.exercises.map((we, i) => {
          const sid = we.supersetId;
          const samePrev = !!sid && session.exercises[i - 1]?.supersetId === sid;
          const sameNext = !!sid && session.exercises[i + 1]?.supersetId === sid;
          return (
            <ExerciseSection
              key={we.id}
              we={we}
              displayName={lib.nameOf(we.exerciseId, we.exerciseName)}
              imageCount={lib.byId(we.exerciseId)?.images ?? 0}
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

        <div className="flex flex-col gap-3">
          <Button variant="primary" block onClick={() => setPicker(true)}>
            <PlusIcon size={20} />
            Pridať cvik
          </Button>
          {session.exercises.length > 1 && (
            <Button block onClick={() => setReorderOpen(true)}>
              Zmeniť poradie cvikov
            </Button>
          )}
        </div>

        <label className="block">
          <span className="t-label mb-2 block">Poznámka k tréningu</span>
          <textarea
            className="field min-h-[80px]"
            value={session.note}
            onChange={(e) => update((s) => ({ ...s, note: e.target.value }))}
          />
        </label>

        <div>
          <p className="mb-3 text-center text-[13px] text-muted">
            Ťuk na číslo série: typ (pracovná, zahrievacia, drop), poznámka, odstránenie. Zahrievacie série sa nezapočítavajú do objemu ani rekordov.
          </p>
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
            <p className="t-num mb-2 text-[18px]">
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
  onChange,
}: {
  session: WorkoutSession;
  settings: AppSettings;
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

  if (remaining === null || end === null) return null;
  const shift = (sec: number) => onChange(new Date(end + sec * 1000).toISOString());
  return (
    <div className="sticky top-[calc(60px+env(safe-area-inset-top))] z-10 bg-bg/85 px-4 py-2 backdrop-blur-xl">
      <div
        role="timer"
        aria-live="off"
        className={`flex items-center gap-3 rounded-xl px-4 py-2 ${over ? 'bg-good text-white' : 'bg-surface'}`}
      >
        <TimerIcon size={22} />
        <p className={`t-num min-w-[64px] text-[26px] ${over ? '' : 'text-accent-ink'}`} aria-label={over ? 'Prestávka skončila' : 'Zostávajúci čas prestávky'}>
          {over ? '0:00' : fmtClock(remaining)}
        </p>
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={() => shift(-15)} aria-label="Skrátiť o 15 sekúnd" className="press h-9 rounded-lg bg-raised px-3 text-[15px]">
            −15
          </button>
          <button type="button" onClick={() => shift(15)} aria-label="Predĺžiť o 15 sekúnd" className="press h-9 rounded-lg bg-raised px-3 text-[15px]">
            +15
          </button>
          <button type="button" onClick={() => onChange(null)} className={`press h-9 rounded-lg px-3 text-[15px] ${over ? 'bg-white/25' : 'bg-raised'}`}>
            {over ? 'Hotovo' : 'Preskočiť'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Cvik a série ---------------------------------------------------------

const TYPE_LABEL: Record<SetType, string> = { working: 'Pracovná', warmup: 'Zahrievacia', drop: 'Drop set' };

type SupersetPos = 'first' | 'middle' | 'last' | null;

function ExerciseSection({
  we,
  displayName,
  imageCount,
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
  imageCount: number;
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
  const cols = 'grid-cols-[38px_1fr_78px_78px_38px]';

  return (
    <section
      aria-label={displayName}
      className={`${supersetPos ? 'border-l-2 border-accent pl-3' : ''} ${
        supersetPos === 'first' || supersetPos === 'middle' ? '-mb-5' : ''
      }`}
    >
      {supersetPos === 'first' && <p className="t-label mb-2 !text-accent-ink">Superset</p>}
      <div className="flex items-center gap-3">
        <Link to={`/cviky/${encodeURIComponent(we.exerciseId)}`} aria-label={`Detail cviku ${displayName}`}>
          <ExerciseAvatar id={we.exerciseId} count={imageCount} />
        </Link>
        <Link to={`/cviky/${encodeURIComponent(we.exerciseId)}`} className="min-w-0 flex-1 text-[20px] leading-tight text-accent-ink">
          {displayName}
        </Link>
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label={`Možnosti cviku ${displayName}`}
          className="press -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        >
          <MoreVerticalIcon />
        </button>
      </div>

      <input
        aria-label={`Poznámka ku cviku ${displayName}`}
        placeholder="Pridať poznámku…"
        value={we.note}
        onChange={(e) => onChange((x) => ({ ...x, note: e.target.value }))}
        className="mt-3 w-full bg-transparent py-1 text-[17px] text-ink placeholder:text-muted focus:outline-none"
      />

      {suggestion && we.sets.some((s) => !s.done && s.type !== 'warmup' && (s.weight === null || s.reps === null)) && (
        <button type="button" onClick={applySuggestion} className="press mt-2 flex w-full items-center gap-2 py-1 text-left text-[16px] text-accent-ink">
          <TimerIcon size={20} />
          <span>
            Návrh: {fmtNumber(suggestion.weight)} kg × {suggestion.reps}
            <span className="text-muted"> · {suggestion.reason}</span>
          </span>
        </button>
      )}

      <div className={`t-label mb-2 mt-4 grid ${cols} items-center gap-2 px-1 text-center`}>
        <span>Sér.</span>
        <span>Minule</span>
        <span>{'kg'}</span>
        <span>Opak.</span>
        <span className="flex justify-center">
          <CheckIcon size={16} />
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {we.sets.map((s) => {
          if (s.type !== 'warmup') workingNo += 1;
          const label = s.type === 'warmup' ? 'Z' : s.type === 'drop' ? 'D' : String(workingNo);
          const prev = prevFor(s);
          const effortKey = settings.effortMode;
          return (
            <li key={s.id} className={`rounded-lg px-1 py-[3px] transition-colors ${s.done ? 'bg-good/15' : ''}`}>
              <div className={`grid ${cols} items-center gap-2`}>
                <button
                  type="button"
                  onClick={() => setEditSet(s.id)}
                  aria-label={`Séria ${label}, typ: ${TYPE_LABEL[s.type]}. Ťuknutím zmeníš typ, poznámku alebo sériu odstrániš.`}
                  className={`press relative h-[38px] rounded-lg text-[18px] font-medium ${
                    s.type === 'warmup' ? 'bg-raised text-warn' : s.type === 'drop' ? 'bg-raised text-accent-ink' : 'bg-raised'
                  }`}
                >
                  {label}
                  {s.note && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent-ink" />}
                </button>
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => prev && setSet(s.id, { weight: prev.weight, reps: prev.reps })}
                  aria-label={prev ? `Použiť minulý výkon ${fmtNumber(prev.weight ?? 0)} kg × ${prev.reps}` : 'Bez minulého výkonu'}
                  className="t-num h-[38px] whitespace-nowrap text-[16px] text-muted disabled:opacity-40"
                >
                  {prev ? `${fmtNumber(prev.weight ?? 0)}kg × ${prev.reps}` : '–'}
                </button>
                <NumberField
                  decimal
                  label={`Váha v kg, séria ${label}`}
                  value={s.weight}
                  placeholder={prev?.weight != null ? fmtNumber(prev.weight) : ''}
                  max={999}
                  onChange={(v) => setSet(s.id, { weight: v })}
                  className="h-[38px] w-full text-[19px]"
                />
                <NumberField
                  label={`Opakovania, séria ${label}`}
                  value={s.reps}
                  placeholder={prev?.reps != null ? String(prev.reps) : ''}
                  max={999}
                  onChange={(v) => setSet(s.id, { reps: v })}
                  className="h-[38px] w-full text-[19px]"
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
                  className={`press flex h-[38px] items-center justify-center rounded-lg ${s.done ? 'bg-good text-white' : 'bg-raised text-muted'}`}
                >
                  <span className={s.done ? 'animate-pop' : ''}>
                    <CheckIcon size={22} />
                  </span>
                </button>
              </div>
              {settings.showEffort && (
                <div className="mt-1.5 flex items-center justify-end gap-2 pr-1">
                  <span className="text-[14px] text-muted">{effortKey === 'rpe' ? 'RPE' : 'RIR'}</span>
                  <NumberField
                    decimal={effortKey === 'rpe'}
                    label={`${effortKey === 'rpe' ? 'RPE' : 'RIR'}, séria ${label}`}
                    value={s[effortKey]}
                    max={10}
                    placeholder="–"
                    onChange={(v) => setSet(s.id, { [effortKey]: v })}
                    className="h-[34px] w-16 text-[17px]"
                  />
                </div>
              )}
              {s.note && <p className="mt-1 px-1 text-[14px] text-muted">{s.note}</p>}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onChange((e) => ({ ...e, sets: [...e.sets, newSet()] }))}
        className="press mt-3 flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-surface text-[17px]"
      >
        <PlusIcon size={20} />
        Pridať sériu
      </button>

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
              <span className="t-label mb-2 block">Poznámka k sérii</span>
              <textarea className="field !bg-raised min-h-[80px]" value={editing.note ?? ''} onChange={(e) => setSet(editing.id, { note: e.target.value })} />
            </label>
            <p className="mb-4 text-[14px] text-muted">Zahrievacie série sa nezapočítavajú do objemu ani rekordov.</p>
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
        <div className="flex flex-col gap-2.5">
          <Button
            onClick={() => {
              setMenu(false);
              setPlates(true);
            }}
            className="!bg-raised"
          >
            Kalkulačka kotúčov
          </Button>
          <Button
            disabled={we.sets.length === 0}
            className="!bg-raised"
            onClick={() => {
              onChange((e) => {
                const l = e.sets[e.sets.length - 1];
                return { ...e, sets: [...e.sets, newSet({ type: l.type, weight: l.weight, reps: l.reps })] };
              });
              setMenu(false);
            }}
          >
            Duplikovať poslednú sériu
          </Button>
          {canLink && (
            <Button onClick={onToggleLink} className="!bg-raised">
              {linkedToNext ? 'Zrušiť superset s nasledujúcim' : 'Superset s nasledujúcim cvikom'}
            </Button>
          )}
          {total > 1 && (
            <Button
              className="!bg-raised"
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
        </div>
      </Sheet>
      <Sheet open={plates} onClose={() => setPlates(false)} title="Kalkulačka kotúčov">
        <PlateCalculator settings={settings} initial={we.sets.find((x) => !x.done && x.weight)?.weight ?? suggestion?.weight ?? null} />
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
    </section>
  );
}
