import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BookingDetailComponent } from './booking-detail.component';
import { BookingService } from './booking.service';
import { BookingLineService } from './booking-line.service';
import { BookerService } from '../bookers/booker.service';
import { TravelerService } from '../travelers/traveler.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Booking, Booker, Traveler, BookingLine, MolliePayment } from '../../shared/models';

describe('BookingDetailComponent', () => {
  let component: BookingDetailComponent;
  let fixture: ComponentFixture<BookingDetailComponent>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let bookingLineServiceSpy: jasmine.SpyObj<BookingLineService>;
  let bookerServiceSpy: jasmine.SpyObj<BookerService>;
  let travelerServiceSpy: jasmine.SpyObj<TravelerService>;
  let router: Router;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let confirmServiceSpy: jasmine.SpyObj<ConfirmService>;

  let routeId: string;
  let queryBookerId: string | null;
  let queryReadonly: string | null;

  const mockBooking: Booking = {
    bookingId: 'b-1', bookerId: 'bk-1', bookingNumber: 'BK-2026-001',
    bookingStatus: 'aanvraag', fromDate: '2026-07-01', untilDate: '2026-07-14',
    totalSum: 2450, tenantOrganization: 'o-1', createdAt: '2026-04-10T09:00:00',
    createdBy: 'u-1', modifiedAt: '2026-04-10T09:00:00', modifiedBy: 'u-1',
  };

  const mockBooker: Booker = {
    bookerId: 'bk-1', firstname: 'Klaas', prefix: 'van', lastname: 'Houten',
    callsign: 'Klaas', telephone: '0612345678', emailaddress: 'klaas@example.com',
    gender: 'man', birthdate: '1985-03-15', initials: 'K.', status: 'active',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '',
  };

  const mockTravelers: Traveler[] = [
    {
      travelerId: 't-1', bookingId: 'b-1', firstname: 'Inge', prefix: 'van',
      lastname: 'Houten', gender: 'vrouw', birthdate: '1987-07-20', initials: 'I.',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '',
    },
  ];

  const mockLines: BookingLine[] = [
    {
      bookingLineId: 'bl-1',
      bookingId: 'b-1', accommodationId: 'a-1', supplierId: 's-1',
      accommodationName: 'Dubrovnik Suite', supplierName: 'Hotel Adriatic',
      fromDate: '2026-07-01', untilDate: '2026-07-08', price: 1400,
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '',
    },
  ];

  beforeEach(async () => {
    routeId = 'b-1';
    queryBookerId = null;
    queryReadonly = null;

    bookingServiceSpy = jasmine.createSpyObj('BookingService', ['getAll', 'getById', 'create', 'update', 'delete']);
    bookingLineServiceSpy = jasmine.createSpyObj('BookingLineService', ['getByBookingId']);
    bookerServiceSpy = jasmine.createSpyObj('BookerService', ['getById']);
    travelerServiceSpy = jasmine.createSpyObj('TravelerService', ['getAll']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    confirmServiceSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmServiceSpy.confirm.and.returnValue(Promise.resolve(true));
    confirmServiceSpy.confirmDelete.and.returnValue(Promise.resolve(true));

    bookingServiceSpy.getById.and.returnValue(of(mockBooking));
    bookingServiceSpy.update.and.returnValue(of(mockBooking));
    bookingServiceSpy.create.and.returnValue(of(mockBooking));
    bookerServiceSpy.getById.and.returnValue(of(mockBooker));
    travelerServiceSpy.getAll.and.returnValue(of(mockTravelers));
    bookingLineServiceSpy.getByBookingId.and.returnValue(of(mockLines));

    await TestBed.configureTestingModule({
      imports: [BookingDetailComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        { provide: BookingService, useValue: bookingServiceSpy },
        { provide: BookingLineService, useValue: bookingLineServiceSpy },
        { provide: BookerService, useValue: bookerServiceSpy },
        { provide: TravelerService, useValue: travelerServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: ConfirmService, useValue: confirmServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId }, queryParamMap: { get: (k: string) => (k === 'readonly' ? queryReadonly : queryBookerId) } } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  function createComponent() {
    fixture = TestBed.createComponent(BookingDetailComponent);
    component = fixture.componentInstance;
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should load booking details for existing booking', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();

    expect(bookingServiceSpy.getById).toHaveBeenCalledWith('b-1');
    expect(component.isNew()).toBe(false);
    expect(component.currentBookingNumber()).toBe('BK-2026-001');
    expect(component.loading()).toBe(false);
  }));

  it('should load booker, travelers and booking lines', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();

    expect(bookerServiceSpy.getById).toHaveBeenCalledWith('bk-1');
    expect(component.booker()?.firstname).toBe('Klaas');
    expect(component.travelers().length).toBe(1);
    expect(component.bookingLines().length).toBe(1);
  }));

  it('should set concept mode (isNew) for a new booking route with a prefilled booker', fakeAsync(() => {
    routeId = 'new';
    queryBookerId = 'bk-1';
    createComponent();
    fixture.detectChanges();
    tick();

    expect(component.isNew()).toBe(true);
    // concept: geen boeking geladen, wel de voorgevulde hoofdboeker
    expect(bookingServiceSpy.getById).not.toHaveBeenCalled();
    expect(bookerServiceSpy.getById).toHaveBeenCalledWith('bk-1');
  }));

  describe('concept-boeking voor een prospect', () => {
    function startConcept() {
      routeId = 'new';
      queryBookerId = 'bk-1';
      createComponent();
      fixture.detectChanges();
      tick();
      spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(undefined) } as never);
    }

    it('laadt de boeker opnieuw zodra de boeking is vastgelegd, want de backend maakt de prospect ACTIVE', fakeAsync(() => {
      bookerServiceSpy.getById.and.returnValues(of({ ...mockBooker, status: 'prospect' }), of({ ...mockBooker, status: 'active' }));
      startConcept();
      expect(component.booker()?.status).toBe('prospect');

      component.openBookingLineDialog(); // legt de concept-boeking vast (na bevestiging) en opent dan het dialoog
      tick();

      expect(bookingServiceSpy.create).toHaveBeenCalledTimes(1);
      expect(bookerServiceSpy.getById).toHaveBeenCalledTimes(2);
      expect(component.booker()?.status).toBe('active');
    }));

    it('laadt een boeker die al actief is niet opnieuw', fakeAsync(() => {
      startConcept(); // mockBooker is ACTIVE
      component.openBookingLineDialog();
      tick();

      expect(bookingServiceSpy.create).toHaveBeenCalledTimes(1);
      expect(bookerServiceSpy.getById).toHaveBeenCalledTimes(1);
    }));
  });

  it('should redirect to the overview for /new without a booker', fakeAsync(() => {
    routeId = 'new';
    queryBookerId = null;
    createComponent();
    fixture.detectChanges();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
  }));

  // De unified onSave()/saving() is weg-gerefactord; opslaan gebeurt nu via gerichte
  // acties. We dekken dat af met removeBooker(), die via bookingService.update persisteert.
  it('should persist booker removal via bookingService.update', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();

    // removeBooker() vraagt bevestiging via ConfirmService (mock geeft true)
    component.removeBooker();
    tick();

    expect(bookingServiceSpy.update).toHaveBeenCalledWith('b-1', { bookerId: null as unknown as string });
    expect(component.booker()).toBeNull();
  }));

  it('should navigate back on load error', fakeAsync(() => {
    bookingServiceSpy.getById.and.returnValue(throwError(() => new Error('not found')));
    createComponent();
    fixture.detectChanges();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
  }));

  it('should open the e-mail dialog for this booking (main booker is the recipient)', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();
    const openSpy = spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open');

    component.openEmailDialog();

    expect(openSpy).toHaveBeenCalledTimes(1);
    const config = openSpy.calls.mostRecent().args[1] as { data: { booking?: { bookingId: string; bookingNumber: string }; template?: unknown } };
    expect(config.data.booking).toEqual({ bookingId: 'b-1', bookingNumber: 'BK-2026-001' });
    expect(config.data.template).toBeUndefined(); // de gebruiker kiest de template in de dialoog
  }));

  it('should open the read-only payment dialog with the payment and the booking number', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();
    const openSpy = spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').and.returnValue({ afterClosed: () => of(false) } as never);
    const payment = { molliePaymentId: 'p-1', description: 'Voorschot' } as MolliePayment;

    component.viewPayment(payment);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const config = openSpy.calls.mostRecent().args[1] as { data: { payment: MolliePayment; bookingNumber: string; canCorrect: boolean } };
    expect(config.data.payment).toBe(payment);
    expect(config.data.bookingNumber).toBe('BK-2026-001');
    expect(typeof config.data.canCorrect).toBe('boolean'); // alleen met PAYMENT_CORRECT (en niet alleen-lezen)
  }));

  it('should not open the e-mail dialog for a concept booking that is not saved yet', fakeAsync(() => {
    routeId = 'new';
    queryBookerId = 'bk-1';
    createComponent();
    fixture.detectChanges();
    tick();
    const openSpy = spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open');

    component.openEmailDialog();

    expect(openSpy).not.toHaveBeenCalled();
  }));

  describe('alleen inzien (?readonly=true)', () => {
    it('is standaard uit', fakeAsync(() => {
      createComponent();
      fixture.detectChanges();
      tick();

      expect(component.readOnly()).toBe(false);
    }));

    it('zet de modus aan voor een bestaande boeking', fakeAsync(() => {
      queryReadonly = 'true';
      createComponent();
      fixture.detectChanges();
      tick();

      expect(component.readOnly()).toBe(true);
    }));

    it('geen enkele wijzigende actie is dan toegestaan, ook niet met alle authorities', fakeAsync(() => {
      queryReadonly = 'true';
      createComponent();
      fixture.detectChanges();
      tick();

      expect(component.can('BOOKING_UPDATE')).toBe(false);
      expect(component.can('BOOKING_DELETE')).toBe(false);
      expect(component.can('DOCUMENT_CREATE')).toBe(false);
      expect(component.can('EMAIL_SEND')).toBe(false);
    }));

    it('verbergt in de DOM alle wijzig- en toevoeg-knoppen', fakeAsync(() => {
      queryReadonly = 'true';
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('button.card-header-btn').length).toBe(0);
      const icons = Array.from(el.querySelectorAll('button mat-icon')).map(i => i.textContent?.trim());
      expect(icons).not.toContain('edit');
      expect(icons).not.toContain('delete');
      expect(icons).not.toContain('add');
    }));

    it('gebruikt een andere titel', fakeAsync(() => {
      queryReadonly = 'true';
      createComponent();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Boeking inzien');
    }));

    it('zonder readonly werkt can() gewoon met de authority van de gebruiker', fakeAsync(() => {
      createComponent();
      fixture.detectChanges();
      tick();
      const hasAuthority = spyOn(component.authService, 'hasAuthority').and.callFake((a: string) => a === 'BOOKING_UPDATE');

      expect(component.can('BOOKING_UPDATE')).toBe(true);
      expect(component.can('BOOKING_DELETE')).toBe(false);
      expect(hasAuthority).toHaveBeenCalled();
    }));
  });
});
