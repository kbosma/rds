import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/*
 * AuthService is de meest complexe service:
 * - JWT token opslaan/lezen uit localStorage
 * - Token decoderen voor user info
 * - Signal-based state (isAuthenticated, currentUser)
 * - Login/logout/changePassword HTTP calls
 * - Role/authority checks
 */
describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  // Een geldig JWT token (header.payload.signature)
  // Payload: { sub: "user-1", org: "org-1", roles: ["ADMIN"], authorities: ["BOOKING_READ"], exp: <future> }
  const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 uur in de toekomst
  const payload = { sub: 'user-1', org: 'org-1', roles: ['ADMIN'], authorities: ['BOOKING_READ'], exp: futureExp };
  const validToken = 'header.' + btoa(JSON.stringify(payload)) + '.signature';

  const expiredPayload = { ...payload, exp: Math.floor(Date.now() / 1000) - 3600 }; // 1 uur geleden
  const expiredToken = 'header.' + btoa(JSON.stringify(expiredPayload)) + '.signature';

  beforeEach(() => {
    // Elke test start met een schone localStorage
    localStorage.clear();

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  // =================================================================
  // Authenticatie state
  // =================================================================
  it('should not be authenticated when no token exists', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should be authenticated after successful login', () => {
    const loginResponse = {
      token: validToken,
      accountId: 'user-1',
      organizationId: 'org-1',
      mustChangePassword: false,
    };

    service.login('jan', 'password').subscribe();

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userName: 'jan', password: 'password' });
    req.flush(loginResponse);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.getToken()).toBe(validToken);
  });

  it('should set mustChangePassword flag from login response', () => {
    const loginResponse = {
      token: validToken,
      accountId: 'user-1',
      organizationId: 'org-1',
      mustChangePassword: true,
    };

    service.login('jan', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush(loginResponse);

    expect(service.mustChangePassword()).toBe(true);
  });

  // =================================================================
  // Token decodering en user info
  // =================================================================
  it('should decode token and expose user info', () => {
    service.login('jan', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      token: validToken,
      accountId: 'user-1',
      organizationId: 'org-1',
      mustChangePassword: false,
    });

    const user = service.currentUser();
    expect(user).toBeTruthy();
    expect(user!.accountId).toBe('user-1');
    expect(user!.organizationId).toBe('org-1');
    expect(user!.roles).toEqual(['ADMIN']);
    expect(user!.authorities).toEqual(['BOOKING_READ']);
  });

  it('should not be authenticated with expired token', () => {
    localStorage.setItem('rds_token', expiredToken);
    // Maak nieuwe service zodat die de expired token uit localStorage leest
    service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(false);
  });

  // =================================================================
  // Role en authority checks
  // =================================================================
  it('hasRole() should return true for matching role', () => {
    service.login('jan', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      token: validToken,
      accountId: 'user-1',
      organizationId: 'org-1',
      mustChangePassword: false,
    });

    expect(service.hasRole('ADMIN')).toBe(true);
    expect(service.hasRole('EMPLOYEE')).toBe(false);
  });

  it('hasAuthority() should return true for matching authority', () => {
    service.login('jan', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      token: validToken,
      accountId: 'user-1',
      organizationId: 'org-1',
      mustChangePassword: false,
    });

    expect(service.hasAuthority('BOOKING_READ')).toBe(true);
    expect(service.hasAuthority('BOOKING_DELETE')).toBe(false);
  });

  // =================================================================
  // Logout
  // =================================================================
  it('logout() should clear token and navigate to login', () => {
    // Eerst inloggen
    service.login('jan', 'password').subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      token: validToken,
      accountId: 'user-1',
      organizationId: 'org-1',
      mustChangePassword: false,
    });

    expect(service.isAuthenticated()).toBe(true);

    // Dan uitloggen
    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('rds_token')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  // =================================================================
  // Change password
  // =================================================================
  it('changePassword() should PUT to the correct endpoint', () => {
    service.changePassword('old', 'new').subscribe();

    const req = httpTesting.expectOne('/api/auth/change-password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old', newPassword: 'new' });
    req.flush({});

    expect(service.mustChangePassword()).toBe(false);
  });
});