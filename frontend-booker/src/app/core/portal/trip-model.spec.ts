import { ACTIVITIES, PAYMENTS, STATUSES, STAYS } from '../../testing/portal-fixtures';
import { PortalActivity, PortalPayment, PortalStay } from '../../shared/models/portal.models';
import { parseLocal } from './date-utils';
import {
  buildAgenda, buildEvents, buildTimeline, findNextUp, isPayable, isSettled, latestStatusDate,
  MAX_TIMELINE_DAYS, sortActivities, statusStepIndex, stayNights, summarizePayments, tripPhase,
} from './trip-model';

const START = parseLocal('2027-06-12');
const END = parseLocal('2027-06-26');
const day = (iso: string) => parseLocal(iso);

describe('trip-model: fase en status', () => {
  it('bepaalt de fase uit de datums, inclusief de randen', () => {
    expect(tripPhase(START, END, day('2027-06-11'))).toBe('before');
    expect(tripPhase(START, END, day('2027-06-12'))).toBe('during');
    expect(tripPhase(START, END, day('2027-06-26'))).toBe('during');
    expect(tripPhase(START, END, day('2027-06-27'))).toBe('after');
  });

  it('kent geen fase zonder datums', () => {
    expect(tripPhase(null, END, day('2027-06-12'))).toBe('unknown');
    expect(tripPhase(START, null, day('2027-06-12'))).toBe('unknown');
  });

  it('geeft de plek van een status in de voortgang, of -1', () => {
    expect(statusStepIndex('aanvraag')).toBe(0);
    expect(statusStepIndex('voorschot')).toBe(3);
    expect(statusStepIndex('afgerond')).toBe(7);
    expect(statusStepIndex('onzin')).toBe(-1);
    expect(statusStepIndex(null)).toBe(-1);
  });

  it('telt de nachten van een verblijf', () => {
    expect(stayNights(STAYS[0])).toBe(7);
    expect(stayNights({ ...STAYS[0], untilDate: '2027-06-12' })).toBe(0);
  });
});

describe('trip-model: tijdlijn', () => {
  it('maakt een kolom per dag en een balk per verblijf (de vertrekdag telt niet mee)', () => {
    const tl = buildTimeline(STAYS, ACTIVITIES, START, END);

    expect(tl.days.length).toBe(15);
    expect(tl.stays.map((s) => [s.startCol, s.endCol, s.lane])).toEqual([[1, 8, 0], [8, 15, 0]]);
    expect(tl.lanes).toBe(1);
  });

  it('zet elke activiteit in de kolom van haar dag, genummerd op volgorde van begin', () => {
    const tl = buildTimeline(STAYS, [...ACTIVITIES].reverse(), START, END);

    expect(tl.pins.map((p) => [p.number, p.activity.activityId, p.col])).toEqual([
      [1, 'a1', 3], [2, 'a2', 5], [3, 'a3', 8], [4, 'a4', 9], [5, 'a5', 15],
    ]);
    expect(tl.pinRows).toBe(1);
  });

  it('zet activiteiten van dezelfde dag onder elkaar', () => {
    const second: PortalActivity = { ...ACTIVITIES[0], activityId: 'x', name: 'Zwemmen', fromDate: '2027-06-14T14:00:00' };
    const tl = buildTimeline(STAYS, [...ACTIVITIES, second], START, END);

    const sameDay = tl.pins.filter((p) => p.col === 3);
    expect(sameDay.map((p) => [p.activity.activityId, p.row])).toEqual([['a1', 0], ['x', 1]]);
    expect(tl.pinRows).toBe(2);
  });

  it('zet overlappende verblijven in een eigen rij', () => {
    const overlap: PortalStay = { ...STAYS[1], bookingLineId: 'l3', fromDate: '2027-06-15', untilDate: '2027-06-18' };
    const tl = buildTimeline([STAYS[0], overlap], [], START, END);

    expect(tl.stays.map((s) => s.lane)).toEqual([0, 1]);
    expect(tl.lanes).toBe(2);
  });

  it('houdt balken en punten binnen de periode', () => {
    const outside: PortalActivity = { ...ACTIVITIES[0], activityId: 'z', fromDate: '2027-07-30T10:00:00' };
    const tl = buildTimeline([{ ...STAYS[0], fromDate: '2027-06-01', untilDate: '2027-07-30' }], [outside], START, END);

    expect(tl.stays[0].startCol).toBe(1);
    expect(tl.stays[0].endCol).toBe(16);
    expect(tl.pins[0].col).toBe(15);
  });

  it('geeft niets terug zonder datums of bij een te lange periode', () => {
    expect(buildTimeline(STAYS, ACTIVITIES, null, END).days).toEqual([]);
    expect(buildTimeline(STAYS, ACTIVITIES, START, parseLocal('2027-09-30')).days).toEqual([]);
    expect(buildTimeline(STAYS, ACTIVITIES, END, START).days).toEqual([]);
    expect(MAX_TIMELINE_DAYS).toBe(62);
  });
});

describe('trip-model: agenda', () => {
  it('groepeert per dag: eerst uitchecken, dan activiteiten op tijd, dan inchecken', () => {
    const agenda = buildAgenda(STAYS, ACTIVITIES);

    expect(agenda.map((d) => d.date.getDate())).toEqual([12, 14, 16, 19, 20, 26]);
    const nineteen = agenda.find((d) => d.date.getDate() === 19)!;
    expect(nineteen.items.map((i) => [i.kind, i.label])).toEqual([
      ['checkout', 'Villa Marina'], ['activity', 'Veerboot Split-Hvar'], ['checkin', 'Hotel Hvar Bay'],
    ]);
    const last = agenda[agenda.length - 1];
    expect(last.items.map((i) => i.kind)).toEqual(['checkout', 'activity']);
  });

  it('geeft activiteiten dezelfde nummers als de tijdlijn, en een tijd en plaats', () => {
    const agenda = buildAgenda(STAYS, ACTIVITIES);
    const first = agenda[1].items[0];

    expect(first.number).toBe(1);
    expect(first.time).toBe('09:30');
    expect(first.location).toBe('Marina Kaštela');
  });

  it('koppelt elke regel aan het verblijf dat die dag geldt', () => {
    const agenda = buildAgenda(STAYS, ACTIVITIES);
    const byDay = (d: number) => agenda.find((x) => x.date.getDate() === d)!.items;

    expect(byDay(14)[0].stayIndex).toBe(0);
    expect(byDay(19).map((i) => i.stayIndex)).toEqual([0, 1, 1]);
    expect(byDay(26).map((i) => i.stayIndex)).toEqual([1, 1]);
  });

  it('is leeg zonder verblijven en activiteiten', () => {
    expect(buildAgenda([], [])).toEqual([]);
  });
});

describe('trip-model: nu en eerstvolgende', () => {
  const events = () => buildEvents(STAYS, ACTIVITIES);

  it('herkent de activiteit die nu bezig is', () => {
    const up = findNextUp(events(), parseLocal('2027-06-20T11:00:00'));

    expect(up.current?.label).toBe('Eilandhoppen Pakleni');
    expect(up.next?.kind).toBe('checkout');
    expect(up.next?.label).toBe('Hotel Hvar Bay');
    expect(up.following?.label).toBe('Transfer luchthaven');
  });

  it('heeft niets "nu" tussen activiteiten door en toont dan wat eerst komt', () => {
    const up = findNextUp(events(), parseLocal('2027-06-20T17:00:00'));

    expect(up.current).toBeNull();
    expect(up.next?.label).toBe('Hotel Hvar Bay');
  });

  it('begint voor de reis met het eerste verblijf, daarna de eerste activiteit', () => {
    const up = findNextUp(events(), parseLocal('2027-06-01T09:00:00'));

    expect(up.current).toBeNull();
    expect(up.next).toEqual(jasmine.objectContaining({ kind: 'checkin', label: 'Villa Marina' }));
    expect(up.following?.label).toBe('Kajaktour Split');
  });

  it('telt inchecken op de dag zelf nog als komend', () => {
    const up = findNextUp(events(), parseLocal('2027-06-12T20:00:00'));

    expect(up.next).toEqual(jasmine.objectContaining({ kind: 'checkin', label: 'Villa Marina' }));
  });

  it('heeft na de reis niets meer te melden', () => {
    const up = findNextUp(events(), parseLocal('2027-06-30T09:00:00'));

    expect(up).toEqual({ current: null, next: null, following: null });
  });

  it('zet onderdelen op volgorde, ook als ze door elkaar binnenkomen', () => {
    const shuffled = buildEvents([...STAYS].reverse(), [...ACTIVITIES].reverse());

    expect(shuffled.map((e) => e.start.getTime())).toEqual([...shuffled.map((e) => e.start.getTime())].sort((a, b) => a - b));
    expect(sortActivities([...ACTIVITIES].reverse()).map((a) => a.activityId)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
  });
});

describe('trip-model: betalingen', () => {
  it('telt totaal, betaald en openstaand en het percentage', () => {
    expect(summarizePayments(PAYMENTS)).toEqual({ total: 3850, paid: 1650, open: 2200, paidPercent: 43, currency: 'EUR' });
  });

  it('is nul zonder betalingen', () => {
    expect(summarizePayments([])).toEqual({ total: 0, paid: 0, open: 0, paidPercent: 0, currency: 'EUR' });
  });

  it('telt een mislukte betaling nog als openstaand', () => {
    const failed: PortalPayment = { ...PAYMENTS[1], currentStatus: 'failed' };
    expect(summarizePayments([PAYMENTS[0], failed]).open).toBe(2200);
  });

  it('weet welke betalingen betaald kunnen worden en welke klaar zijn', () => {
    const status = (s: string): PortalPayment => ({ ...PAYMENTS[1], currentStatus: s });

    expect(['open', 'failed', 'expired'].every((s) => isPayable(status(s)))).toBeTrue();
    expect(['pending', 'authorized', 'paid', 'canceled'].some((s) => isPayable(status(s)))).toBeFalse();
    expect(['paid', 'failed', 'canceled', 'expired'].every((s) => isSettled(status(s)))).toBeTrue();
    expect(['open', 'pending', 'authorized'].some((s) => isSettled(status(s)))).toBeFalse();
  });

  it('geeft het tijdstip van de laatste statusregel van een betaling', () => {
    expect(latestStatusDate('p1', STATUSES)).toBe('2026-10-12T10:15:00');
    expect(latestStatusDate('p2', STATUSES)).toBe('2026-10-14T10:00:00');
    expect(latestStatusDate('onbekend', STATUSES)).toBeNull();
  });
});
