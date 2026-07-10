/** Beep corto para alertas de recepción (requiere gesto previo del usuario). */

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

/** Desbloquea audio tras un clic (política de autoplay del navegador). */
export async function unlockAlertSound(): Promise<boolean> {
  const ctx = getContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    unlocked = ctx.state === "running";
    return unlocked;
  } catch {
    return false;
  }
}

export function isAlertSoundUnlocked(): boolean {
  return unlocked && audioCtx?.state === "running";
}

/** Sumido breve (dos tonos). */
export function playReservationAlertBeep(): void {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  const tones: Array<{ freq: number; start: number; dur: number }> = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1175, start: 0.14, dur: 0.16 },
  ];

  for (const tone of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(0.0001, now + tone.start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + tone.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.dur + 0.02);
  }

  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {
    /* ignore */
  }
}
