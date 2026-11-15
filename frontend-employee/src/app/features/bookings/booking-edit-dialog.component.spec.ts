import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { BookingEditDialogComponent } from './booking-edit-dialog.component';
import { Booking, BookingService } from './booking.service';

/*
 * In de boekingsdialoog bevestig je de offerte namens de hoofdboeker. De status kies je hier niet: die zet het systeem
 * (offerte versturen, bevestigen, betalingen, reisdatums); terugzetten gaat via "Status terugzetten". Bevestigen kan
 * alleen in status Offerte met een hoofdboeker. De dialoog stuurt de hele boeking mee, zodat een PUT de hoofdboeker
 * niet loskoppelt.
 */
describe('BookingEditDialogComponent', () => {
  let serviceSpy: jasmine.SpyObj<BookingService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BookingEditDialogComponent>>;

  const booking = (changes: Partial<Booking> = {}): Booking => ({
    bookingId: 'b-1', bookerId: 'bk-1', bookingNumber: 'BK-2026-00001', bookingStatus: 'offerte',
    fromDate: '2026-07-01', untilDate: '2026-07-14', totalSum: 2450, quoteConfirmed: false, quoteConfirmedAt: null,
    tenantOrganization: 'o-1', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
    ...changes,
  });

  function setup(b: Booking) {
    serviceSpy = jasmine.createSpyObj('BookingService', ['update']);
    serviceSpy.update.and.returnValue(of(b));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [BookingEditDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: BookingService, useValue: serviceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { booking: b } },
      ],
    });
    const fixture = TestBed.createComponent(BookingEditDialogComponent);
    spyOn((fixture.componentInstance as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('heeft geen keuzelijst voor de status meer; de status wordt alleen getoond', () => {
    const { el } = setup(booking({ bookingStatus: 'aanvraag' }));

    expect(el.querySelector('mat-select')).toBeNull();
    expect(el.querySelector('.current-status')).not.toBeNull();
    expect(el.querySelector('.status-hint')).not.toBeNull();
  });

  it('bevestigt de offerte in status Offerte met een hoofdboeker en stuurt de hele boeking mee', () => {
    const { fixture, component, el } = setup(booking());
    expect(component.canConfirm).toBeTrue();
    expect(component.confirming()).toBeFalse();

    component.quoteConfirmedControl.setValue(true);
    fixture.detectChanges();

    expect(el.querySelector('.confirm-effect')).not.toBeNull();
    expect(el.querySelector('.next-status')).not.toBeNull();
    component.onSave();
    // de server controleert de huidige status (Offerte) en zet zelf Boeking en het moment van bevestigen
    expect(serviceSpy.update).toHaveBeenCalledWith('b-1', jasmine.objectContaining({
      bookingStatus: 'offerte', bookerId: 'bk-1', quoteConfirmed: true,
    }));
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('slaat niets op zolang er niet bevestigd wordt', () => {
    const { component } = setup(booking());

    component.onSave();

    expect(serviceSpy.update).not.toHaveBeenCalled();
  });

  it('bevestigen kan niet buiten status Offerte en legt uit waarom', () => {
    const { component, el } = setup(booking({ bookingStatus: 'aanvraag' }));

    expect(component.canConfirm).toBeFalse();
    expect(component.quoteConfirmedControl.disabled).toBeTrue();
    expect(el.querySelector('.confirm-hint')).not.toBeNull();
  });

  it('bevestigen kan niet zonder hoofdboeker', () => {
    const { component } = setup(booking({ bookerId: null as unknown as string }));

    expect(component.canConfirm).toBeFalse();
    expect(component.quoteConfirmedControl.disabled).toBeTrue();
  });

  it('een bevestigde offerte blijft bevestigd en toont het moment', () => {
    const { component, el } = setup(booking({ bookingStatus: 'boeking', quoteConfirmed: true, quoteConfirmedAt: '2026-10-21T14:30:00' }));

    expect(component.quoteConfirmedControl.value).toBeTrue();
    expect(component.quoteConfirmedControl.disabled).toBeTrue();
    expect(el.querySelector('.confirmed-on')?.textContent).toContain('21-10-2026 14:30');
  });
});
