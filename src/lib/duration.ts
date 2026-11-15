const UNIT_SECONDS: Record<string, number> = {
  h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600,
  m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
  s: 1, sec: 1, secs: 1, second: 1, seconds: 1,
};

const NUMBER_ONLY = /^\d+(?:\.\d+)?$/;
const CLOCK = /^\d+(?::\d{1,2}){1,2}$/;
const TOKEN = /(\d+(?:\.\d+)?)\s*([a-z]+)\s*/y;

/** Parse free-text duration into whole seconds, or null if it can't be read. */
export function parseDuration(text: string): number | null {
  const s = text.trim().toLowerCase();
  if (!s) return null;

  if (NUMBER_ONLY.test(s)) return Math.round(parseFloat(s) * 60);

  if (CLOCK.test(s)) {
    const parts = s.split(':').map(Number);
    if (parts.slice(1).some((p) => p >= 60)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0);
  }

  let total = 0;
  let matched = false;
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < s.length) {
    const m = TOKEN.exec(s);
    if (!m) return null;
    const unit = UNIT_SECONDS[m[2]];
    if (unit === undefined) return null;
    total += parseFloat(m[1]) * unit;
    matched = true;
  }
  return matched ? Math.round(total) : null;
}

/** Compact human form, e.g. "45s", "1m 30s", "1h 45m". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

/** Countdown form, e.g. "0:45", "30:00", "1:02:30". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
