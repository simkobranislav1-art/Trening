import { describe, expect, it } from 'vitest';
import { finalizeSession, moveItem, newSession, newSet, newWorkoutExercise, pauseSession, resumeSession, elapsedSeconds } from './workout';

describe('workout', () => {
  it('moveItem posúva prvky a ignoruje okraje', () => {
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });

  it('finalizeSession zahodí nedokončené série aj prázdne cviky', () => {
    const s = newSession('T', [newWorkoutExercise({ id: 'a', name: 'A' }, 2), newWorkoutExercise({ id: 'b', name: 'B' }, 1)]);
    s.exercises[0].sets[0] = newSet({ weight: 50, reps: 10, done: true });
    const done = finalizeSession(s)!;
    expect(done.status).toBe('finished');
    expect(done.exercises).toHaveLength(1);
    expect(done.exercises[0].sets).toHaveLength(1);
    expect(done.durationSec).not.toBeNull();
  });

  it('finalizeSession vráti null, ak nie je čo uložiť', () => {
    expect(finalizeSession(newSession('T', [newWorkoutExercise({ id: 'a', name: 'A' })]))).toBeNull();
  });

  it('pozastavenie zastaví čas a pokračovanie ho nezapočíta', () => {
    const s = newSession('T', []);
    s.startedAt = new Date(Date.now() - 100_000).toISOString();
    const paused = { ...pauseSession(s), pausedAt: new Date(Date.now() - 40_000).toISOString() };
    expect(elapsedSeconds(paused, Date.now())).toBeCloseTo(60, 0);
    const resumed = resumeSession(paused);
    expect(resumed.pausedMs).toBeGreaterThanOrEqual(39_000);
    expect(elapsedSeconds(resumed, Date.now())).toBeCloseTo(60, 0);
  });
});
