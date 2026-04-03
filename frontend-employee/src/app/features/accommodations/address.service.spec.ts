import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AddressService } from './address.service';
import { ApiService } from '../../core/services/api.service';
import { Address } from '../../shared/models';

describe('AddressService', () => {
  let service: AddressService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: Address = {
    addressId: 'addr-1',
    street: 'Kerkstraat',
    housenumber: 12,
    housenumberAddition: null,
    postalcode: '9711 AB',
    city: 'Groningen',
    country: 'Nederland',
    addressrole: 'woon',
    createdAt: '2026-01-01T10:00:00',
    createdBy: 'user-1',
    modifiedAt: '2026-01-01T10:00:00',
    modifiedBy: 'user-1',
    tenantOrganization: 'org-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll', 'getById']);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
    service = TestBed.inject(AddressService);
  });

  it('getAll() should call ApiService with "addresses"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('addresses');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('addr-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('addresses', 'addr-1');
  });
});