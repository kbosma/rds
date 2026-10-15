import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { OrganizationService } from '../admin/organization.service';
import { PersonService } from '../admin/person.service';
import { AccountService } from '../admin/account.service';
import { RoleService } from '../admin/role.service';
import { AccountRoleService } from '../admin/account-role.service';
import { AuthService } from '../../core/auth/auth.service';

/*
 * Het admin-dashboard laadt de beheer-stats (organisaties/personen/accounts).
 * We dekken het laden + de verwerkte organisatie-overzichten af.
 */
describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent, NoopAnimationsModule],
      providers: [
        { provide: OrganizationService, useValue: { getAll: () => of([{ organizationId: 'o-1', name: 'Puur Kroatië' }]) } },
        { provide: PersonService, useValue: { getAll: () => of([]) } },
        { provide: AccountService, useValue: { getAll: () => of([]) } },
        { provide: RoleService, useValue: { getAll: () => of([]) } },
        { provide: AccountRoleService, useValue: { getAll: () => of([]) } },
        { provide: AuthService, useValue: { currentUser: () => ({ personName: 'Admin', roles: ['ADMIN'] }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load the admin stats', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
    expect(component.organizations().length).toBe(1);
  }));
});
