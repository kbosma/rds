import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccommodationAddressService } from './accommodation-address.service';
import { ApiService } from '../../core/services/api.service';
import { AccommodationAddress } from '../../shared/models';

describe('AccommodationAddressService', () => {
  let service: AccommodationAddressService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: AccommodationAddress = {
    accommodationId: 'a-1',
    addressId: 'addr-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll']);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
    service = TestBed.inject(AccommodationAddressService);
  });

  it('getAll() should call ApiService with "accommodation-addresses"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('accommodation-addresses');
  });
});