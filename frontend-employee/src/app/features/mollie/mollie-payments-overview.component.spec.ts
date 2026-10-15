import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MolliePaymentsOverviewComponent } from './mollie-payments-overview.component';
import { MolliePaymentService } from './mollie-payment.service';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { MolliePayment } from '../../shared/models';

/*
 * Betalingen zijn geschiedenis: het overzicht heeft per regel inzien (dialoog met statushistorie) en
 * bewerken (alleen zolang de betaling nog niet bij Mollie bestaat), maar bewust GEEN verwijderen en
 * geen uitklapbare regel meer.
 */
describe('MolliePaymentsOverviewComponent', () => {
  let fixture: ComponentFixture<MolliePaymentsOverviewComponent>;
  let component: MolliePaymentsOverviewComponent;
  let paymentServiceSpy: jasmine.SpyObj<MolliePaymentService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let http: HttpTestingController;

  const base = { createdAt: '2026-05-01T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o', currency: 'EUR', checkoutUrl: '', method: null };
  const payments: MolliePayment[] = [
    { molliePaymentId: 'p-1', molliePaymentExternalId: 'tr_abc', amount: 100, description: 'Voorschot', ...base },
    { molliePaymentId: 'p-2', molliePaymentExternalId: '', amount: 250, description: 'Restant', ...base },
  ];

  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
  const dialog = () => (component as unknown as { dialog: MatDialog }).dialog;

  function load() {
    fixture.detectChanges();
    http.expectOne(r => r.url.endsWith('/booking-mollie-payments')).flush([{ bookingId: 'b-1', molliePaymentId: 'p-1' }]);
    tick();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    paymentServiceSpy = jasmine.createSpyObj('MolliePaymentService', ['getAll', 'getStatusEntries']);
    paymentServiceSpy.getAll.and.returnValue(of(payments));
    paymentServiceSpy.getStatusEntries.and.returnValue(of([]));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [MolliePaymentsOverviewComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MolliePaymentService, useValue: paymentServiceSpy },
        { provide: BookingService, useValue: { getAll: () => of([{ bookingId: 'b-1', bookingNumber: 'BK-1' }]) } },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MolliePaymentsOverviewComponent);
    component = fixture.componentInstance;
  });

  it('toont de betalingen als tabelregels met boekingsnummer', fakeAsync(() => {
    load();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('BK-1');
  }));

  it('er is geen verwijder-icoon, ook niet met alle authorities (betalingen zijn geschiedenis)', fakeAsync(() => {
    load();

    expect(buttons('action-delete').length).toBe(0);
    expect(buttons('action-view').length).toBe(2);
  }));

  it('bewerken kan alleen voor een betaling die nog niet bij Mollie bestaat', fakeAsync(() => {
    load();

    expect(buttons('action-edit').length).toBe(1);
    expect(component.canEditPayment(payments[0])).toBe(false); // heeft een Mollie-id
    expect(component.canEditPayment(payments[1])).toBe(true);
  }));

  it('zonder PAYMENT_UPDATE is er nooit een bewerk-icoon', fakeAsync(() => {
    authSpy.hasAuthority.and.callFake((a: string) => a === 'PAYMENT_READ');
    fixture = TestBed.createComponent(MolliePaymentsOverviewComponent);
    component = fixture.componentInstance;
    load();

    expect(buttons('action-edit').length).toBe(0);
    expect(component.canEditPayment(payments[1])).toBe(false);
  }));

  it('zonder PAYMENT_READ ontbreekt ook het inzien-icoon', fakeAsync(() => {
    authSpy.hasAuthority.and.returnValue(false);
    fixture = TestBed.createComponent(MolliePaymentsOverviewComponent);
    component = fixture.componentInstance;
    load();

    expect(buttons('action-view').length).toBe(0);
  }));

  it('de regel klappen niet meer uit en doet niets bij klikken', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

    expect(open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.status-history')).toBeNull();
  }));

  it('inzien opent het betalingsdialoog met boekingsnummer', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    component.viewPayment(payments[0]);

    const data = (open.calls.mostRecent().args[1] as { data: { payment: MolliePayment; bookingNumber?: string } }).data;
    expect(data.payment).toBe(payments[0]);
    expect(data.bookingNumber).toBe('BK-1');
  }));

  it('bewerken van een verstuurde betaling opent niets', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    component.editPayment(payments[0]);

    expect(open).not.toHaveBeenCalled();
  }));

  it('bewerken van een nog niet verstuurde betaling opent het dialoog en ververst na opslaan', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open').and.returnValue({ afterClosed: () => of(true) } as never);
    paymentServiceSpy.getAll.calls.reset();

    component.editPayment(payments[1]);
    tick();

    expect(open).toHaveBeenCalled();
    expect(paymentServiceSpy.getAll).toHaveBeenCalledTimes(1);
  }));
});
