import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { ApiService } from '../../core/services/api.service';
import { AccommodationSupplier } from '../../shared/models';

describe('AccommodationSupplierService', () => {
  let service: AccommodationSupplierService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: AccommodationSupplier = {
    accommodationId: 'a-1',
    supplierId: 's-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll']);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
    service = TestBed.inject(AccommodationSupplierService);
  });

  it('getAll() should call ApiService with "accommodation-suppliers"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('accommodation-suppliers');
  });
});