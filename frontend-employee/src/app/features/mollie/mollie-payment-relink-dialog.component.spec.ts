import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { MolliePaymentRelinkDialogComponent } from './mollie-payment-relink-dialog.component';
import { MolliePaymentService } from './mollie-payment.service';
import { BookingService } from '../bookings/booking.service';
import { Booking, MolliePayment, PaymentRelink } from '../../shared/models';

describe('MolliePaymentRelinkDialogComponent', () => {
  const payment = { molliePaymentId: 'p-1' } as MolliePayment;
  const booking = (id: string, number: string) => ({ bookingId: id, bookingNumber: number, bookingStatus: 'aanvraag' }) as Booking;

  async function setup() {
    const service = jasmine.createSpyObj<MolliePaymentService>('MolliePaymentService', ['relink']);
    service.relink.and.returnValue(of({} as PaymentRelink));
    const bookings = jasmine.createSpyObj<BookingService>('BookingService', ['getAll']);
    bookings.getAll.and.returnValue(of([booking('b-1', 'BK-2026-001'), booking('b-2', 'BK-2026-002'), booking('b-3', 'BK-2026-003')]));
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [MolliePaymentRelinkDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MolliePaymentService, useValue: service },
        { provide: BookingService, useValue: bookings },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { payment, currentBookingId: 'b-1' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(MolliePaymentRelinkDialogComponent);
    const component = fixture.componentInstance;
    spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component, service, dialogRef };
  }

  it('biedt alle boekingen behalve de huidige, nieuwste nummer eerst', async () => {
    const { component } = await setup();

    expect(component.bookings().map((b) => b.bookingNumber)).toEqual(['BK-2026-003', 'BK-2026-002']);
  });

  it('vereist een doelboeking en een reden van minstens 5 tekens (witruimte telt niet mee)', async () => {
    const { component } = await setup();

    component.form.patchValue({ targetBookingId: 'b-2', reason: ' ab  ' });
    expect(component.form.invalid).toBeTrue();
    component.form.patchValue({ reason: 'Verkeerde boeking' });
    expect(component.form.valid).toBeTrue();
  });

  it('registreert de herkoppeling met een weggeknipte reden en sluit met true', async () => {
    const { component, service, dialogRef } = await setup();
    component.form.patchValue({ targetBookingId: 'b-2', reason: '  Verkeerde boeking  ' });

    component.save();

    expect(service.relink).toHaveBeenCalledOnceWith('p-1', 'b-2', 'Verkeerde boeking');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('herkoppelt niets zolang het formulier ongeldig is', async () => {
    const { component, service } = await setup();

    component.save();

    expect(service.relink).not.toHaveBeenCalled();
  });

  it('twee keer kort na elkaar opslaan registreert maar één herkoppeling', async () => {
    const { component, service } = await setup();
    component.form.patchValue({ targetBookingId: 'b-2', reason: 'Verkeerde boeking' });
    service.relink.and.returnValue(new Subject<PaymentRelink>());

    component.save();
    component.save();

    expect(service.relink).toHaveBeenCalledTimes(1);
  });

  it('na een fout kan opnieuw geprobeerd worden', async () => {
    const { component, service, dialogRef } = await setup();
    component.form.patchValue({ targetBookingId: 'b-2', reason: 'Verkeerde boeking' });
    service.relink.and.returnValues(throwError(() => new Error('fout')), of({} as PaymentRelink));

    component.save();
    expect(component.saving()).toBeFalse();
    component.save();

    expect(service.relink).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
