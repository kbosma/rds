import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth/auth.service';
import { isSatisfied } from '../../core/auth/access';

/*
 * DashboardComponent is een pure delegator: op basis van AUTHORITIES (nooit rollen) toont het het admin-,
 * manager- of employee-dashboard. We testen hier de delegatie-logica.
 */
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let authSpy: jasmine.SpyObj<AuthService>;

  // Wat de seed-rollen aan relevante authorities hebben (zie security.md)
  const ADMIN = ['ORGANIZATION_READ', 'PERSON_READ', 'ACCOUNT_READ', 'ROLE_READ', 'ACCOUNTROLE_READ', 'ACCOUNT_CREATE', 'PERSON_CREATE'];
  const MANAGER = ['ACCOUNT_CREATE', 'BOOKING_READ', 'PAYMENT_READ', 'PAYMENT_OVERVIEW'];
  const EMPLOYEE = ['BOOKING_READ', 'PAYMENT_READ'];

  async function setup(authorities: string[]) {
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority', 'can']);
    authSpy.hasAuthority.and.callFake((a: string) => authorities.includes(a));
    authSpy.can.and.callFake((access) => isSatisfied(access, authorities));

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

  it('should delegate to the admin dashboard for whoever may read organizations, persons, accounts and roles', async () => {
    await setup(ADMIN);
    expect(component.isAdmin()).toBe(true);
    expect(component.isManager()).toBe(false); // ook al mag een beheerder accounts aanmaken
  });

  it('should delegate to the manager dashboard for whoever may create accounts, read bookings and see the payment overview', async () => {
    await setup(MANAGER);
    expect(component.isAdmin()).toBe(false);
    expect(component.isManager()).toBe(true);
  });

  it('should fall back to the employee dashboard otherwise', async () => {
    await setup(EMPLOYEE);
    expect(component.isAdmin()).toBe(false);
    expect(component.isManager()).toBe(false);
  });

  it('does not show the manager dashboard without the authorities its API calls need', async () => {
    await setup(['ACCOUNT_CREATE', 'BOOKING_READ', 'PAYMENT_READ']); // geen PAYMENT_OVERVIEW: de betaalcijfers zouden 403 geven
    expect(component.isManager()).toBe(false);
  });

  it('does not show the admin dashboard with only ORGANIZATION_READ', async () => {
    await setup(['ORGANIZATION_READ']);
    expect(component.isAdmin()).toBe(false);
  });
});
