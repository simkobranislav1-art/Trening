import { BUILTIN_EXERCISES } from './exercises';
import { uid } from './format';
import type { BodyEntry, CustomExercise, Routine, SetType, WorkoutExercise, WorkoutSession, WorkoutSet } from './types';

/**
 * Import exportu z Hevy (Nastavenia → Export & Import Data → Export Data).
 * Súbory: workout_data.csv (tréningy) a voliteľne measurement_data.csv (telesné miery).
 *
 * ID sú odvodené z dátumu tréningu, takže opakovaný import nič nezdvojí.
 */

// --- CSV --------------------------------------------------------------------

/** Minimálny RFC 4180 parser: úvodzovky, zdvojené úvodzovky, nové riadky v poliach, BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

function toRecords(text: string): Record<string, string>[] {
  const [header, ...body] = parseCsv(text);
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "20 Mar 2026, 20:51" → Date v miestnom čase; neplatný vstup → null. */
export function parseHevyDate(s: string): Date | null {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  const d = new Date(Number(m[3]), month, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

const localDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// --- Mapovanie cvikov ---------------------------------------------------------

type Known = { id: string } | { name: string; muscle: string; equipment: string; unilateral?: boolean; hint?: string };

/** Cviky z Hevy, ktoré zodpovedajú cvikom v našej knižnici (`id`), alebo ktoré sa založia ako vlastné. */
const KNOWN: Record<string, Known> = {
  'Bench Press (Barbell)': { id: 'fed-barbell-bench-press-medium-grip' },
  'Incline Bench Press (Barbell)': { id: 'fed-barbell-incline-bench-press-medium-grip' },
  'Incline Bench Press (Dumbbell)': { id: 'fed-incline-dumbbell-press' },
  'Butterfly (Pec Deck)': { id: 'fed-butterfly' },
  'Chest Fly (Machine)': { id: 'fed-butterfly' },
  'Chest Press (Machine)': { id: 'fed-leverage-chest-press' },
  'Cable Fly Crossovers': { id: 'fed-cable-crossover' },
  'Triceps Rope Pushdown': { id: 'fed-triceps-pushdown-rope-attachment' },
  'Lat Pulldown (Cable)': { id: 'fed-wide-grip-lat-pulldown' },
  'Seated Cable Row - Bar Grip': { id: 'fed-seated-cable-rows' },
  'Seated Cable Row - V Grip (Cable)': { id: 'fed-seated-cable-rows' },
  'Rope Straight Arm Pulldown': { id: 'fed-straight-arm-pulldown' },
  'Rear Delt Reverse Fly (Machine)': { id: 'fed-reverse-machine-flyes' },
  'Seated Shoulder Press (Machine)': { id: 'fed-machine-shoulder-military-press' },
  'Lateral Raise (Dumbbell)': { id: 'fed-side-lateral-raise' },
  'Front Raise (Dumbbell)': { id: 'fed-front-dumbbell-raise' },
  'Shrug (Barbell)': { id: 'fed-barbell-shrug' },
  'EZ Bar Biceps Curl': { id: 'fed-ez-bar-curl' },
  'Seated Incline Curl (Dumbbell)': { id: 'fed-incline-dumbbell-curl' },
  'Hammer Curl (Cable)': { id: 'fed-cable-hammer-curls-rope-attachment' },
  'Hack Squat (Machine)': { id: 'fed-hack-squat' },
  'Leg Extension (Machine)': { id: 'fed-leg-extensions' },
  'Lying Leg Curl (Machine)': { id: 'fed-lying-leg-curls' },
  'Seated Leg Curl (Machine)': { id: 'fed-seated-leg-curl' },
  'Leg Press Horizontal (Machine)': { id: 'fed-leg-press' },
  'Lunge (Dumbbell)': { id: 'fed-dumbbell-lunges' },

  'Triceps Dip': { name: 'Dipy na triceps', muscle: 'triceps', equipment: 'bodyweight' },
  'Single Arm Triceps Pushdown (Cable)': { name: 'Tricepsové sťahovanie jednou rukou (kladka)', muscle: 'triceps', equipment: 'cable', unilateral: true },
  'Overhead Triceps Extension (Cable)': { name: 'Tricepsová extenzia nad hlavou (kladka)', muscle: 'triceps', equipment: 'cable' },
  'Triceps Kickback (Dumbbell)': { name: 'Tricepsový kickback s jednoručkou', muscle: 'triceps', equipment: 'dumbbell', unilateral: true },
  'Pull Up (Assisted)': { name: 'Zhyby s asistenciou', muscle: 'lats', equipment: 'machine', hint: 'Zadaná váha je pomoc stroja (asistencia), nie záťaž.' },
  'Chin Up (Assisted)': { name: 'Zhyby podchvatom s asistenciou', muscle: 'lats', equipment: 'machine', hint: 'Zadaná váha je pomoc stroja (asistencia), nie záťaž.' },
  'Vertical Traction (Machine)': { name: 'Vertikálny ťah na stroji', muscle: 'lats', equipment: 'machine' },
  'Bicep Curl (Cable)': { name: 'Bicepsový curl na kladke', muscle: 'biceps', equipment: 'cable' },
  'Preacher Curl (Machine)': { name: 'Curl na Scottovom stroji', muscle: 'biceps', equipment: 'machine' },
  'Reverse Grip Concentration Curl': { name: 'Koncentračný curl opačným úchopom', muscle: 'biceps', equipment: 'dumbbell', unilateral: true },
  'Seated Palms Up Wrist Curl': { name: 'Zdvih zápästí v sede (podchvat)', muscle: 'forearms', equipment: 'other' },
  'Calf Press (Machine)': { name: 'Výpony na lýtka na leg-presse', muscle: 'calves', equipment: 'machine' },
  'Single Leg Standing Calf Raise (Machine)': { name: 'Výpony na lýtka v stoji na jednej nohe (stroj)', muscle: 'calves', equipment: 'machine', unilateral: true },
  'Crunch (Machine)': { name: 'Skracovanie na stroji (crunch)', muscle: 'abdominals', equipment: 'machine' },
};

const MUSCLE_HINTS: [RegExp, string][] = [
  [/triceps|dip|pushdown|kickback/i, 'triceps'],
  [/bicep|curl(?!.*wrist)/i, 'biceps'],
  [/wrist|forearm/i, 'forearms'],
  [/calf/i, 'calves'],
  [/leg curl|hamstring|deadlift/i, 'hamstrings'],
  [/squat|leg press|leg extension|lunge|quad/i, 'quadriceps'],
  [/glute|hip thrust/i, 'glutes'],
  [/shrug/i, 'traps'],
  [/lat |pulldown|pull up|chin up|row|traction/i, 'lats'],
  [/shoulder|raise|delt|overhead press|military/i, 'shoulders'],
  [/crunch|sit.?up|plank|abs?\b/i, 'abdominals'],
  [/bench|chest|fly|pec|push.?up|crossover/i, 'chest'],
];

const EQUIPMENT_HINTS: [RegExp, string][] = [
  [/\(barbell\)|barbell/i, 'barbell'],
  [/\(dumbbell\)|dumbbell/i, 'dumbbell'],
  [/\(cable\)|cable|rope/i, 'cable'],
  [/\(machine\)|machine|pec deck|assisted/i, 'machine'],
  [/kettlebell/i, 'kettlebell'],
  [/ez.?bar/i, 'ez-bar'],
];

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const nonEmpty = (s: string | undefined): string | undefined => (s && s.trim() !== '' ? s.trim() : undefined);

const num = (s: string | undefined): number | null => {
  const t = nonEmpty(s);
  if (t === undefined) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

function resolveExercise(title: string, now: string): { id: string; name: string; custom?: CustomExercise } {
  const known = KNOWN[title];
  if (known && 'id' in known) return { id: known.id, name: BUILTIN_EXERCISES.find((e) => e.id === known.id)?.name ?? title };
  const id = `hevy-${slug(title)}`;
  const name = known?.name ?? title;
  const muscle = known?.muscle ?? MUSCLE_HINTS.find(([re]) => re.test(title))?.[1] ?? 'chest';
  const equipment = known?.equipment ?? EQUIPMENT_HINTS.find(([re]) => re.test(title))?.[1] ?? 'other';
  return {
    id,
    name,
    custom: {
      id,
      name,
      primaryMuscle: muscle,
      secondaryMuscles: [],
      equipment,
      category: 'strength',
      instructions: known?.hint ? [known.hint] : [],
      unilateral: known?.unilateral ?? /single|one.?arm|unilateral/i.test(title),
      createdAt: now,
      updatedAt: now,
    },
  };
}

// --- Zostavenie dát ----------------------------------------------------------

export interface HevyImportData {
  sessions: WorkoutSession[];
  customExercises: CustomExercise[];
  bodyEntries: BodyEntry[];
  /** Rutiny odvodené z najčastejších cvikov každého názvu tréningu (Chest, Legs…). */
  routines: Routine[];
  warnings: string[];
  /** Koľko rôznych cvikov z Hevy sa priradilo ku knižnici a koľko vzniklo ako vlastné. */
  matched: number;
  created: number;
  sets: number;
  firstDate: string | null;
  lastDate: string | null;
}

const SET_TYPES: Record<string, SetType> = { warmup: 'warmup', dropset: 'drop', normal: 'working', failure: 'working' };

export function buildFromHevy(workoutCsv: string, measurementCsv?: string | null, nowIso = new Date().toISOString()): HevyImportData {
  const warnings: string[] = [];
  const records = toRecords(workoutCsv);
  if (records.length > 0 && !('exercise_title' in records[0] && 'start_time' in records[0])) {
    throw new Error('Súbor nevyzerá ako workout_data.csv z Hevy (chýbajú stĺpce exercise_title a start_time).');
  }

  const customs = new Map<string, CustomExercise>();
  const matchedTitles = new Set<string>();
  const createdTitles = new Set<string>();
  const byWorkout = new Map<string, Record<string, string>[]>();
  for (const r of records) {
    const key = `${r.start_time}|${r.title}`;
    byWorkout.set(key, [...(byWorkout.get(key) ?? []), r]);
  }

  let skippedSets = 0;
  let badDates = 0;
  let setCount = 0;
  const sessions: WorkoutSession[] = [];

  for (const rows of byWorkout.values()) {
    const first = rows[0];
    const start = parseHevyDate(first.start_time);
    if (!start) {
      badDates++;
      continue;
    }
    const end = parseHevyDate(first.end_time) ?? start;
    const startedAt = start.toISOString();
    const endedAt = (end.getTime() >= start.getTime() ? end : start).toISOString();
    const sid = `hevy-${startedAt}`;

    // cviky v poradí prvého výskytu
    const order: string[] = [];
    const perExercise = new Map<string, Record<string, string>[]>();
    for (const r of rows) {
      const k = `${r.exercise_title}|${r.superset_id}`;
      if (!perExercise.has(k)) order.push(k);
      perExercise.set(k, [...(perExercise.get(k) ?? []), r]);
    }

    const supersetIds = new Map<string, string>();
    const exercises: WorkoutExercise[] = [];
    order.forEach((k, ei) => {
      const list = perExercise.get(k)!;
      const title = list[0].exercise_title;
      const res = resolveExercise(title, nowIso);
      const sets: WorkoutSet[] = [];
      [...list]
        .sort((a, b) => Number(a.set_index) - Number(b.set_index))
        .forEach((r, si) => {
          const reps = num(r.reps);
          if (!reps || reps <= 0) {
            skippedSets++;
            return;
          }
          const rpe = num(r.rpe);
          sets.push({
            id: `${sid}-e${ei}-s${si}`,
            type: SET_TYPES[r.set_type] ?? 'working',
            weight: num(r.weight_kg),
            reps,
            rpe,
            rir: null,
            done: true,
            completedAt: endedAt,
          });
        });
      if (sets.length === 0) return;
      setCount += sets.length;
      if (res.custom) {
        customs.set(res.id, res.custom);
        createdTitles.add(title);
      } else matchedTitles.add(title);

      const ss = nonEmpty(list[0].superset_id);
      let supersetId: string | null = null;
      if (ss) {
        if (!supersetIds.has(ss)) supersetIds.set(ss, uid());
        supersetId = supersetIds.get(ss)!;
      }
      exercises.push({
        id: `${sid}-e${ei}`,
        exerciseId: res.id,
        exerciseName: res.name,
        note: list[0].exercise_notes ?? '',
        sets,
        supersetId,
      });
    });

    if (exercises.length === 0) continue;
    // superset s jediným cvikom nie je superset
    for (const e of exercises) {
      if (e.supersetId && exercises.filter((x) => x.supersetId === e.supersetId).length < 2) e.supersetId = null;
    }
    sessions.push({
      id: sid,
      routineId: null,
      name: first.title || 'Tréning',
      note: first.description ?? '',
      status: 'finished',
      startedAt,
      endedAt,
      pausedAt: null,
      pausedMs: 0,
      restEndsAt: null,
      durationSec: Math.max(0, (Date.parse(endedAt) - Date.parse(startedAt)) / 1000),
      updatedAt: endedAt,
      exercises,
    });
  }
  sessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  // Rutiny: podľa názvu tréningu. Cvik patrí do rutiny, ak sa v takých tréningoch opakuje
  // (aspoň v 40 % z nich, minimálne dvakrát); počet sérií je medián, poradie podľa priemernej pozície.
  const routines: Routine[] = [];
  const titles = [...new Set(sessions.map((s) => s.name))];
  for (const name of titles) {
    const same = sessions.filter((s) => s.name === name);
    const need = Math.min(same.length, Math.max(2, Math.ceil(same.length * 0.4)));
    const stats = new Map<string, { name: string; sets: number[]; positions: number[] }>();
    for (const sess of same) {
      const seen = new Set<string>();
      sess.exercises.forEach((e, pos) => {
        if (seen.has(e.exerciseId)) return;
        seen.add(e.exerciseId);
        const st = stats.get(e.exerciseId) ?? { name: e.exerciseName, sets: [], positions: [] };
        st.sets.push(e.sets.length);
        st.positions.push(pos);
        stats.set(e.exerciseId, st);
      });
    }
    let chosen = [...stats.entries()]
      .filter(([, st]) => st.sets.length >= need)
      .map(([exerciseId, st]) => {
        const sorted = [...st.sets].sort((x, y) => x - y);
        return {
          exerciseId,
          exerciseName: st.name,
          sets: sorted[Math.ceil(sorted.length / 2) - 1],
          pos: st.positions.reduce((x, y) => x + y, 0) / st.positions.length,
        };
      })
      .sort((x, y) => x.pos - y.pos);
    if (chosen.length === 0) {
      // príliš rôznorodé tréningy: použi posledný
      chosen = same[same.length - 1].exercises.map((e, i) => ({ exerciseId: e.exerciseId, exerciseName: e.exerciseName, sets: e.sets.length, pos: i }));
    }
    const id = `hevy-routine-${slug(name) || 'trening'}`;
    routines.push({
      id,
      name,
      note: 'Vytvorené z importu z Hevy podľa najčastejších cvikov.',
      exercises: chosen.map((e, i) => ({
        id: `${id}-${i}`,
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sets: Math.max(1, e.sets),
        note: '',
        supersetId: null,
      })),
      isSample: false,
      createdAt: same[0].startedAt,
      updatedAt: nowIso,
    });
  }

  if (badDates) warnings.push(`${badDates} tréningov sa preskočilo kvôli nečitateľnému dátumu.`);
  if (skippedSets) warnings.push(`${skippedSets} sérií bez opakovaní (napr. časové alebo prázdne) sa preskočilo.`);

  const bodyEntries: BodyEntry[] = [];
  if (measurementCsv && measurementCsv.trim() !== '') {
    for (const r of toRecords(measurementCsv)) {
      const d = parseHevyDate(r.date);
      if (!d) continue;
      const avg = (a: string | undefined, b: string | undefined): number | null => {
        const vals = [num(a), num(b)].filter((x): x is number => x !== null);
        return vals.length ? Math.round((vals.reduce((s, x) => s + x, 0) / vals.length) * 10) / 10 : null;
      };
      const date = localDate(d);
      const entry: BodyEntry = {
        id: `hevy-body-${date}`,
        date,
        weight: num(r.weight_kg),
        bodyFat: num(r.fat_percent),
        waist: num(r.waist_cm),
        chest: num(r.chest_cm),
        arm: avg(r.left_bicep_cm, r.right_bicep_cm),
        thigh: avg(r.left_thigh_cm, r.right_thigh_cm),
        note: 'Import z Hevy',
        updatedAt: nowIso,
      };
      if ([entry.weight, entry.bodyFat, entry.waist, entry.chest, entry.arm, entry.thigh].some((v) => v !== null)) bodyEntries.push(entry);
    }
  }

  return {
    sessions,
    customExercises: [...customs.values()],
    bodyEntries,
    routines,
    warnings,
    matched: matchedTitles.size,
    created: createdTitles.size,
    sets: setCount,
    firstDate: sessions[0]?.startedAt ?? null,
    lastDate: sessions[sessions.length - 1]?.startedAt ?? null,
  };
}
