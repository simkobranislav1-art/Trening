import { BUILTIN_EXERCISES } from './exercises';
import { uid } from './format';
import type { Routine } from './types';

const SAMPLES: { name: string; note: string; items: [string, number][] }[] = [
  {
    name: 'Push',
    note: 'Ukážková rutina: tlaky – hruď, ramená, triceps.',
    items: [
      ['fed-barbell-bench-press-medium-grip', 4],
      ['fed-incline-dumbbell-press', 3],
      ['fed-dumbbell-shoulder-press', 3],
      ['fed-side-lateral-raise', 3],
      ['fed-triceps-pushdown', 3],
    ],
  },
  {
    name: 'Pull',
    note: 'Ukážková rutina: ťahy – chrbát, biceps.',
    items: [
      ['fed-pullups', 4],
      ['fed-bent-over-barbell-row', 4],
      ['fed-seated-cable-rows', 3],
      ['fed-face-pull', 3],
      ['fed-barbell-curl', 3],
    ],
  },
  {
    name: 'Legs',
    note: 'Ukážková rutina: nohy.',
    items: [
      ['fed-barbell-squat', 4],
      ['fed-romanian-deadlift', 3],
      ['fed-leg-press', 3],
      ['fed-lying-leg-curls', 3],
      ['fed-standing-calf-raises', 4],
    ],
  },
];

export function sampleRoutines(now = new Date()): Routine[] {
  return SAMPLES.map((s, i) => {
    const stamp = new Date(now.getTime() + i).toISOString();
    return {
      id: uid(),
      name: s.name,
      note: s.note,
      isSample: true,
      createdAt: stamp,
      updatedAt: stamp,
      exercises: s.items.map(([exerciseId, sets]) => {
        const ex = BUILTIN_EXERCISES.find((e) => e.id === exerciseId);
        if (!ex) throw new Error(`Chýba cvik ${exerciseId}`);
        return { id: uid(), exerciseId, exerciseName: ex.name, sets, note: '' };
      }),
    };
  });
}
