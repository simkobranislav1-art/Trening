import raw from '../data/exercises.json';
import type { CustomExercise, Exercise } from './types';

/** Vstavaná knižnica: výber z Free Exercise DB (Unlicense / public domain), preložený do slovenčiny. */
export const BUILTIN_EXERCISES: Exercise[] = (raw as Omit<Exercise, 'custom'>[]).map((e) => ({ ...e, custom: false }));

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Hruď',
  shoulders: 'Ramená',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Predlaktia',
  lats: 'Široký sval chrbta',
  'middle back': 'Stredný chrbát',
  'lower back': 'Driek',
  traps: 'Trapézy',
  neck: 'Krk',
  quadriceps: 'Štvorhlavý sval',
  hamstrings: 'Zadné stehná',
  glutes: 'Sedacie svaly',
  calves: 'Lýtka',
  adductors: 'Prítahovače',
  abductors: 'Odťahovače',
  abdominals: 'Brucho',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Činka',
  dumbbell: 'Jednoručky',
  machine: 'Stroj',
  cable: 'Kladka',
  bodyweight: 'Vlastná váha',
  kettlebell: 'Kettlebell',
  'ez-bar': 'EZ tyč',
  bands: 'Gumy',
  other: 'Iné',
};

export const CATEGORY_LABELS: Record<string, string> = {
  strength: 'Silový',
  cardio: 'Kardio',
  stretching: 'Naťahovací',
  plyometrics: 'Plyometrický',
  powerlifting: 'Silový trojboj',
  strongman: 'Strongman',
  'olympic weightlifting': 'Vzpieranie',
};

export const muscleLabel = (id: string): string => MUSCLE_LABELS[id] ?? id;
export const equipmentLabel = (id: string): string => EQUIPMENT_LABELS[id] ?? id;
export const categoryLabel = (id: string): string => CATEGORY_LABELS[id] ?? id;

export const toExercise = (c: CustomExercise): Exercise => ({
  id: c.id,
  name: c.name,
  primaryMuscle: c.primaryMuscle,
  secondaryMuscles: c.secondaryMuscles,
  equipment: c.equipment,
  category: c.category,
  instructions: c.instructions,
  unilateral: c.unilateral,
  custom: true,
});

/** Všetky cviky (vstavané + vlastné) zoradené podľa názvu; skryté sú označené v `hidden`. */
export function buildLibrary(custom: CustomExercise[]): Exercise[] {
  return [...BUILTIN_EXERCISES, ...custom.map(toExercise)].sort((a, b) => a.name.localeCompare(b.name, 'sk'));
}

export interface ExerciseFilter {
  query: string;
  muscle: string | null;
  equipment: string | null;
}

const normalize = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterExercises(list: Exercise[], f: ExerciseFilter): Exercise[] {
  const q = normalize(f.query.trim());
  return list.filter(
    (e) =>
      (!f.muscle || e.primaryMuscle === f.muscle) &&
      (!f.equipment || e.equipment === f.equipment) &&
      (!q ||
        normalize(e.name).includes(q) ||
        (e.nameEn !== undefined && normalize(e.nameEn).includes(q)) ||
        normalize(muscleLabel(e.primaryMuscle)).includes(q)),
  );
}
