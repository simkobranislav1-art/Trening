import { useRef, useState } from 'react';
import { clearAll, exportAll, importAll, mergeFromBackup, removeSampleRoutines, updateSettings } from '../../db/repo';
import { parseBackup, type BackupFile } from '../../domain/backup';
import { fmtClock, fmtDate, fmtNumber } from '../../domain/format';
import { Button, Chip, ErrorNote, Group, Row, SectionTitle, Spinner, Toggle } from '../components/basic';
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

  const stepper = (label: string, hint: string, value: string, dec: { label: string; disabled: boolean; fn: () => void }, inc: { label: string; disabled: boolean; fn: () => void }) => (
    <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 py-2">
      <div className="min-w-0">
        <p className="text-[17px] font-medium">{label}</p>
        <p className="text-[14px] leading-snug text-muted">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button small aria-label={dec.label} disabled={dec.disabled} onClick={dec.fn} className="!w-11 !px-0 text-xl">
          −
        </Button>
        <span className="t-num w-[68px] text-center text-[26px]" aria-live="polite">
          {value}
        </span>
        <Button small aria-label={inc.label} disabled={inc.disabled} onClick={inc.fn} className="!w-11 !px-0 text-xl">
          +
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="Nastavenia" />
      <div className="px-4 pb-8">
        <SectionTitle>Vzhľad</SectionTitle>
        <Group>
          <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-2">
            <p className="text-[17px] font-medium">Téma</p>
            <div className="flex gap-2" role="group" aria-label="Téma">
              <Chip active={settings.theme === 'dark'} onClick={() => updateSettings({ theme: 'dark' })}>
                Tmavá
              </Chip>
              <Chip active={settings.theme === 'light'} onClick={() => updateSettings({ theme: 'light' })}>
                Svetlá
              </Chip>
            </div>
          </div>
        </Group>

        <SectionTitle>Tréning</SectionTitle>
        <Group>
          {stepper(
            'Prestávka',
            'Po dokončení série.',
            fmtClock(settings.restSeconds),
            { label: 'Skrátiť prestávku', disabled: settings.restSeconds <= 15, fn: () => updateSettings({ restSeconds: settings.restSeconds - 15 }) },
            { label: 'Predĺžiť prestávku', disabled: settings.restSeconds >= 600, fn: () => updateSettings({ restSeconds: settings.restSeconds + 15 }) },
          )}
          <Toggle
            checked={settings.restSound}
            onChange={(v) => updateSettings({ restSound: v })}
            label="Zvuk na konci prestávky"
            hint="Aplikácia musí byť otvorená."
          />
          {stepper(
            'Krok váhy',
            'Pre návrh váhy.',
            fmtNumber(settings.progressionStep),
            { label: 'Menší krok', disabled: settings.progressionStep <= 1.25, fn: () => updateSettings({ progressionStep: settings.progressionStep - 1.25 }) },
            { label: 'Väčší krok', disabled: settings.progressionStep >= 10, fn: () => updateSettings({ progressionStep: settings.progressionStep + 1.25 }) },
          )}
          <Toggle
            checked={settings.showEffort}
            onChange={(v) => updateSettings({ showEffort: v })}
            label="Zapisovať RPE / RIR"
            hint="Voliteľné pole pri každej sérii."
          />
          {settings.showEffort && (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[17px] font-medium">Typ náročnosti</p>
              <div className="flex gap-2" role="group" aria-label="Typ náročnosti">
                <Chip active={settings.effortMode === 'rpe'} onClick={() => updateSettings({ effortMode: 'rpe' })}>
                  RPE
                </Chip>
                <Chip active={settings.effortMode === 'rir'} onClick={() => updateSettings({ effortMode: 'rir' })}>
                  RIR
                </Chip>
              </div>
            </div>
          )}
        </Group>

        <SectionTitle>Záloha a synchronizácia</SectionTitle>
        {msg && (msg.ok ? <p className="mb-3 rounded-xl bg-accent/15 px-4 py-3 text-[15px] text-accent-ink" role="status">{msg.text}</p> : <ErrorNote>{msg.text}</ErrorNote>)}
        <Button variant="primary" block onClick={onExport}>
          Exportovať zálohu
        </Button>
        <p className="mb-3 mt-2 px-1 text-[13px] text-muted">
          {settings.lastBackupAt ? `Posledná záloha: ${fmtDate(settings.lastBackupAt)}. ` : 'Zatiaľ si nezálohoval. '}
          Dáta sú iba v tomto zariadení, preto zálohuj pravidelne.
        </p>
        <Group>
          <Row title="Zlúčiť zálohu z iného zariadenia" subtitle="Synchronizácia cez súbor, nič sa nestratí." chevron onClick={() => mergeRef.current?.click()} />
          <Row title="Importovať a nahradiť všetko" subtitle="Prepíše dáta v tomto zariadení." chevron onClick={() => fileRef.current?.click()} />
        </Group>
        <input ref={mergeRef} type="file" accept="application/json,.json" className="hidden" aria-label="Vybrať súbor zálohy na zlúčenie" onChange={(e) => onMergeFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Vybrať súbor zálohy" onChange={(e) => onPickFile(e.target.files?.[0])} />

        <SectionTitle>Ďalšie</SectionTitle>
        <Group>
          <Row to="/kotuce" title="Kalkulačka kotúčov" chevron />
          <Row to="/telo" title="Telesná váha a miery" chevron />
          <Row to="/nastavenia/o-aplikacii" title="O aplikácii a licencie" chevron />
        </Group>

        <SectionTitle>Údaje</SectionTitle>
        <Group>
          {sampleCount > 0 && <Row title={`Odstrániť ukážkové rutiny (${sampleCount})`} onClick={() => setConfirmSamples(true)} />}
          <Row title="Vymazať všetky dáta" danger onClick={() => setConfirmClear(true)} />
        </Group>
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
