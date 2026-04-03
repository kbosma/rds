import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SupplierService } from './supplier.service';
import { ApiService } from '../../core/services/api.service';
import { Supplier } from '../../shared/models';

describe('SupplierService', () => {
  let service: SupplierService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: Supplier = {
    supplierId: 's-1',
    key: 'SUP-HR-001',
    name: 'Hotel Resort Adriatic',
    createdAt: '2026-01-01T10:00:00',
    createdBy: 'user-1',
    modifiedAt: '2026-01-01T10:00:00',
    modifiedBy: 'user-1',
    tenantOrganization: 'org-1',
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getAll', 'getById', 'create', 'update', 'delete']);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });
    service = TestBed.inject(SupplierService);
  });

  it('getAll() should call ApiService with "suppliers"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('suppliers');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('s-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('suppliers', 's-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Supplier> = { name: 'New' };
    apiSpy.create.and.returnValue(of(mock));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('suppliers', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Supplier> = { name: 'Updated' };
    apiSpy.update.and.returnValue(of(mock));
    service.update('s-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('suppliers', 's-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('s-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('suppliers', 's-1');
  });
});