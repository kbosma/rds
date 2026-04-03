import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { AccountListComponent } from './account-list.component';
import { AccountService } from './account.service';
import { Account } from '../../shared/models';

describe('AccountListComponent', () => {
  let component: AccountListComponent;
  let fixture: ComponentFixture<AccountListComponent>;
  let serviceSpy: jasmine.SpyObj<AccountService>;

  const mockAccounts: Account[] = [
    {
      accountId: 'a-1', userName: 'admin@example.com', person: 'Jan de Vries',
      locked: false, mustChangePassword: false, expiresAt: '2027-01-01',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
    },
    {
      accountId: 'a-2', userName: 'user@example.com', person: 'Piet Jansen',
      locked: true, mustChangePassword: true, expiresAt: '2026-06-01',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
    },
  ];

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AccountService', ['getAll']);
    serviceSpy.getAll.and.returnValue(of(mockAccounts));

    await TestBed.configureTestingModule({
      imports: [AccountListComponent, NoopAnimationsModule],
      providers: [{ provide: AccountService, useValue: serviceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load accounts on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(serviceSpy.getAll).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
    expect(component.loading()).toBe(false);
  }));

  it('should apply text filter', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const event = { target: { value: 'admin' } as HTMLInputElement } as unknown as Event;
    component.applyFilter(event);

    expect(component.dataSource.filter).toBe('admin');
  }));

  it('should toggle role chip filter', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.filterByRole('ADMIN');
    expect(component.activeChip()).toBe('ADMIN');

    component.filterByRole('ALL');
    expect(component.activeChip()).toBe('ALL');
  }));

  it('should handle errors gracefully', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(AccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
  }));
});
