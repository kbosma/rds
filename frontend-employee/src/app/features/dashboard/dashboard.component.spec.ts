import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { Booking } from '../../shared/models';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let bookingServiceSpy: jasmine.SpyObj<BookingService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

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
    bookingServiceSpy = jasmine.createSpyObj('BookingService', ['getAll']);
    bookingServiceSpy.getAll.and.returnValue(of(mockBookings));

    authServiceSpy = jasmine.createSpyObj('AuthService', ['currentUser'], {
      currentUser: () => ({ accountId: 'u-1', organizationId: 'o-1', roles: ['ADMIN'], authorities: [] }),
    });

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        { provide: BookingService, useValue: bookingServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load bookings on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(bookingServiceSpy.getAll).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  }));
});