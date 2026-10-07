import { env } from '../config.js';

function offsetMs(ts, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ts)).filter((x) => x.type !== 'literal').map((x) => [x.type, +x.value]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
}

// Wall-clock time in `tz` -> UTC milliseconds (DST-safe; day overflow is normalised by Date.UTC)
export function zonedToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = offsetMs(guess, tz);
  let ts = guess - off;
  const off2 = offsetMs(ts, tz);
  if (off2 !== off) ts = guess - off2;
  return ts;
}

export function validTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

// "2026-10-10" + "20:00" -> unix seconds, or null if malformed
export function parseWhen(date, time, tz = env.tz) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!d || !t || +t[1] > 23 || +t[2] > 59 || +d[2] < 1 || +d[2] > 12 || +d[3] < 1 || +d[3] > 31) return null;
  return Math.floor(zonedToUtc(+d[1], +d[2], +d[3], +t[1], +t[2], tz) / 1000);
}

// Next weekly reset as unix seconds
export function nextReset(now = Date.now()) {
  const tz = env.tz;
  const [h, m] = env.resetTime.split(':').map(Number);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date(now)).filter((x) => x.type !== 'literal').map((x) => [x.type, +x.value]));
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  let delta = (env.resetDow - dow + 7) % 7;
  let ts = zonedToUtc(p.year, p.month, p.day + delta, h, m, tz);
  if (ts <= now) ts = zonedToUtc(p.year, p.month, p.day + delta + 7, h, m, tz);
  return Math.floor(ts / 1000);
}
