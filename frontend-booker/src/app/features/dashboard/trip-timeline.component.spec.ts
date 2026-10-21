import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NOW, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { TripTimelineComponent } from './trip-timeline.component';

describe('TripTimelineComponent', () => {
  function setup(now: Date = NOW, service = portalServiceSpy()) {
    const s = storeSetup(now, service);
    TestBed.configureTestingModule({ imports: [TripTimelineComponent], providers: s.providers });
    TestBed.inject(PortalStore).init();
    const fixture = TestBed.createComponent(TripTimelineComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, service };
  }
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ');

  it('toont een kolom per dag en een balk per verblijf met het aantal nachten', () => {
    const { el } = setup();

    expect(el.querySelectorAll('.dh').length).toBe(15);
    const bars = Array.from(el.querySelectorAll('.bar'));
    expect(bars.length).toBe(2);
    expect(text(bars[0])).toContain('Villa Marina · 7 nachten');
    expect((bars[0] as HTMLElement).style.gridColumn).toContain('1 / 8');
    expect((bars[1] as HTMLElement).style.gridColumn).toContain('8 / 15');
  });

  it('toont een genummerd punt per activiteit met een tekstalternatief', () => {
    const { el } = setup();
    const pins = Array.from(el.querySelectorAll('.pin'));

    expect(pins.map((p) => p.textContent?.trim())).toEqual(['1', '2', '3', '4', '5']);
    expect(pins[3].getAttribute('aria-label')).toBe('Activiteit 4: Eilandhoppen Pakleni');
    expect(text(el.querySelector('.hint'))).toContain('De nummers verwijzen');
  });

  it('markeert vandaag tijdens de reis', () => {
    const { el } = setup();
    const today = el.querySelectorAll('.dh.today');

    expect(today.length).toBe(1);
    expect(today[0].textContent).toContain('20');
  });

  it('markeert niets voor de reis', () => {
    const { el } = setup(new Date(2027, 5, 1, 9, 0));

    expect(el.querySelectorAll('.dh.today').length).toBe(0);
  });

  it('heeft dezelfde gegevens als agenda voor smalle schermen', () => {
    const { el } = setup();
    const days = el.querySelectorAll('.ag-day');

    expect(days.length).toBe(6);
    expect(text(days[3])).toContain('Check-out Villa Marina');
    expect(text(days[3])).toContain('3 Veerboot Split-Hvar');
    expect(text(days[3])).toContain('11:00');
    expect(text(days[3])).toContain('Check-in Hotel Hvar Bay');
    expect(days[3].querySelector('.rail-0')).not.toBeNull();
    expect(days[3].querySelector('.rail-1')).not.toBeNull();
  });

  it('markeert vandaag ook in de agenda', () => {
    const { el } = setup();

    expect(el.querySelectorAll('.ag-day.today').length).toBe(1);
  });

  it('toont een lege toestand zonder verblijven en activiteiten', () => {
    const service = portalServiceSpy();
    service.getStays.and.returnValue(of([]));
    service.getActivities.and.returnValue(of([]));
    const { el } = setup(NOW, service);

    expect(text(el)).toContain('nog geen verblijven of activiteiten gepland');
    expect(el.querySelector('.grid')).toBeNull();
  });

  it('toont een fout en laadt bij opnieuw proberen alles van de planning opnieuw', () => {
    const service = portalServiceSpy();
    service.getActivities.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = setup(NOW, service);

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    service.getActivities.and.returnValue(of([]));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.getOverview).toHaveBeenCalledTimes(2);
    expect(service.getStays).toHaveBeenCalledTimes(2);
    expect(service.getActivities).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
