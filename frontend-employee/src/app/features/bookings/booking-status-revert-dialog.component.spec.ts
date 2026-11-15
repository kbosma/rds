import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { BookingStatusRevertDialogComponent } from './booking-status-revert-dialog.component';
import { Booking, BookingService } from './booking.service';

/* Status terugzetten: alleen naar een eerdere status, altijd met reden (minstens 5 tekens). */
describe('BookingStatusRevertDialogComponent', () => {
  let serviceSpy: jasmine.SpyObj<BookingService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BookingStatusRevertDialogComponent>>;

  const booking = { bookingId: 'b-1', bookingNumber: 'BK-1', bookingStatus: 'voorschot', quoteConfirmed: true } as Booking;

  function setup() {
    serviceSpy = jasmine.createSpyObj('BookingService', ['revertStatus']);
    serviceSpy.revertStatus.and.returnValue(of({ ...booking, bookingStatus: 'offerte' }));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [BookingStatusRevertDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: BookingService, useValue: serviceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { booking } },
      ],
    });
    const fixture = TestBed.createComponent(BookingStatusRevertDialogComponent);
    const snack = spyOn((fixture.componentInstance as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, snack };
  }

  it('biedt alleen eerdere statussen aan, de dichtstbijzijnde eerst', () => {
    const { component } = setup();

    expect(component.targets).toEqual(['boeking', 'offerte', 'aanvraag']);
  });

  it('vraagt een reden van minstens 5 tekens', () => {
    const { component } = setup();
    component.form.setValue({ targetStatus: 'boeking', reason: 'kort' });

    expect(component.form.invalid).toBeTrue();
    component.revert();
    expect(serviceSpy.revertStatus).not.toHaveBeenCalled();
  });

  it('waarschuwt dat terug naar offerte de bevestiging ongedaan maakt, en zet terug', () => {
    const { fixture, component, el } = setup();
    component.form.setValue({ targetStatus: 'offerte', reason: '  Klant wil een andere periode ' });
    fixture.detectChanges();

    expect(el.querySelector('.unconfirm-warning')).not.toBeNull();
    component.revert();
    expect(serviceSpy.revertStatus).toHaveBeenCalledWith('b-1', 'offerte', 'Klant wil een andere periode');
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('meldt het als alleen een manager mag terugzetten (403)', () => {
    const { component, snack } = setup();
    serviceSpy.revertStatus.and.returnValue(throwError(() => ({ status: 403 })));
    component.form.setValue({ targetStatus: 'boeking', reason: 'Toch nog aanpassen' });

    component.revert();

    expect(snack).toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });
});
