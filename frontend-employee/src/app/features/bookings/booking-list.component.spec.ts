import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingListComponent } from './booking-list.component';
import { BookingService } from './booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Booking } from '../../shared/models';

describe('BookingListComponent', () => {
  let component: BookingListComponent;
  let fixture: ComponentFixture<BookingListComponent>;
  let serviceSpy: jasmine.SpyObj<BookingService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const mockBookings: Booking[] = [
    {
      bookingId: 'b-1', bookerId: 'bk-1', bookingNumber: 'BK-2026-001',
      bookingStatus: 'aanvraag', fromDate: '2026-07-01', untilDate: '2026-07-14',
      totalSum: 2450, tenantOrganization: 'o-1', createdAt: '2026-04-10T09:00:00',
      createdBy: 'u-1', modifiedAt: '2026-04-10T09:00:00', modifiedBy: 'u-1',
    },
    {
      bookingId: 'b-2', bookerId: 'bk-2', bookingNumber: 'BK-2026-002',
      bookingStatus: 'offerte', fromDate: '2026-08-15', untilDate: '2026-08-22',
      totalSum: 1875.50, tenantOrganization: 'o-1', createdAt: '2026-04-12T10:30:00',
      createdBy: 'u-1', modifiedAt: '2026-04-12T10:30:00', modifiedBy: 'u-1',
    },
  ];

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('BookingService', ['getAll', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockBookings));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [BookingListComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        { provide: BookingService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load bookings on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(serviceSpy.getAll).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
    expect(component.loading()).toBe(false);
  }));

  it('should render booking rows in the table', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr.mat-mdc-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('BK-2026-001');
  }));

  it('should handle errors gracefully', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(BookingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
  }));

  describe('actie-iconen', () => {
    const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
    const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

    it('toont per regel inzien, bewerken en verwijderen met BOOKING_READ/UPDATE/DELETE', fakeAsync(() => {
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(2);
      expect(buttons('action-delete').length).toBe(2);
      for (const a of ['BOOKING_READ', 'BOOKING_UPDATE', 'BOOKING_DELETE']) {
        expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
      }
    }));

    it('verbergt iconen zonder de bijbehorende authority', fakeAsync(() => {
      authSpy.hasAuthority.and.callFake((a: string) => a === 'BOOKING_READ');
      fixture = TestBed.createComponent(BookingListComponent);
      component = fixture.componentInstance;
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
    }));

    it('klikken op de regel navigeert niet meer', fakeAsync(() => {
      load();
      const navigate = spyOn(TestBed.inject(Router), 'navigate');

      (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

      expect(navigate).not.toHaveBeenCalled();
    }));

    it('inzien opent het boekingdetail alleen-lezen', fakeAsync(() => {
      load();
      const navigate = spyOn(TestBed.inject(Router), 'navigate');

      component.viewBooking(mockBookings[0]);

      expect(navigate).toHaveBeenCalledWith(['/bookings', 'b-1'], { queryParams: { readonly: 'true' } });
    }));

    it('bewerken opent het boekingdetail zonder readonly', fakeAsync(() => {
      load();
      const navigate = spyOn(TestBed.inject(Router), 'navigate');

      component.editBooking(mockBookings[1]);

      expect(navigate).toHaveBeenCalledWith(['/bookings', 'b-2']);
    }));

    it('verwijderen: bevestiging noemt het boekingnummer en de gevolgen, daarna service en regel weg', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(of(void 0));

      component.deleteBooking(mockBookings[0]);
      tick();

      const message = confirmSpy.confirmDelete.calls.mostRecent().args[0];
      expect(message).toContain('BK-2026-001');
      expect(serviceSpy.delete).toHaveBeenCalledWith('b-1');
      expect(component.dataSource.data.map(b => b.bookingId)).toEqual(['b-2']);
    }));

    it('verwijderen: geweigerde bevestiging of serverfout laat de lijst staan', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));
      component.deleteBooking(mockBookings[0]);
      tick();
      expect(serviceSpy.delete).not.toHaveBeenCalled();

      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(throwError(() => new Error('nee')));
      component.deleteBooking(mockBookings[0]);
      tick();
      expect(component.dataSource.data.length).toBe(2);
    }));
  });
});
