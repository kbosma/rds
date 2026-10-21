import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NOW, OVERVIEW, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { TripHeroComponent } from './trip-hero.component';

describe('TripHeroComponent', () => {
  function setup(now: Date = NOW, service = portalServiceSpy()) {
    const s = storeSetup(now, service);
    TestBed.configureTestingModule({ imports: [TripHeroComponent], providers: s.providers });
    const store = TestBed.inject(PortalStore);
    store.init();
    const fixture = TestBed.createComponent(TripHeroComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, store, service };
  }
  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ');

  it('begroet de boeker en toont periode, boekingsnummer en reizigers', () => {
    const { el } = setup();

    expect(el.querySelector('h1')?.textContent).toContain('Hallo Klaas');
    expect(text(el)).toContain('12 juni – 26 juni 2027');
    expect(text(el)).toContain('14 nachten');
    expect(text(el)).toContain('BK-2026-001');
    expect(text(el)).toContain('2 reizigers');
    expect(text(el)).toContain('Klaas, Marieke');
    expect(text(el)).toContain('Puurkroatie');
  });

  it('telt voor de reis de dagen tot vertrek af', () => {
    const { el } = setup(new Date(2027, 5, 1, 9, 0));

    expect(text(el)).toContain('11');
    expect(text(el)).toContain('dagen tot vertrek');
  });

  it('zegt "dag" bij precies één dag', () => {
    const { el } = setup(new Date(2027, 5, 11, 9, 0));

    expect(text(el)).toContain('dag tot vertrek');
    expect(text(el)).not.toContain('dagen tot vertrek');
  });

  it('toont tijdens de reis de dag en de resterende nachten', () => {
    const { el } = setup();

    expect(text(el)).toContain('Dag 9');
    expect(text(el)).toContain('van 15');
    expect(text(el)).toContain('nog 6 nachten');
  });

  it('meldt op de laatste dag dat het de laatste dag is', () => {
    const { el } = setup(new Date(2027, 5, 26, 9, 0));

    expect(text(el)).toContain('Dag 15');
    expect(text(el)).toContain('laatste dag');
  });

  it('bedankt na de reis', () => {
    const { el } = setup(new Date(2027, 6, 5));

    expect(text(el)).toContain('Bedankt voor uw reis');
  });

  it('toont de voortgang van de boeking met een tekstalternatief', () => {
    const { el } = setup();
    const steps = el.querySelectorAll('.steps i');

    expect(steps.length).toBe(8);
    expect(el.querySelectorAll('.steps i.done').length).toBe(3);
    expect(el.querySelectorAll('.steps i.current').length).toBe(1);
    expect(el.querySelector('.steps')?.getAttribute('aria-label')).toContain('Voorschot');
  });

  it('toont zonder voornaam een algemene begroeting', () => {
    const service = portalServiceSpy();
    service.getOverview.and.returnValue(of({ ...OVERVIEW, booker: null }));
    const { el } = setup(NOW, service);

    expect(el.querySelector('h1')?.textContent).toContain('Welkom');
  });

  it('meldt dat de reisdata nog niet bekend zijn', () => {
    const service = portalServiceSpy();
    service.getOverview.and.returnValue(of({ ...OVERVIEW, booking: { ...OVERVIEW.booking, fromDate: null, untilDate: null } }));
    service.getStays.and.returnValue(of([]));
    const { el } = setup(NOW, service);

    expect(text(el)).toContain('reisdata zijn nog niet bekend');
  });

  it('toont een foutmelding met een knop om opnieuw te proberen', () => {
    const service = portalServiceSpy();
    service.getOverview.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el, service: svc } = setup(NOW, service);

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('niet worden geladen');
    svc.getOverview.and.returnValue(of(OVERVIEW));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('h1')?.textContent).toContain('Hallo Klaas');
  });

  it('toont het logo van de organisatie als ze er een heeft', () => {
    const service = portalServiceSpy();
    service.getOverview.and.returnValue(of({ ...OVERVIEW, organization: { ...OVERVIEW.organization!, logoUrl: 'https://example.test/logo.png' } }));
    const { el } = setup(NOW, service);

    expect(el.querySelector('img.logo')?.getAttribute('src')).toBe('https://example.test/logo.png');
  });

  it('toont geen logo als de organisatie er geen heeft', () => {
    const { el } = setup();

    expect(el.querySelector('img.logo')).toBeNull();
  });
});
