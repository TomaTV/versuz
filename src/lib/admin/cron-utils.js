// Minimal cron expression to next-run calculator. Supports the subset
// used in our workflows : "m h dom mon dow" with *, step ranges (*/N),
// fixed values, and comma lists. No DOW/DOM intersection, no L/W/#,
// no seconds field. All times computed in UTC.

function parseField(token, min, max) {
  if (token === "*") return null; // null means "any"
  if (token.startsWith("*/")) {
    const step = Number(token.slice(2));
    const out = [];
    for (let v = min; v <= max; v += step) out.push(v);
    return out;
  }
  return token
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= min && n <= max);
}

export function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`Invalid cron: ${expr}`);
  const [m, h, dom, mon, dow] = parts;
  return {
    minutes: parseField(m, 0, 59),
    hours: parseField(h, 0, 23),
    daysOfMonth: parseField(dom, 1, 31),
    months: parseField(mon, 1, 12),
    daysOfWeek: parseField(dow, 0, 6), // 0 = Sunday
  };
}

function matches(field, value) {
  if (field === null) return true;
  return field.includes(value);
}

/**
 * Returns the next Date strictly after `from` matching the cron in UTC.
 * Brute-force scans minute-by-minute up to 366 days ahead (cheap, runs
 * in <5ms for weekly crons).
 */
export function nextRun(expr, from = new Date()) {
  const c = parseCron(expr);
  const d = new Date(from.getTime());
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1);
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (
      matches(c.minutes, d.getUTCMinutes()) &&
      matches(c.hours, d.getUTCHours()) &&
      matches(c.daysOfMonth, d.getUTCDate()) &&
      matches(c.months, d.getUTCMonth() + 1) &&
      matches(c.daysOfWeek, d.getUTCDay())
    ) {
      return new Date(d.getTime());
    }
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return null;
}

export function formatRelative(date, now = new Date()) {
  if (!date) return "—";
  const diffMs = date.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const sec = Math.round(abs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  let out;
  if (sec < 60) out = `${sec}s`;
  else if (min < 60) out = `${min}m`;
  else if (hr < 24) out = `${hr}h`;
  else out = `${day}d`;
  return diffMs < 0 ? `${out} ago` : `in ${out}`;
}

export function formatUTC(date) {
  if (!date) return "—";
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function formatParis(date) {
  if (!date) return "—";
  try {
    const fmt = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return fmt.format(date) + " Paris";
  } catch {
    return "—";
  }
}
