import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NOW, PAYMENTS, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { PaymentsCardComponent } from './payments-card.component';

describe('PaymentsCardComponent', () => {
  function setup(service = portalServiceSpy()) {
    const s = storeSetup(NOW, service);
    TestBed.configureTestingModule({ imports: [PaymentsCardComponent], providers: s.providers });
    const store = TestBed.inject(PortalStore);
    store.init();
    const fixture = TestBed.createComponent(PaymentsCardComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, store, ...s };
  }
  const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(() => sessionStorage.removeItem('rds_booker_pay_started'));
  afterEach(() => sessionStorage.removeItem('rds_booker_pay_started'));

  it('toont de totalen en het percentage', () => {
    const { el } = setup();

    expect(text(el)).toContain('€ 3.850,00');
    expect(text(el)).toContain('€ 1.650,00');
    expect(text(el)).toContain('€ 2.200,00');
    expect(text(el.querySelector('svg text'))).toBe('43%');
    expect(el.querySelector('svg')?.getAttribute('aria-label')).toBe('43 procent betaald');
  });

  it('toont per betaling de status met tekst en pictogram, en wanneer er betaald is', () => {
    const { el } = setup();
    const rows = el.querySelectorAll('.row');

    expect(rows.length).toBe(2);
    expect(text(rows[0])).toContain('Voorschot');
    expect(text(rows[0])).toContain('Betaald');
    expect(text(rows[0])).toContain('op 12 okt 2026');
    expect(rows[0].querySelector('.st.ok')).not.toBeNull();
    expect(text(rows[1])).toContain('Open');
    expect(rows[1].querySelector('.st.wait')).not.toBeNull();
    expect(rows[1].querySelector('.st mat-icon')?.textContent).toBe('schedule');
  });

  it('geeft mislukte en verlopen betalingen een eigen toon', () => {
    const service = portalServiceSpy();
    service.getPayments.and.returnValue(of([{ ...PAYMENTS[1], currentStatus: 'failed' }, { ...PAYMENTS[1], molliePaymentId: 'p3', currentStatus: 'expired' }]));
    const { el } = setup(service);

    expect(el.querySelectorAll('.st.bad').length).toBe(2);
  });

  it('heeft een betaalknop voor alleen de betaling die open staat', () => {
    const { el } = setup();
    const buttons = el.querySelectorAll('button.pay');

    expect(buttons.length).toBe(1);
    expect(text(buttons[0])).toContain('Betaal € 2.200,00');
  });

  it('start de betaling en stuurt de klant naar Mollie bij een klik', () => {
    const { fixture, el, service, redirect } = setup();

    (el.querySelector('button.pay') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(service.initiatePayment).toHaveBeenCalledWith('p2');
    expect(redirect).toHaveBeenCalledWith('https://mollie.test/pay');
    expect(el.querySelector('button.pay mat-spinner')).not.toBeNull();
  });

  it('toont een foutmelding als de betaling niet gestart kon worden', () => {
    const { fixture, el, service } = setup();
    service.initiatePayment.and.returnValue(throwError(() => new Error('boom')));

    (el.querySelector('button.pay') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.err')?.textContent).toContain('kon niet worden gestart');
    expect(el.querySelector('button.pay mat-spinner')).toBeNull();
  });

  it('toont geen betaalknop als alles betaald is', () => {
    const service = portalServiceSpy();
    service.getPayments.and.returnValue(of(PAYMENTS.map((p) => ({ ...p, currentStatus: 'paid' }))));
    const { el } = setup(service);

    expect(el.querySelector('button.pay')).toBeNull();
    expect(text(el.querySelector('svg text'))).toBe('100%');
  });

  it('toont een lege toestand zonder betalingen', () => {
    const service = portalServiceSpy();
    service.getPayments.and.returnValue(of([]));
    const { el } = setup(service);

    expect(text(el)).toContain('nog geen betalingen');
  });

  it('toont een fout met opnieuw proberen', () => {
    const service = portalServiceSpy();
    service.getPayments.and.returnValue(throwError(() => new Error('boom')));
    const { fixture, el } = setup(service);

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    service.getPayments.and.returnValue(of(PAYMENTS));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelectorAll('.row').length).toBe(2);
  });
});
