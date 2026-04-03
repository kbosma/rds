import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookingService } from './booking.service';
import { ApiService } from '../../core/services/api.service';
import { Booking } from '../../shared/models';

describe('BookingService', () => {
  let service: BookingService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockBooking: Booking = {
    bookingId: 'b-1',
    bookerId: 'bk-1',
    bookingNumber: 'BK-2026-001',
    bookingStatus: 'aanvraag',
    fromDate: '2026-07-01',
    untilDate: '2026-07-14',
    totalSum: 2450,
    tenantOrganization: 'org-1',
    createdAt: '2026-01-01T10:00:00',
    createdBy: 'user-1',
    modifiedAt: '2026-01-01T10:00:00',
    modifiedBy: 'user-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll', 'getById', 'create', 'update', 'delete']);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
    service = TestBed.inject(BookingService);
  });

  it('getAll() should call ApiService with "bookings"', () => {
    apiSpy.getAll.and.returnValue(of([mockBooking]));
    service.getAll().subscribe((r) => expect(r).toEqual([mockBooking]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('bookings');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mockBooking));
    service.getById('b-1').subscribe((r) => expect(r).toEqual(mockBooking));
    expect(apiSpy.getById).toHaveBeenCalledWith('bookings', 'b-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Booking> = { bookingNumber: 'BK-NEW' };
    apiSpy.create.and.returnValue(of(mockBooking));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('bookings', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Booking> = { bookingStatus: 'offerte' };
    apiSpy.update.and.returnValue(of(mockBooking));
    service.update('b-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('bookings', 'b-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('b-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('bookings', 'b-1');
  });
});