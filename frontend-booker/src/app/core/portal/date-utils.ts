const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/;

/**
 * Leest `jjjj-mm-dd` of `jjjj-mm-ddTuu:mm[:ss]` als lokale datum/tijd. Bewust niet via `new Date(string)`: dat
 * leest een datum zonder tijd als UTC en verschuift de dag in tijdzones achter UTC.
 */
export function parseLocal(iso: string): Date {
  const m = ISO.exec(iso);
  if (!m) return new Date(NaN);
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Aantal kalenderdagen van `from` tot `to` (negatief als `to` eerder is); zomer- en wintertijd tellen niet mee. */
export function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function toIsoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `09:30` uit een datum met tijd. */
export function toTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
