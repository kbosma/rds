import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NOW, PAYMENTS, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalStore } from '../../core/portal/portal.store';
import { PaymentAlertComponent } from './payment-alert.component';

describe('PaymentAlertComponent', () => {
  function setup(service = portalServiceSpy()) {
    const s = storeSetup(NOW, service);
    TestBed.configureTestingModule({ imports: [PaymentAlertComponent], providers: s.providers });
    TestBed.inject(PortalStore).init();
    const fixture = TestBed.createComponent(PaymentAlertComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, ...s };
  }

  beforeEach(() => sessionStorage.removeItem('rds_booker_pay_started'));
  afterEach(() => sessionStorage.removeItem('rds_booker_pay_started'));

  it('toont wat er openstaat', () => {
    const { el } = setup();

    expect((el.querySelector('.alert')?.textContent ?? '').replace(/\s+/g, ' ')).toContain('Openstaand € 2.200,00');
    expect(el.querySelector('button')?.textContent).toContain('Betaal nu');
  });

  it('toont niets als er niets te betalen is', () => {
    const service = portalServiceSpy();
    service.getPayments.and.returnValue(of(PAYMENTS.map((p) => ({ ...p, currentStatus: 'paid' }))));
    const { el } = setup(service);

    expect(el.querySelector('.alert')).toBeNull();
  });

  it('start bij één te betalen betaling die betaling meteen', () => {
    const { el, service, redirect } = setup();

    (el.querySelector('button') as HTMLButtonElement).click();

    expect(service.initiatePayment).toHaveBeenCalledWith('p2');
    expect(redirect).toHaveBeenCalledWith('https://mollie.test/pay');
  });

  it('brengt de klant bij meerdere betalingen naar de betalingenkaart', () => {
    const service = portalServiceSpy();
    service.getPayments.and.returnValue(of([{ ...PAYMENTS[1], molliePaymentId: 'a' }, { ...PAYMENTS[1], molliePaymentId: 'b' }]));
    const target = document.createElement('div');
    target.id = 'payments';
    target.scrollIntoView = jasmine.createSpy('scrollIntoView');
    document.body.appendChild(target);
    try {
      const { el, service: svc } = setup(service);

      (el.querySelector('button') as HTMLButtonElement).click();

      expect(target.scrollIntoView).toHaveBeenCalled();
      expect(svc.initiatePayment).not.toHaveBeenCalled();
    } finally {
      target.remove();
    }
  });
});
