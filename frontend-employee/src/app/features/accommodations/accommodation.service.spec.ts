import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccommodationService } from './accommodation.service';
import { ApiService } from '../../core/services/api.service';
import { Accommodation } from '../../shared/models';

describe('AccommodationService', () => {
  let service: AccommodationService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: Accommodation = {
    accommodationId: 'a-1',
    key: 'ACC-DUB-001',
    name: 'Dubrovnik Zeezicht Suite',
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
    service = TestBed.inject(AccommodationService);
  });

  it('getAll() should call ApiService with "accommodations"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('accommodations');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('a-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('accommodations', 'a-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Accommodation> = { name: 'New' };
    apiSpy.create.and.returnValue(of(mock));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('accommodations', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Accommodation> = { name: 'Updated' };
    apiSpy.update.and.returnValue(of(mock));
    service.update('a-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('accommodations', 'a-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('a-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('accommodations', 'a-1');
  });
});