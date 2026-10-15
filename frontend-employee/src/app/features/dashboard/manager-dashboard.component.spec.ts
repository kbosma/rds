import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { BookingService } from '../bookings/booking.service';
import { BookingLineService } from '../bookings/booking-line.service';
import { MolliePaymentService } from '../mollie/mollie-payment.service';
import { AuthService } from '../../core/auth/auth.service';
import { Booking } from '../../shared/models';

/*
 * De booking-laad-logica is bij de dashboard-refactor naar het manager-dashboard
 * verhuisd. We dekken die hier af: laden + de jaar-gebaseerde stats.
 */
describe('ManagerDashboardComponent', () => {
  let component: ManagerDashboardComponent;
  let fixture: ComponentFixture<ManagerDashboardComponent>;

  const year = new Date().getFullYear();
  const mockBookings: Booking[] = [
    {
      bookingId: 'b-1', bookerId: 'bk-1', bookingNumber: 'BK-1', bookingStatus: 'boeking',
      fromDate: `${year}-07-01`, untilDate: `${year}-07-08`, totalSum: 2450,
      tenantOrganization: 'o-1', createdAt: `${year}-04-10T09:00:00`, createdBy: 'u',
      modifiedAt: `${year}-04-10T09:00:00`, modifiedBy: 'u',
    },
    {
      bookingId: 'b-2', bookerId: 'bk-2', bookingNumber: 'BK-2', bookingStatus: 'offerte',
      fromDate: `${year}-08-15`, untilDate: `${year}-08-22`, totalSum: 1875.50,
      tenantOrganization: 'o-1', createdAt: `${year}-04-12T10:00:00`, createdBy: 'u',
      modifiedAt: `${year}-04-12T10:00:00`, modifiedBy: 'u',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerDashboardComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [
        { provide: BookingService, useValue: { getAll: () => of(mockBookings) } },
        { provide: BookingLineService, useValue: { getAll: () => of([]) } },
        { provide: MolliePaymentService, useValue: { getAll: () => of([]), getAllStatusEntries: () => of([]) } },
        { provide: AuthService, useValue: { currentUser: () => ({ personName: 'Manager', organizationName: 'Org', roles: ['MANAGER'] }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load bookings and compute the year stats', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
    expect(component.totalBookings()).toBe(2);        // beide boekingen vallen in dit jaar
    expect(component.totalRevenue()).toBe(4325.50);   // 2450 + 1875.50
  }));
});
