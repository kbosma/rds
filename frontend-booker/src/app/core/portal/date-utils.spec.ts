import { addDays, dayDiff, parseLocal, startOfDay, toIsoDay, toTime } from './date-utils';

describe('date-utils', () => {
  it('leest een datum als lokale dag, niet als UTC', () => {
    const d = parseLocal('2027-06-12');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 5, 12, 0]);
  });

  it('leest een datum met tijd', () => {
    const d = parseLocal('2027-06-14T09:30:00');
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([14, 9, 30]);
  });

  it('geeft een ongeldige datum bij onbekende tekst', () => {
    expect(Number.isNaN(parseLocal('morgen').getTime())).toBeTrue();
  });

  it('telt kalenderdagen, ook over de wissel van zomer- en wintertijd', () => {
    expect(dayDiff(parseLocal('2027-06-12'), parseLocal('2027-06-26'))).toBe(14);
    expect(dayDiff(parseLocal('2027-10-30'), parseLocal('2027-11-02'))).toBe(3);
    expect(dayDiff(parseLocal('2027-03-27'), parseLocal('2027-03-29'))).toBe(2);
    expect(dayDiff(parseLocal('2027-06-26'), parseLocal('2027-06-12'))).toBe(-14);
  });

  it('negeert het tijdstip bij het tellen van dagen', () => {
    expect(dayDiff(parseLocal('2027-06-12T23:30:00'), parseLocal('2027-06-13T00:10:00'))).toBe(1);
  });

  it('rekent met dagen en maakt tekst terug', () => {
    expect(toIsoDay(addDays(parseLocal('2027-06-30'), 2))).toBe('2027-07-02');
    expect(startOfDay(parseLocal('2027-06-12T17:45:00')).getHours()).toBe(0);
    expect(toTime(parseLocal('2027-06-14T09:05:00'))).toBe('09:05');
  });
});
