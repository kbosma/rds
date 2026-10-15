import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { AccountListComponent } from './account-list.component';
import { AccountService } from './account.service';
import { PersonService } from './person.service';
import { OrganizationService } from './organization.service';
import { AccountRoleService } from './account-role.service';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Account } from '../../shared/models';

describe('AccountListComponent', () => {
  let component: AccountListComponent;
  let fixture: ComponentFixture<AccountListComponent>;
  let serviceSpy: jasmine.SpyObj<AccountService>;
  let authStub: { hasAuthority: jasmine.Spy };
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const mockAccounts: Account[] = [
    {
      accountId: 'a-1', userName: 'admin@example.com', personId: 'p-1',
      locked: false, mustChangePassword: false, totpEnabled: false, expiresAt: '2027-01-01',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
    },
    {
      accountId: 'a-2', userName: 'user@example.com', personId: 'p-2',
      locked: true, mustChangePassword: true, totpEnabled: false, expiresAt: '2026-06-01',
      createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
    },
  ];

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AccountService', ['getAll', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockAccounts));
    authStub = { hasAuthority: jasmine.createSpy('hasAuthority').and.returnValue(true) };
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [AccountListComponent, NoopAnimationsModule],
      providers: [
        { provide: AccountService, useValue: serviceSpy },
        // Admin → organisaties worden geladen en als chips getoond
        { provide: AuthService, useValue: authStub },
        { provide: ConfirmService, useValue: confirmSpy },
        // account-list verrijkt via forkJoin met personen, organisaties en account-rollen
        { provide: PersonService, useValue: { getAll: () => of([
          { persoonId: 'p-1', firstname: 'Jan', prefix: 'de', lastname: 'Vries', organizationId: 'o-1' },
          { persoonId: 'p-2', firstname: 'Piet', prefix: '', lastname: 'Jansen', organizationId: 'o-1' },
        ]) } },
        { provide: OrganizationService, useValue: { getAll: () => of([
          { organizationId: 'o-1', name: 'Puur Kroatië' },
        ]) } },
        { provide: AccountRoleService, useValue: { getAll: () => of([
          { account: { accountId: 'a-1' }, role: { description: 'ADMIN' } },
          { account: { accountId: 'a-2' }, role: { description: 'EMPLOYEE' } },
        ]) } },
      ],
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

  it('should enrich accounts with person name, organization and roles', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const rows = component.dataSource.data as unknown as Array<Record<string, unknown>>;
    const admin = rows.find(r => r['accountId'] === 'a-1')!;
    expect(admin['personName']).toBe('Jan de Vries');
    expect(admin['organizationName']).toBe('Puur Kroatië');
    expect(admin['roleDescriptions']).toEqual(['ADMIN']);

    // org-chips bevatten de geladen organisatie
    expect(component.orgChips().some(c => c.value === 'o-1')).toBe(true);
  }));

  it('should toggle role chip filter', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.filterByRole('ADMIN');
    expect(component.activeRoleChip()).toBe('ADMIN');

    component.filterByRole('ALL');
    expect(component.activeRoleChip()).toBe('ALL');
  }));

  it('should handle errors gracefully', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(AccountListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
  }));

  describe('actie-iconen', () => {
    const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
    const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

    it('toont per regel inzien, bewerken en verwijderen met ACCOUNT_READ/UPDATE/DELETE', fakeAsync(() => {
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(2);
      expect(buttons('action-delete').length).toBe(2);
      for (const a of ['ACCOUNT_READ', 'ACCOUNT_UPDATE', 'ACCOUNT_DELETE']) {
        expect(authStub.hasAuthority).toHaveBeenCalledWith(a);
      }
    }));

    it('verbergt iconen zonder de bijbehorende authority', fakeAsync(() => {
      authStub.hasAuthority.and.callFake((a: string) => a === 'ACCOUNT_READ');
      fixture = TestBed.createComponent(AccountListComponent);
      component = fixture.componentInstance;
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
    }));

    it('inzien opent de detailpagina alleen-lezen (?readonly=true)', fakeAsync(() => {
      load();
      const navigate = spyOn((component as unknown as { router: Router }).router, 'navigate');

      component.viewAccount(component.dataSource.data[0]);

      expect(navigate).toHaveBeenCalledWith(['/admin/accounts', 'a-1'], { queryParams: { readonly: 'true' } });
    }));

    it('bewerken opent dezelfde pagina zonder readonly', fakeAsync(() => {
      load();
      const navigate = spyOn((component as unknown as { router: Router }).router, 'navigate');

      component.navigateToEdit(component.dataSource.data[1]);

      expect(navigate).toHaveBeenCalledWith(['/admin/accounts', 'a-2']);
    }));

    it('verwijderen: bevestigen, service aanroepen en de regel verdwijnt', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(of(void 0));

      component.deleteAccount(component.dataSource.data[0]);
      tick();

      expect(serviceSpy.delete).toHaveBeenCalledWith('a-1');
      expect(component.dataSource.data.map(a => a.accountId)).toEqual(['a-2']);
    }));

    it('verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.deleteAccount(component.dataSource.data[0]);
      tick();

      expect(serviceSpy.delete).not.toHaveBeenCalled();
      expect(component.dataSource.data.length).toBe(2);
    }));
  });

  describe('organisaties tonen (ORGANIZATION_READ, geen rol)', () => {
    it('met ORGANIZATION_READ: organisatiekolom', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(authStub.hasAuthority).toHaveBeenCalledWith('ORGANIZATION_READ');
      expect(component.displayedColumns).toContain('organization');
    }));

    it('zonder ORGANIZATION_READ: geen organisatiekolom', fakeAsync(() => {
      authStub.hasAuthority.and.callFake((a: string) => a !== 'ORGANIZATION_READ');
      fixture = TestBed.createComponent(AccountListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();

      expect(component.displayedColumns).not.toContain('organization');
    }));
  });
});
