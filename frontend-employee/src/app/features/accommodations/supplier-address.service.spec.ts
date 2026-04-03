import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SupplierAddressService } from './supplier-address.service';
import { ApiService } from '../../core/services/api.service';
import { SupplierAddress } from '../../shared/models';

describe('SupplierAddressService', () => {
  let service: SupplierAddressService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: SupplierAddress = {
    supplierId: 's-1',
    addressId: 'addr-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll']);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
    service = TestBed.inject(SupplierAddressService);
  });

  it('getAll() should call ApiService with "supplier-addresses"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('supplier-addresses');
  });
});