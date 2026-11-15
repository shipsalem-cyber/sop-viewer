let asked = false;

const supported = () => typeof window !== 'undefined' && typeof window.Notification === 'function';

/** Ask for browser-notification permission the first time a timer starts (never on page load). */
export function requestPermissionOnce(): void {
  if (asked || !supported()) return;
  asked = true;
  if (Notification.permission !== 'default') return;
  try {
    void Notification.requestPermission().catch(() => {});
  } catch {
    // Older Safari: callback form only; ignore.
  }
}

export function showSystemNotification(message: string): void {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    new Notification('Timer done', { body: message });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

/** Short beep every 1.5 s until stopped. */
export function startAlarm(): () => void {
  const Ctx = typeof window !== 'undefined'
    ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;
  if (!Ctx) return () => {};
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return () => {};
  }
  const beep = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  };
  beep();
  const id = setInterval(beep, 1500);
  return () => {
    clearInterval(id);
    void ctx.close().catch(() => {});
  };
}

/** Flash the tab title until stopped; stop restores the original. */
export function startTitleFlash(original: string): () => void {
  let on = false;
  const id = setInterval(() => {
    on = !on;
    document.title = on ? '⏰ Done' : original;
  }, 1000);
  return () => {
    clearInterval(id);
    document.title = original;
  };
}
