import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PersonService } from './person.service';
import { ApiService } from '../../core/services/api.service';
import { Person } from '../../shared/models';

describe('PersonService', () => {
  let service: PersonService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: Person = {
    persoonId: 'p-1',
    firstname: 'Jan',
    prefix: 'van',
    lastname: 'Bergen',
    organization: 'Puurkroatie',
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
    service = TestBed.inject(PersonService);
  });

  it('getAll() should call ApiService with "persons"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('persons');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('p-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('persons', 'p-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Person> = { firstname: 'Pieter' };
    apiSpy.create.and.returnValue(of(mock));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('persons', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Person> = { firstname: 'Updated' };
    apiSpy.update.and.returnValue(of(mock));
    service.update('p-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('persons', 'p-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('p-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('persons', 'p-1');
  });
});