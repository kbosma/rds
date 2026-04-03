import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { MolliePaymentService } from './mollie-payment.service';
import { ApiService } from '../../core/services/api.service';
import { MolliePayment } from '../../shared/models';

/*
 * MolliePaymentService gebruikt TWEE dependencies:
 * - ApiService voor standaard CRUD
 * - HttpClient voor createAtMollie() (directe Mollie API call)
 * We mocken ApiService en gebruiken HttpTestingController voor de rest.
 */
describe('MolliePaymentService', () => {
  let service: MolliePaymentService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let httpTesting: HttpTestingController;

  const mock: MolliePayment = {
    molliePaymentId: 'mp-1',
    molliePaymentExternalId: 'tr_test001',
    status: 'paid',
    method: 'ideal',
    amount: 2450,
    currency: 'EUR',
    description: 'Betaling BK-2026-001',
    checkoutUrl: '',
    createdAt: '2026-01-01T10:00:00',
    createdBy: 'user-1',
    modifiedAt: '2026-01-01T10:00:00',
    modifiedBy: 'user-1',
    tenantOrganization: 'org-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll', 'getById', 'create', 'update', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiSpy },
      ],
    });
    service = TestBed.inject(MolliePaymentService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('getAll() should delegate to ApiService with "mollie/payments"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('mollie/payments');
  });

  it('getById() should delegate to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('mp-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('mollie/payments', 'mp-1');
  });

  it('create() should delegate to ApiService', () => {
    const data: Partial<MolliePayment> = { description: 'New' };
    apiSpy.create.and.returnValue(of(mock));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('mollie/payments', data);
  });

  it('update() should delegate to ApiService', () => {
    const data: Partial<MolliePayment> = { status: 'paid' };
    apiSpy.update.and.returnValue(of(mock));
    service.update('mp-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('mollie/payments', 'mp-1', data);
  });

  it('delete() should delegate to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('mp-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('mollie/payments', 'mp-1');
  });

  it('createAtMollie() should POST directly to Mollie endpoint', () => {
    const request = {
      amount: { currency: 'EUR', value: '100.00' },
      description: 'Test betaling',
      redirectUrl: 'http://localhost/return',
      webhookUrl: 'http://localhost/webhook',
    };

    service.createAtMollie(request).subscribe();

    const req = httpTesting.expectOne('/api/mollie/payments/create-at-mollie');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mock);
  });
});