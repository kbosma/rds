import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrganizationService } from './organization.service';
import { ApiService } from '../../core/services/api.service';
import { Organization } from '../../shared/models';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: Organization = {
    organizationId: 'org-1',
    name: 'Puurkroatie',
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
    service = TestBed.inject(OrganizationService);
  });

  it('getAll() should call ApiService with "organizations"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('organizations');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('org-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('organizations', 'org-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Organization> = { name: 'New Org' };
    apiSpy.create.and.returnValue(of(mock));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('organizations', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Organization> = { name: 'Updated' };
    apiSpy.update.and.returnValue(of(mock));
    service.update('org-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('organizations', 'org-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('org-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('organizations', 'org-1');
  });
});