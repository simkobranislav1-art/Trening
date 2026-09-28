let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * iOS povolí zvuk až po dotyku používateľa. Volaj z obsluhy kliknutia
 * (napr. pri dokončení série), aby neskôr prestávka mohla zapípať.
 */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume().catch(() => undefined);
}

/** Tri krátke tóny na konci prestávky. */
export function beep(): void {
  const c = context();
  if (!c) return;
  try {
    const start = c.currentTime + 0.02;
    [0, 0.22, 0.44].forEach((offset, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.16);
      osc.connect(gain).connect(c.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.18);
    });
  } catch {
    /* zvuk nie je dostupný */
  }
}
