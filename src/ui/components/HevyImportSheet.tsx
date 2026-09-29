import { useState } from 'react';
import { importHevyData, type HevyImportResult } from '../../db/repo';
import { buildFromHevy, type HevyImportData } from '../../domain/hevyImport';
import { fmtDate, fmtSets } from '../../domain/format';
import { Button, ErrorNote, Group, Toggle } from './basic';
import { Sheet } from './Sheet';

/** Import exportu z Hevy: workout_data.csv (povinný) a measurement_data.csv (voliteľný). */
export function HevyImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [workoutText, setWorkoutText] = useState<string | null>(null);
  const [measureText, setMeasureText] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [withRoutines, setWithRoutines] = useState(true);
  const [done, setDone] = useState<HevyImportResult | null>(null);

  let preview: HevyImportData | null = null;
  let previewError = '';
  if (workoutText !== null) {
    try {
      preview = buildFromHevy(workoutText, measureText);
    } catch (e) {
      previewError = (e as Error).message;
    }
  }

  const reset = () => {
    setWorkoutText(null);
    setMeasureText(null);
    setError('');
    setDone(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const pick = async (file: File | undefined, kind: 'workout' | 'measure') => {
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      if (kind === 'workout') {
        setWorkoutText(text);
      } else {
        setMeasureText(text);
      }
    } catch {
      setError('Súbor sa nepodarilo prečítať.');
    }
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      setDone(await importHevyData(preview, undefined, { routines: withRoutines }));
    } catch {
      setError('Import sa nepodaril. Nič sa nezmenilo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="Import z Hevy" tall>
      {done ? (
        <div>
          <p className="mb-2 text-[18px] font-medium text-good">Hotovo</p>
          <p className="mb-5 text-muted">
            Pridané: {done.sessions} tréningov, {done.customExercises} nových cvikov, {done.routines} rutín, {done.bodyEntries} meraní.
            {done.alreadyThere > 0 && ` Už existovalo: ${done.alreadyThere} tréningov (preskočené).`} Rekordy sa prepočítali.
          </p>
          <Button variant="primary" block onClick={close}>
            Zavrieť
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] leading-snug text-muted">
            V Hevy otvor Profil → Nastavenia → Export &amp; Import Data → Export Data. Dostaneš súbory
            <b className="text-ink"> workout_data.csv</b> a <b className="text-ink">measurement_data.csv</b>. Import nič nemaže
            a dá sa bezpečne zopakovať.
          </p>

          <label className="block">
            <span className="t-label mb-2 block">Tréningy (workout_data.csv)</span>
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Vybrať súbor workout_data.csv"
              onChange={(e) => pick(e.target.files?.[0], 'workout')}
              className="block w-full text-[15px] text-muted file:mr-3 file:rounded-[10px] file:border-0 file:bg-raised file:px-4 file:py-2.5 file:text-[16px] file:text-ink"
            />
          </label>

          <label className="block">
            <span className="t-label mb-2 block">Telesné miery (measurement_data.csv), nepovinné</span>
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Vybrať súbor measurement_data.csv"
              onChange={(e) => pick(e.target.files?.[0], 'measure')}
              className="block w-full text-[15px] text-muted file:mr-3 file:rounded-[10px] file:border-0 file:bg-raised file:px-4 file:py-2.5 file:text-[16px] file:text-ink"
            />
          </label>

          {(error || previewError) && <ErrorNote>{error || previewError}</ErrorNote>}

          {preview && preview.sessions.length === 0 && !previewError && <ErrorNote>V súbore sa nenašiel žiadny tréning.</ErrorNote>}

          {preview && preview.sessions.length > 0 && (
            <div className="rounded-xl bg-raised p-4 text-[15px] leading-relaxed">
              <p className="font-medium">
                {preview.sessions.length} tréningov · {fmtSets(preview.sets)}
              </p>
              <p className="text-muted">
                {preview.firstDate && preview.lastDate && `${fmtDate(preview.firstDate)} – ${fmtDate(preview.lastDate)}`}
              </p>
              <p className="mt-2 text-muted">
                Cviky: {preview.matched} sa priradilo k našej knižnici, {preview.created} sa založí ako vlastné.
                {preview.bodyEntries.length > 0 && ` Merania: ${preview.bodyEntries.length}.`}
              </p>
              {preview.warnings.map((w) => (
                <p key={w} className="mt-2 text-warn">
                  {w}
                </p>
              ))}
            </div>
          )}

          {preview && preview.routines.length > 0 && (
            <Group className="!bg-raised">
              <Toggle
                checked={withRoutines}
                onChange={setWithRoutines}
                label="Vytvoriť rutiny z tréningov"
                hint={preview.routines.map((r) => r.name).join(', ')}
              />
            </Group>
          )}

          <Button variant="primary" block disabled={!preview || preview.sessions.length === 0 || busy} onClick={run}>
            {busy ? 'Importujem…' : 'Importovať'}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
