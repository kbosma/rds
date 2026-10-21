import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NOW, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { ActivitiesComponent } from './activities.component';
import { StaysComponent } from './stays.component';

const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ');

function render<T>(component: Type<T>, service = portalServiceSpy()) {
  const s = storeSetup(NOW, service);
  TestBed.configureTestingModule({ imports: [component], providers: s.providers });
  TestBed.inject(PortalStore).init();
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('StaysComponent', () => {
  it('toont een kaart per verblijf met leverancier, periode en nachten', () => {
    const { el } = render(StaysComponent);
    const stays = el.querySelectorAll('.stay');

    expect(stays.length).toBe(2);
    expect(text(stays[0])).toContain('Villa Marina');
    expect(text(stays[0])).toContain('Adria Stays');
    expect(text(stays[0])).toContain('12 jun – 19 jun');
    expect(text(stays[0])).toContain('7 nachten');
    expect(text(stays[1])).toContain('Hotel Hvar Bay');
  });

  it('zegt "nacht" bij één nacht', () => {
    const service = portalServiceSpy();
    service.getStays.and.returnValue(of([{ bookingLineId: 'x', accommodationName: 'Pension', supplierName: 'Leverancier', fromDate: '2027-06-12', untilDate: '2027-06-13' }]));
    const { el } = render(StaysComponent, service);

    expect(text(el)).toContain('1 nacht');
    expect(text(el)).not.toContain('1 nachten');
  });

  it('toont een lege toestand', () => {
    const empty = portalServiceSpy();
    empty.getStays.and.returnValue(of([]));

    expect(text(render(StaysComponent, empty).el)).toContain('nog geen verblijven');
  });

  it('toont een fout met opnieuw proberen', () => {
    const service = portalServiceSpy();
    service.getStays.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = render(StaysComponent, service);

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    service.getStays.and.returnValue(of([]));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('ActivitiesComponent', () => {
  it('toont de activiteiten genummerd op volgorde met tijd, plaats en soort', () => {
    const { el } = render(ActivitiesComponent);
    const rows = el.querySelectorAll('.row');

    expect(rows.length).toBe(5);
    expect(text(rows[0])).toContain('1');
    expect(text(rows[0])).toContain('Kajaktour Split');
    expect(text(rows[0])).toContain('ma 14 jun · 09:30 · Marina Kaštela');
    expect(text(rows[0])).toContain('Tour');
    expect(text(rows[1])).toContain('Excursie');
    expect(text(rows[2])).toContain('Transfer');
  });

  it('toont een lege toestand', () => {
    const service = portalServiceSpy();
    service.getActivities.and.returnValue(of([]));
    expect(text(render(ActivitiesComponent, service).el)).toContain('nog geen activiteiten gepland');
  });

  it('toont een fout met opnieuw proberen', () => {
    const service = portalServiceSpy();
    service.getActivities.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = render(ActivitiesComponent, service);

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    service.getActivities.and.returnValue(of([]));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
