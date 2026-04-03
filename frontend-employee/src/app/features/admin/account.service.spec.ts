import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountService } from './account.service';
import { ApiService } from '../../core/services/api.service';
import { Account } from '../../shared/models';

describe('AccountService', () => {
  let service: AccountService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  const mock: Account = {
    accountId: 'acc-1',
    userName: 'jan.vanbergen',
    person: 'Jan van Bergen',
    locked: false,
    mustChangePassword: false,
    expiresAt: '2027-01-01T00:00:00',
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
    service = TestBed.inject(AccountService);
  });

  it('getAll() should call ApiService with "accounts"', () => {
    apiSpy.getAll.and.returnValue(of([mock]));
    service.getAll().subscribe((r) => expect(r).toEqual([mock]));
    expect(apiSpy.getAll).toHaveBeenCalledWith('accounts');
  });

  it('getById() should pass id to ApiService', () => {
    apiSpy.getById.and.returnValue(of(mock));
    service.getById('acc-1').subscribe((r) => expect(r).toEqual(mock));
    expect(apiSpy.getById).toHaveBeenCalledWith('accounts', 'acc-1');
  });

  it('create() should pass body to ApiService', () => {
    const data: Partial<Account> = { userName: 'new.user' };
    apiSpy.create.and.returnValue(of(mock));
    service.create(data).subscribe();
    expect(apiSpy.create).toHaveBeenCalledWith('accounts', data);
  });

  it('update() should pass id and body to ApiService', () => {
    const data: Partial<Account> = { locked: true };
    apiSpy.update.and.returnValue(of(mock));
    service.update('acc-1', data).subscribe();
    expect(apiSpy.update).toHaveBeenCalledWith('accounts', 'acc-1', data);
  });

  it('delete() should pass id to ApiService', () => {
    apiSpy.delete.and.returnValue(of(void 0));
    service.delete('acc-1').subscribe();
    expect(apiSpy.delete).toHaveBeenCalledWith('accounts', 'acc-1');
  });
});