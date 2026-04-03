import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BookingLineService } from './booking-line.service';
import { BookingLine } from '../../shared/models';

/*
 * BookingLineService gebruikt HttpClient direct (niet ApiService)
 * omdat het composite keys heeft (bookingId + accommodationId + supplierId).
 * Daarom testen we hier met HttpTestingController.
 */
describe('BookingLineService', () => {
  let service: BookingLineService;
  let httpTesting: HttpTestingController;

  const mockLine: BookingLine = {
    bookingId: 'b-1',
    accommodationId: 'a-1',
    supplierId: 's-1',
    accommodationName: 'Dubrovnik Suite',
    supplierName: 'Hotel Adriatic',
    fromDate: '2026-07-01',
    untilDate: '2026-07-08',
    price: 1400,
    createdAt: '2026-01-01T10:00:00',
    createdBy: 'user-1',
    modifiedAt: '2026-01-01T10:00:00',
    modifiedBy: 'user-1',
    tenantOrganization: 'org-1',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookingLineService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('getAll() should GET /api/booking-lines', () => {
    service.getAll().subscribe((r) => expect(r).toEqual([mockLine]));
    const req = httpTesting.expectOne('/api/booking-lines');
    expect(req.request.method).toBe('GET');
    req.flush([mockLine]);
  });

  it('getByBookingId() should GET /api/booking-lines/{bookingId}', () => {
    service.getByBookingId('b-1').subscribe((r) => expect(r).toEqual([mockLine]));
    const req = httpTesting.expectOne('/api/booking-lines/b-1');
    expect(req.request.method).toBe('GET');
    req.flush([mockLine]);
  });

  it('getById() should GET with composite key in URL', () => {
    service.getById('b-1', 'a-1', 's-1').subscribe((r) => expect(r).toEqual(mockLine));
    const req = httpTesting.expectOne('/api/booking-lines/b-1/a-1/s-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockLine);
  });

  it('create() should POST to /api/booking-lines', () => {
    const data: Partial<BookingLine> = { bookingId: 'b-1', accommodationId: 'a-1' };
    service.create(data).subscribe();
    const req = httpTesting.expectOne('/api/booking-lines');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush(mockLine);
  });

  it('update() should PUT with composite key in URL', () => {
    const data: Partial<BookingLine> = { price: 1500 };
    service.update('b-1', 'a-1', 's-1', data).subscribe();
    const req = httpTesting.expectOne('/api/booking-lines/b-1/a-1/s-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(data);
    req.flush(mockLine);
  });

  it('delete() should DELETE with composite key in URL', () => {
    service.delete('b-1', 'a-1', 's-1').subscribe();
    const req = httpTesting.expectOne('/api/booking-lines/b-1/a-1/s-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});