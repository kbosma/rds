import {
  PortalActivity,
  PortalPayment,
  PortalPaymentStatus,
  PortalStay,
} from '../../shared/models/portal.models';
import { dayDiff, parseLocal, startOfDay, toTime } from './date-utils';

/** Zuivere rekenfuncties achter het dashboard: geen Angular, dus eenvoudig te testen. */

export type TripPhase = 'unknown' | 'before' | 'during' | 'after';

/** De volgorde van de boekingsstatus; de statusbalk toont de voortgang hierlangs. */
export const BOOKING_STATUSES = [
  'aanvraag', 'offerte', 'boeking', 'voorschot', 'betaald', 'opreis', 'weerthuis', 'afgerond',
] as const;

/** Een tijdlijn met meer dagen dan dit wordt niet als balken getekend (alleen de agenda blijft bruikbaar). */
export const MAX_TIMELINE_DAYS = 62;

export function tripPhase(start: Date | null, end: Date | null, today: Date): TripPhase {
  if (!start || !end) return 'unknown';
  const t = startOfDay(today).getTime();
  if (t < startOfDay(start).getTime()) return 'before';
  if (t <= startOfDay(end).getTime()) return 'during';
  return 'after';
}

export function statusStepIndex(status: string | null | undefined): number {
  return BOOKING_STATUSES.indexOf((status ?? '') as (typeof BOOKING_STATUSES)[number]);
}

/** Activiteiten op volgorde van begin; dezelfde volgorde bepaalt de nummers in de tijdlijn en de lijsten. */
export function sortActivities(activities: PortalActivity[]): PortalActivity[] {
  return [...activities].sort((a, b) =>
    parseLocal(a.fromDate).getTime() - parseLocal(b.fromDate).getTime() || a.name.localeCompare(b.name));
}

export function sortStays(stays: PortalStay[]): PortalStay[] {
  return [...stays].sort((a, b) =>
    parseLocal(a.fromDate).getTime() - parseLocal(b.fromDate).getTime() || a.accommodationName.localeCompare(b.accommodationName));
}

/** Aantal nachten van een verblijf. */
export function stayNights(stay: PortalStay): number {
  return Math.max(0, dayDiff(parseLocal(stay.fromDate), parseLocal(stay.untilDate)));
}

// ---- tijdlijn (balken en punten) ----

export interface StayBar {
  stay: PortalStay;
  /** 0-gebaseerd, volgorde van de verblijven; stuurt de kleur */
  index: number;
  /** grid-kolommen, 1-gebaseerd; `endCol` is exclusief (de dag van vertrek telt niet mee) */
  startCol: number;
  endCol: number;
  /** rij als verblijven elkaar overlappen */
  lane: number;
}

export interface ActivityPin {
  activity: PortalActivity;
  number: number;
  col: number;
  /** rij als meerdere activiteiten op dezelfde dag vallen */
  row: number;
}

export interface Timeline {
  days: Date[];
  stays: StayBar[];
  pins: ActivityPin[];
  lanes: number;
  pinRows: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function buildTimeline(
  stays: PortalStay[],
  activities: PortalActivity[],
  start: Date | null,
  end: Date | null,
): Timeline {
  const empty: Timeline = { days: [], stays: [], pins: [], lanes: 0, pinRows: 0 };
  if (!start || !end) return empty;

  const length = dayDiff(start, end) + 1;
  if (length < 1 || length > MAX_TIMELINE_DAYS) return empty;

  const days = Array.from({ length }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));

  const laneEnds: number[] = [];
  const bars: StayBar[] = sortStays(stays).map((stay, index) => {
    const startCol = clamp(dayDiff(start, parseLocal(stay.fromDate)) + 1, 1, length);
    const endCol = clamp(dayDiff(start, parseLocal(stay.untilDate)) + 1, startCol + 1, length + 1);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endCol;
    return { stay, index, startCol, endCol, lane };
  });

  const perColumn = new Map<number, number>();
  const pins: ActivityPin[] = sortActivities(activities).map((activity, i) => {
    const col = clamp(dayDiff(start, parseLocal(activity.fromDate)) + 1, 1, length);
    const row = perColumn.get(col) ?? 0;
    perColumn.set(col, row + 1);
    return { activity, number: i + 1, col, row };
  });

  return { days, stays: bars, pins, lanes: laneEnds.length, pinRows: Math.max(0, ...perColumn.values()) };
}

// ---- agenda (verticaal, voor smalle schermen) ----

export type AgendaKind = 'checkout' | 'activity' | 'checkin';

export interface AgendaItem {
  kind: AgendaKind;
  label: string;
  time: string | null;
  location: string | null;
  /** nummer van de activiteit, zoals in de tijdlijn en de activiteitenlijst */
  number: number | null;
  /** welk verblijf op die dag geldt (stuurt de kleur); -1 als er geen is */
  stayIndex: number;
}

export interface AgendaDay {
  date: Date;
  items: AgendaItem[];
}

function stayIndexOn(date: Date, ordered: PortalStay[]): number {
  const covering = ordered.findIndex((s) =>
    parseLocal(s.fromDate).getTime() <= date.getTime() && date.getTime() < parseLocal(s.untilDate).getTime());
  if (covering !== -1) return covering;
  return ordered.findIndex((s) => parseLocal(s.untilDate).getTime() === date.getTime());
}

export function buildAgenda(stays: PortalStay[], activities: PortalActivity[]): AgendaDay[] {
  const ordered = sortStays(stays);
  type Entry = { date: Date; order: number; sortTime: number; item: AgendaItem };
  const entries: Entry[] = [];

  ordered.forEach((stay, index) => {
    const from = parseLocal(stay.fromDate);
    const until = parseLocal(stay.untilDate);
    entries.push({
      date: from, order: 2, sortTime: 0,
      item: { kind: 'checkin', label: stay.accommodationName, time: null, location: stay.supplierName, number: null, stayIndex: index },
    });
    entries.push({
      date: until, order: 0, sortTime: 0,
      item: { kind: 'checkout', label: stay.accommodationName, time: null, location: null, number: null, stayIndex: index },
    });
  });

  sortActivities(activities).forEach((activity, i) => {
    const start = parseLocal(activity.fromDate);
    entries.push({
      date: startOfDay(start), order: 1, sortTime: start.getTime(),
      item: {
        kind: 'activity', label: activity.name, time: toTime(start), location: activity.location,
        number: i + 1, stayIndex: stayIndexOn(startOfDay(start), ordered),
      },
    });
  });

  entries.sort((a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order || a.sortTime - b.sortTime);

  const days: AgendaDay[] = [];
  for (const entry of entries) {
    const last = days[days.length - 1];
    if (last && last.date.getTime() === entry.date.getTime()) last.items.push(entry.item);
    else days.push({ date: entry.date, items: [entry.item] });
  }
  return days;
}

// ---- "eerstvolgende" en "nu" ----

export interface TripEvent {
  kind: AgendaKind;
  label: string;
  location: string | null;
  start: Date;
  end: Date | null;
  /** een verblijf heeft alleen een datum, een activiteit ook een tijd */
  hasTime: boolean;
  order: number;
}

export interface NextUp {
  current: TripEvent | null;
  next: TripEvent | null;
  following: TripEvent | null;
}

export function buildEvents(stays: PortalStay[], activities: PortalActivity[]): TripEvent[] {
  const events: TripEvent[] = [];
  for (const stay of sortStays(stays)) {
    events.push({ kind: 'checkin', label: stay.accommodationName, location: stay.supplierName,
      start: parseLocal(stay.fromDate), end: null, hasTime: false, order: 2 });
    events.push({ kind: 'checkout', label: stay.accommodationName, location: null,
      start: parseLocal(stay.untilDate), end: null, hasTime: false, order: 0 });
  }
  for (const activity of sortActivities(activities)) {
    events.push({ kind: 'activity', label: activity.name, location: activity.location,
      start: parseLocal(activity.fromDate), end: activity.untilDate ? parseLocal(activity.untilDate) : null,
      hasTime: true, order: 1 });
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime() || a.order - b.order);
}

export function findNextUp(events: TripEvent[], now: Date): NextUp {
  const today = startOfDay(now).getTime();
  const isCurrent = (e: TripEvent) =>
    e.hasTime && e.start.getTime() <= now.getTime() && now.getTime() <= (e.end ?? e.start).getTime();
  const isPast = (e: TripEvent) =>
    e.hasTime ? (e.end ?? e.start).getTime() < now.getTime() : startOfDay(e.start).getTime() < today;

  const current = events.find(isCurrent) ?? null;
  const upcoming = events.filter((e) => e !== current && !isPast(e) && !isCurrent(e));
  return { current, next: upcoming[0] ?? null, following: upcoming[1] ?? null };
}

// ---- betalingen ----

/** Een betaling die niet meer verandert tenzij de klant opnieuw probeert. */
export const SETTLED_STATUSES = ['paid', 'failed', 'canceled', 'expired'];
/** Statussen waarin de klant kan (blijven) betalen. */
export const PAYABLE_STATUSES = ['open', 'failed', 'expired'];

export const isPayable = (payment: PortalPayment) => PAYABLE_STATUSES.includes(payment.currentStatus);
export const isSettled = (payment: PortalPayment) => SETTLED_STATUSES.includes(payment.currentStatus);

export interface PaymentSummary {
  total: number;
  paid: number;
  open: number;
  /** 0 t/m 100, afgerond */
  paidPercent: number;
  currency: string;
}

export function summarizePayments(payments: PortalPayment[]): PaymentSummary {
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const paid = payments.filter((p) => p.currentStatus === 'paid').reduce((sum, p) => sum + p.amount, 0);
  return {
    total,
    paid,
    open: total - paid,
    paidPercent: total > 0 ? Math.round((paid / total) * 100) : 0,
    currency: payments[0]?.currency ?? 'EUR',
  };
}

/** Het tijdstip van de laatste statusregel van een betaling, bv. wanneer er betaald is. */
export function latestStatusDate(paymentId: string, statuses: PortalPaymentStatus[]): string | null {
  const own = statuses.filter((s) => s.molliePaymentId === paymentId);
  if (own.length === 0) return null;
  return own.reduce((latest, s) => (s.createdAt > latest.createdAt ? s : latest)).createdAt;
}
