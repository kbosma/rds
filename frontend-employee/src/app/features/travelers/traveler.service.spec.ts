import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TravelerService } from './traveler.service';
import { ApiService } from '../../core/services/api.service';
import { Traveler } from '../../shared/models';

describe('TravelerService', () => {
  let service: TravelerService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mockTraveler: Traveler = {
    travelerId: 't-1',
    bookingId: 'b-1',
    firstname: 'Inge',
    prefix: 'van',
    lastname: 'Houten',
    gender: 'vrouw',
    birthdate: '1987-07-20',
    initials: 'I.',
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
    service = TestBed.inject(TravelerService);
  });

  it('getAll() should call ApiService with "travelers"', () => {
    apiSpy.getAll.and.returnValue(of([mockTraveler]));
    service.getAll().subscribe((r) => expect(r).toEqual([mockTraveler]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('travelers');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mockTraveler));
    service.getById('t-1').subscribe((r) => expect(r).toEqual(mockTraveler));
    expect(apiSpy.getById).toHaveBeenCalledWith('travelers', 't-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Traveler> = { firstname: 'Pieter' };
    apiSpy.create.and.returnValue(of(mockTraveler));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('travelers', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Traveler> = { firstname: 'Updated' };
    apiSpy.update.and.returnValue(of(mockTraveler));
    service.update('t-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('travelers', 't-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('t-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('travelers', 't-1');
  });
});