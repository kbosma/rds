import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth/auth.service';

/*
 * DashboardComponent is een pure delegator: op basis van AUTHORITIES (nooit rollen) toont het het admin-,
 * manager- of employee-dashboard. We testen hier de delegatie-logica.
 */
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let authSpy: jasmine.SpyObj<AuthService>;

  // Wat de seed-rollen aan relevante authorities hebben (zie security.md)
  const ADMIN = ['ORGANIZATION_READ', 'ACCOUNT_CREATE', 'PERSON_CREATE'];
  const MANAGER = ['ACCOUNT_CREATE', 'BOOKING_READ', 'PAYMENT_READ'];
  const EMPLOYEE = ['BOOKING_READ', 'PAYMENT_READ'];

  async function setup(authorities: string[]) {
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority', 'hasRole']);
    authSpy.hasAuthority.and.callFake((a: string) => authorities.includes(a));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    // Geen detectChanges: we toetsen de delegatie-logica zonder de
    // sub-dashboards (met hun eigen dependencies) te renderen.
    component = TestBed.createComponent(DashboardComponent).componentInstance;
  }

  it('should create', async () => {
    await setup(EMPLOYEE);
    expect(component).toBeTruthy();
  });

  it('should delegate to the admin dashboard for whoever may see organizations (ORGANIZATION_READ)', async () => {
    await setup(ADMIN);
    expect(component.isAdmin()).toBe(true);
    expect(component.isManager()).toBe(false); // ook al mag een beheerder accounts aanmaken
  });

  it('should delegate to the manager dashboard for whoever may create accounts (ACCOUNT_CREATE)', async () => {
    await setup(MANAGER);
    expect(component.isAdmin()).toBe(false);
    expect(component.isManager()).toBe(true);
  });

  it('should fall back to the employee dashboard otherwise', async () => {
    await setup(EMPLOYEE);
    expect(component.isAdmin()).toBe(false);
    expect(component.isManager()).toBe(false);
  });

  it('never looks at roles', async () => {
    await setup(MANAGER);
    component.isAdmin();
    component.isManager();
    expect(authSpy.hasRole).not.toHaveBeenCalled();
  });
});
