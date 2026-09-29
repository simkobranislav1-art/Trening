import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { FitnessDB } from '../db/db';
import { importHevyData } from '../db/repo';
import { buildFromHevy, parseCsv, parseHevyDate } from './hevyImport';

// Vymyslené dáta v rovnakom formáte, aký exportuje Hevy.
const HEADER = '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';
const WORKOUT = [
  HEADER,
  '"Chest","20 Mar 2026, 20:51","20 Mar 2026, 21:31","Dobrý deň, ""ťažký""","Bench Press (Barbell)",,"pomaly",0,"warmup",20,10,,,',
  '"Chest","20 Mar 2026, 20:51","20 Mar 2026, 21:31","Dobrý deň, ""ťažký""","Bench Press (Barbell)",,"pomaly",1,"normal",80,8,,,8',
  '"Chest","20 Mar 2026, 20:51","20 Mar 2026, 21:31","Dobrý deň, ""ťažký""","Triceps Dip",1,"",0,"normal",,15,,,',
  '"Chest","20 Mar 2026, 20:51","20 Mar 2026, 21:31","Dobrý deň, ""ťažký""","Bicep Curl (Cable)",1,"",0,"dropset",30,12,,,',
  '"Chest","20 Mar 2026, 20:51","20 Mar 2026, 21:31","Dobrý deň, ""ťažký""","Plank",,"",0,"normal",,,,60,',
  '"Legs","18 Mar 2026, 10:00","18 Mar 2026, 10:45","","Hack Squat (Machine)",,"",0,"normal",100,10,,,',
].join('\n');
const MEASURE = [
  '"date","weight_kg","fat_percent","neck_cm","shoulder_cm","chest_cm","left_bicep_cm","right_bicep_cm","left_forearm_cm","right_forearm_cm","abdomen_cm","waist_cm","hips_cm","left_thigh_cm","right_thigh_cm","left_calf_cm","right_calf_cm"',
  '"31 Jan 2026, 00:00",79,15,,,101,34,36,,,,85,,60,62,,',
].join('\r\n');

describe('CSV a dátumy', () => {
  it('parsuje úvodzovky, čiarky a nové riadky v poliach', () => {
    expect(parseCsv('"a","b,c","d ""e"""\n"1","2\n3",4')).toEqual([
      ['a', 'b,c', 'd "e"'],
      ['1', '2\n3', '4'],
    ]);
  });
  it('číta anglické dátumy v miestnom čase', () => {
    const d = parseHevyDate('20 Mar 2026, 20:51')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 2, 20, 20, 51]);
    expect(parseHevyDate('nesmysel')).toBeNull();
  });
});

describe('zostavenie z exportu Hevy', () => {
  const data = buildFromHevy(WORKOUT, MEASURE, '2026-09-29T10:00:00.000Z');

  it('vytvorí tréningy zoradené od najstaršieho', () => {
    expect(data.sessions.map((s) => s.name)).toEqual(['Legs', 'Chest']);
    const chest = data.sessions[1];
    expect(chest.note).toBe('Dobrý deň, "ťažký"');
    expect(chest.durationSec).toBe(40 * 60);
    expect(chest.status).toBe('finished');
  });

  it('priradí známe cviky ku knižnici a ostatné založí ako vlastné', () => {
    const chest = data.sessions[1];
    expect(chest.exercises[0].exerciseId).toBe('fed-barbell-bench-press-medium-grip');
    expect(data.sessions[0].exercises[0].exerciseId).toBe('fed-hack-squat');
    expect(data.customExercises.map((c) => c.name).sort()).toEqual(['Bicepsový curl na kladke', 'Dipy na triceps']);
  });

  it('prevedie typy sérií, RPE, poznámky a prázdnu váhu', () => {
    const [bench, dip, curl] = data.sessions[1].exercises;
    expect(bench.sets.map((s) => s.type)).toEqual(['warmup', 'working']);
    expect(bench.sets[1]).toMatchObject({ weight: 80, reps: 8, rpe: 8, done: true });
    expect(bench.note).toBe('pomaly');
    expect(dip.sets[0]).toMatchObject({ weight: null, reps: 15 });
    expect(curl.sets[0].type).toBe('drop');
  });

  it('spojí cviky s rovnakým superset_id a preskočí série bez opakovaní', () => {
    const [, dip, curl] = data.sessions[1].exercises;
    expect(dip.supersetId).toBeTruthy();
    expect(dip.supersetId).toBe(curl.supersetId);
    expect(data.sessions[1].exercises.some((e) => e.exerciseName === 'Plank')).toBe(false);
    expect(data.warnings.join(' ')).toContain('1 sérií');
  });

  it('prevedie telesné miery (priemer ľavej a pravej strany)', () => {
    expect(data.bodyEntries).toHaveLength(1);
    expect(data.bodyEntries[0]).toMatchObject({ date: '2026-01-31', weight: 79, bodyFat: 15, chest: 101, waist: 85, arm: 35, thigh: 61 });
  });

  it('vytvorí rutiny podľa názvov tréningov', () => {
    expect(data.routines.map((r) => r.name)).toEqual(['Legs', 'Chest']);
    const chest = data.routines[1];
    expect(chest.exercises.map((e) => [e.exerciseName, e.sets])).toEqual([
      ['Bench Press (Barbell)', 2],
      ['Dipy na triceps', 1],
      ['Bicepsový curl na kladke', 1],
    ]);
    expect(chest.isSample).toBe(false);
  });

  it('cudzí súbor odmietne zrozumiteľnou chybou', () => {
    expect(() => buildFromHevy('"a","b"\n"1","2"')).toThrow(/workout_data/);
  });
});

describe('zápis do databázy', () => {
  it('je opakovateľný: druhý import nič nezdvojí', async () => {
    const db = new FitnessDB('hevy-test');
    const data = buildFromHevy(WORKOUT, MEASURE);
    const first = await importHevyData(data, db, { routines: true });
    expect(first).toMatchObject({ sessions: 2, customExercises: 2, bodyEntries: 1, routines: 2, alreadyThere: 0 });
    const second = await importHevyData(data, db, { routines: true });
    expect(second).toMatchObject({ sessions: 0, customExercises: 0, bodyEntries: 0, routines: 0, alreadyThere: 2 });
    expect(await db.sessions.count()).toBe(2);
    expect(await db.routines.count()).toBe(2);
    expect(await db.personalRecords.count()).toBeGreaterThan(0);
    db.close();
  });
});
