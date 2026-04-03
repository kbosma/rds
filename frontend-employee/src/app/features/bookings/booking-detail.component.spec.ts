import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BookingDetailComponent } from './booking-detail.component';
import { BookingService } from './booking.service';
import { BookingLineService } from './booking-line.service';
import { BookerService } from '../bookers/booker.service';
import { TravelerService } from '../travelers/traveler.service';
import { Booking, Booker, Traveler, BookingLine } from '../../shared/models';

describe('BookingDetailComponent', () => {
  let component: BookingDetailComponent;
  let fixture: ComponentFixture<BookingDetailComponent>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let bookingLineServiceSpy: jasmine.SpyObj<BookingLineService>;
  let bookerServiceSpy: jasmine.SpyObj<BookerService>;
  let travelerServiceSpy: jasmine.SpyObj<TravelerService>;
  let router: Router;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  let routeId: string;

  const mockBooking: Booking = {
    bookingId: 'b-1', bookerId: 'bk-1', bookingNumber: 'BK-2026-001',
    bookingStatus: 'aanvraag', fromDate: '2026-07-01', untilDate: '2026-07-14',
    totalSum: 2450, tenantOrganization: 'o-1', createdAt: '2026-04-10T09:00:00',
    createdBy: 'u-1', modifiedAt: '2026-04-10T09:00:00', modifiedBy: 'u-1',
  };

  const mockBooker: Booker = {
    bookerId: 'bk-1', firstname: 'Klaas', prefix: 'van', lastname: 'Houten',
    callsign: 'Klaas', telephone: '0612345678', emailaddress: 'klaas@example.com',
    gender: 'man', birthdate: '1985-03-15', initials: 'K.',
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
      bookingId: 'b-1', accommodationId: 'a-1', supplierId: 's-1',
      accommodationName: 'Dubrovnik Suite', supplierName: 'Hotel Adriatic',
      fromDate: '2026-07-01', untilDate: '2026-07-08', price: 1400,
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '',
    },
  ];

  beforeEach(async () => {
    routeId = 'b-1';

    bookingServiceSpy = jasmine.createSpyObj('BookingService', ['getAll', 'getById', 'create', 'update', 'delete']);
    bookingLineServiceSpy = jasmine.createSpyObj('BookingLineService', ['getByBookingId']);
    bookerServiceSpy = jasmine.createSpyObj('BookerService', ['getById']);
    travelerServiceSpy = jasmine.createSpyObj('TravelerService', ['getAll']);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId } } } },
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

  it('should set isNew for new booking route', fakeAsync(() => {
    routeId = 'new';
    createComponent();
    fixture.detectChanges();
    tick();

    expect(component.isNew()).toBe(true);
    expect(bookingServiceSpy.getById).not.toHaveBeenCalled();
  }));

  it('should call update on save for existing booking', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();

    expect(component.isNew()).toBe(false);
    component.onSave();
    flush();

    expect(bookingServiceSpy.update).toHaveBeenCalled();
  }));

  it('should handle save error gracefully', fakeAsync(() => {
    bookingServiceSpy.update.and.returnValue(throwError(() => new Error('fail')));
    createComponent();
    fixture.detectChanges();
    tick();

    component.onSave();
    flush();

    expect(component.saving()).toBe(false);
  }));

  it('should navigate back on load error', fakeAsync(() => {
    bookingServiceSpy.getById.and.returnValue(throwError(() => new Error('not found')));
    createComponent();
    fixture.detectChanges();
    tick();

    expect(router.navigate).toHaveBeenCalledWith(['/bookings']);
  }));
});