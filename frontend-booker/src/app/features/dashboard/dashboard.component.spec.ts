import { TestBed } from '@angular/core/testing';
import { NOW, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  function setup() {
    const s = storeSetup(NOW);
    TestBed.configureTestingModule({ imports: [DashboardComponent], providers: s.providers });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, ...s };
  }

  afterEach(() => {
    document.documentElement.style.removeProperty('--theme-primary');
    document.documentElement.style.removeProperty('--theme-accent');
  });

  it('laadt bij het openen alles van de eigen boeking', () => {
    const { service } = setup();

    for (const call of [service.getOverview, service.getStays, service.getActivities, service.getPayments,
      service.getPaymentStatuses, service.getDocuments, service.getMessages]) {
      expect(call).toHaveBeenCalledTimes(1);
    }
  });

  it('toont alle kaarten op één pagina', () => {
    const { el } = setup();
    const titles = Array.from(el.querySelectorAll('.card-title span')).map((s) => (s.textContent ?? '').trim());

    expect(titles).toEqual([
      'Uw reis in één oogopslag', 'Verblijven', 'Activiteiten',
      'Nu en straks', 'Betalingen', 'Berichten en documenten',
    ]);
    expect(el.querySelector('h1')?.textContent).toContain('Hallo Klaas');
  });

  it('geeft de betalingenkaart een anker voor de betaalbalk', () => {
    const { el } = setup();

    expect(el.querySelector('app-payments-card')?.id).toBe('payments');
  });

  it('kleurt het dashboard met de huisstijl van de organisatie en herstelt dat bij weggaan', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    TestBed.tick();

    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#1976d2');
    expect(document.documentElement.style.getPropertyValue('--theme-accent')).toBe('#ff9800');

    fixture.destroy();

    expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('');
  });

  it('heeft een eigen toestand per dashboard, zodat een volgende klant niets van de vorige ziet', () => {
    const service = portalServiceSpy();
    const s = storeSetup(NOW, service);
    TestBed.configureTestingModule({ imports: [DashboardComponent], providers: s.providers });
    const first = TestBed.createComponent(DashboardComponent);
    const second = TestBed.createComponent(DashboardComponent);
    first.detectChanges();
    second.detectChanges();

    expect(first.debugElement.injector.get(PortalStore)).not.toBe(second.debugElement.injector.get(PortalStore));
    expect(service.getOverview).toHaveBeenCalledTimes(2);
  });
});
