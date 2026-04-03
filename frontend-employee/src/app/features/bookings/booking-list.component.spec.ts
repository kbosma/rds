import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BookingListComponent } from './booking-list.component';
import { BookingService } from './booking.service';
import { Booking } from '../../shared/models';

describe('BookingListComponent', () => {
  let component: BookingListComponent;
  let fixture: ComponentFixture<BookingListComponent>;
  let serviceSpy: jasmine.SpyObj<BookingService>;

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
    serviceSpy = jasmine.createSpyObj('BookingService', ['getAll']);
    serviceSpy.getAll.and.returnValue(of(mockBookings));

    await TestBed.configureTestingModule({
      imports: [BookingListComponent, NoopAnimationsModule, RouterModule.forRoot([])],
      providers: [{ provide: BookingService, useValue: serviceSpy }],
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
});