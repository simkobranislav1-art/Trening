import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAll, exportAll, importAll, mergeFromBackup, removeSampleRoutines, updateSettings } from '../../db/repo';
import { parseBackup, type BackupFile } from '../../domain/backup';
import { fmtClock, fmtDate, fmtNumber } from '../../domain/format';
import { Button, Card, Chip, ErrorNote, SectionTitle, Spinner, Toggle } from '../components/basic';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/Sheet';
import { useRoutines, useSettings } from '../hooks/data';

/** Vracia false, ak používateľ zdieľanie zrušil. */
async function saveBackupFile(backup: BackupFile): Promise<boolean> {
  const name = `zaloha-treningy-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([JSON.stringify(backup, null, 2)], name, { type: 'application/json' });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Záloha tréningov' });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export function SettingsPage() {
  const settings = useSettings();
  const routines = useRoutines();
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<{ text: string; summary: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSamples, setConfirmSamples] = useState(false);

  if (!settings || !routines) return (<><PageHeader title="Nastavenia" /><Spinner /></>);

  const sampleCount = routines.filter((r) => r.isSample).length;

  const onExport = async () => {
    try {
      if (await saveBackupFile(await exportAll())) {
        await updateSettings({ lastBackupAt: new Date().toISOString() });
        setMsg({ ok: true, text: 'Záloha je pripravená.' });
      }
    } catch {
      setMsg({ ok: false, text: 'Export sa nepodaril.' });
    }
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    try {
      const text = await file.text();
      const res = parseBackup(text);
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      const d = res.backup.data;
      setPending({
        text,
        summary: `${d.sessions.filter((s) => s.status === 'finished').length} tréningov, ${d.routines.length} rutín, ${d.customExercises.length} vlastných cvikov (záloha z ${new Date(res.backup.exportedAt).toLocaleDateString('sk-SK')}).`,
      });
    } catch {
      setMsg({ ok: false, text: 'Súbor sa nepodarilo prečítať.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onMergeFile = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    try {
      const res = await mergeFromBackup(await file.text());
      if (!res.ok) return setMsg({ ok: false, text: res.error });
      const { added, updated, removed } = res.stats;
      setMsg({
        ok: true,
        text:
          added + updated + removed === 0
            ? 'Všetko je už zosynchronizované, nič sa nezmenilo.'
            : `Zlúčené: ${added} nových, ${updated} aktualizovaných, ${removed} odstránených záznamov.`,
      });
    } catch {
      setMsg({ ok: false, text: 'Súbor sa nepodarilo prečítať.' });
    } finally {
      if (mergeRef.current) mergeRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Nastavenia" />
      <div className="px-4 pb-8">
        <SectionTitle>Vzhľad</SectionTitle>
        <Card>
          <p className="mb-2 font-medium">Téma</p>
          <div className="flex gap-2" role="group" aria-label="Téma">
            <Chip active={settings.theme === 'dark'} onClick={() => updateSettings({ theme: 'dark' })}>
              Tmavá
            </Chip>
            <Chip active={settings.theme === 'light'} onClick={() => updateSettings({ theme: 'light' })}>
              Svetlá
            </Chip>
          </div>
        </Card>

        <SectionTitle>Tréning</SectionTitle>
        <Card>
          <div className="flex min-h-[56px] items-center justify-between gap-3">
            <div>
              <p className="font-medium">Predvolená prestávka</p>
              <p className="text-sm text-muted">Spustí sa po dokončení série.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button small aria-label="Skrátiť prestávku" disabled={settings.restSeconds <= 15} onClick={() => updateSettings({ restSeconds: settings.restSeconds - 15 })}>
                −
              </Button>
              <span className="tnum w-14 text-center text-lg font-bold" aria-live="polite">
                {fmtClock(settings.restSeconds)}
              </span>
              <Button small aria-label="Predĺžiť prestávku" disabled={settings.restSeconds >= 600} onClick={() => updateSettings({ restSeconds: settings.restSeconds + 15 })}>
                +
              </Button>
            </div>
          </div>
          <div className="border-t border-line" />
          <Toggle
            checked={settings.restSound}
            onChange={(v) => updateSettings({ restSound: v })}
            label="Zvuk na konci prestávky"
            hint="Pípne, keď prestávka skončí (aplikácia musí byť otvorená)."
          />
          <div className="border-t border-line" />
          <div className="flex min-h-[56px] items-center justify-between gap-3">
            <div>
              <p className="font-medium">Krok navýšenia váhy</p>
              <p className="text-sm text-muted">Pre návrh váhy v tréningu.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button small aria-label="Menší krok" disabled={settings.progressionStep <= 1.25} onClick={() => updateSettings({ progressionStep: settings.progressionStep - 1.25 })}>
                −
              </Button>
              <span className="tnum w-16 text-center text-lg font-bold">{fmtNumber(settings.progressionStep)} kg</span>
              <Button small aria-label="Väčší krok" disabled={settings.progressionStep >= 10} onClick={() => updateSettings({ progressionStep: settings.progressionStep + 1.25 })}>
                +
              </Button>
            </div>
          </div>
          <div className="border-t border-line" />
          <Toggle
            checked={settings.showEffort}
            onChange={(v) => updateSettings({ showEffort: v })}
            label="Zapisovať RPE / RIR"
            hint="Voliteľné pole pri každej sérii."
          />
          {settings.showEffort && (
            <div className="flex gap-2 pb-1" role="group" aria-label="Typ náročnosti">
              <Chip active={settings.effortMode === 'rpe'} onClick={() => updateSettings({ effortMode: 'rpe' })}>
                RPE
              </Chip>
              <Chip active={settings.effortMode === 'rir'} onClick={() => updateSettings({ effortMode: 'rir' })}>
                RIR
              </Chip>
            </div>
          )}
        </Card>

        <SectionTitle>Dáta</SectionTitle>
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Všetko je uložené iba v tomto zariadení. Zálohuj si dáta pravidelne, najmä pred vymazaním údajov Safari.
          </p>
          {msg && (msg.ok ? <p className="rounded-xl bg-good/15 px-4 py-3 text-good" role="status">{msg.text}</p> : <ErrorNote>{msg.text}</ErrorNote>)}
          <p className="text-sm font-medium">
            {settings.lastBackupAt ? `Posledná záloha: ${fmtDate(settings.lastBackupAt)}` : 'Zatiaľ si nezálohoval.'}
          </p>
          <Button block variant="primary" onClick={onExport}>
            Exportovať dáta (JSON)
          </Button>
          <Button block onClick={() => mergeRef.current?.click()}>
            Zlúčiť zálohu z iného zariadenia
          </Button>
          <p className="-mt-1 text-sm text-muted">
            Synchronizácia: exportuj na jednom zariadení, na druhom zálohu zlúč. Nič sa nestratí, nastavenia ostanú.
          </p>
          <Button block onClick={() => fileRef.current?.click()}>
            Importovať a nahradiť všetko
          </Button>
          <input
            ref={mergeRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Vybrať súbor zálohy na zlúčenie"
            onChange={(e) => onMergeFile(e.target.files?.[0])}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Vybrať súbor zálohy"
            onChange={(e) => onPickFile(e.target.files?.[0])}
          />
          {sampleCount > 0 && (
            <Button block onClick={() => setConfirmSamples(true)}>
              Odstrániť ukážkové rutiny ({sampleCount})
            </Button>
          )}
          <Button variant="danger" block onClick={() => setConfirmClear(true)}>
            Vymazať všetky dáta
          </Button>
        </Card>

        <SectionTitle>Ďalšie</SectionTitle>
        <Card className="divide-y divide-line !p-0">
          <Link to="/kotuce" className="flex min-h-[56px] items-center justify-between px-4 font-medium">
            Kalkulačka kotúčov <span className="text-muted">›</span>
          </Link>
          <Link to="/telo" className="flex min-h-[56px] items-center justify-between px-4 font-medium">
            Telesná váha a miery <span className="text-muted">›</span>
          </Link>
          <Link to="/nastavenia/o-aplikacii" className="flex min-h-[56px] items-center justify-between px-4 font-medium">
            O aplikácii a licencie <span className="text-muted">›</span>
          </Link>
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        danger
        title="Nahradiť všetky dáta?"
        message={`${pending?.summary ?? ''} Aktuálne dáta v tomto zariadení sa prepíšu. Odporúčame si najprv urobiť zálohu.`}
        confirmLabel="Importovať a nahradiť"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          const res = await importAll(pending.text);
          setPending(null);
          if (res.ok) window.location.reload();
          else setMsg({ ok: false, text: res.error });
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        danger
        title="Vymazať všetky dáta?"
        message="Natrvalo sa zmažú tréningy, rutiny, vlastné cviky aj nastavenia. Predtým si môžeš dáta exportovať."
        confirmLabel="Vymazať všetko"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clearAll();
          window.location.reload();
        }}
      />
      <ConfirmDialog
        open={confirmSamples}
        title="Odstrániť ukážkové rutiny?"
        message="Odstránia sa rutiny označené „Ukážka“ (Push, Pull, Legs). Tvoje vlastné rutiny a história zostanú."
        confirmLabel="Odstrániť"
        danger
        onCancel={() => setConfirmSamples(false)}
        onConfirm={async () => {
          await removeSampleRoutines();
          setConfirmSamples(false);
          setMsg({ ok: true, text: 'Ukážkové rutiny boli odstránené.' });
        }}
      />
    </>
  );
}
