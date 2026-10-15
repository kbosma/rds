import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookerAddressService } from './booker-address.service';
import { ApiService } from '../../core/services/api.service';
import { BookerAddress } from '../../shared/models';

describe('BookerAddressService', () => {
  let service: BookerAddressService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  const link: BookerAddress = { bookerId: 'b-1', addressId: 'ad-1' };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll', 'create', 'delete']);
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: apiSpy }] });
    service = TestBed.inject(BookerAddressService);
  });

  it('getAll() roept "booker-addresses" aan', () => {
    apiSpy.getAll.and.returnValue(of([link]));
    service.getAll().subscribe(r => expect(r).toEqual([link]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('booker-addresses');
  });

  it('create() stuurt de koppeling naar "booker-addresses"', () => {
    apiSpy.create.and.returnValue(of(link));
    service.create(link).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('booker-addresses', link);
  });

  it('delete() verwijdert op "bookerId/addressId"', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('b-1', 'ad-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('booker-addresses', 'b-1/ad-1');
  });
});
