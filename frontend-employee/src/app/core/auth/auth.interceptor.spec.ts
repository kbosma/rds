import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

/*
 * Rechten gewijzigd (401 AUTHZ_CHANGED): de interceptor haalt één nieuw token op en herhaalt de aanroep; andere 401's
 * loggen uit.
 */
describe('authInterceptor', () => {
  const token = (authorities: string[]) =>
    'h.' + btoa(JSON.stringify({ sub: 'u-1', org: 'o-1', authorities, roles: [], exp: Math.floor(Date.now() / 1000) + 3600 })) + '.s';
  const oldToken = token(['BOOKING_READ']);
  const newToken = token(['BOOKING_READ', 'PAYMENT_READ']);
  const changed = { status: 401, statusText: 'Unauthorized' };

  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.setItem('rds_token', oldToken);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.removeItem('rds_token');
  });

  it('ververst het token en herhaalt de aanroep; de nieuwe rechten staan direct in de AuthService', () => {
    let result: unknown;
    http.get('/api/bookings').subscribe((r) => (result = r));

    const first = backend.expectOne('/api/bookings');
    expect(first.request.headers.get('Authorization')).toBe(`Bearer ${oldToken}`);
    first.flush({ code: 'AUTHZ_CHANGED' }, changed);

    backend.expectOne((r) => r.url.endsWith('/auth/token/refresh')).flush({ token: newToken });

    const retry = backend.expectOne('/api/bookings');
    expect(retry.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    retry.flush(['ok']);

    expect(result).toEqual(['ok']);
    expect(auth.hasAuthority('PAYMENT_READ')).toBeTrue();
  });

  it('gelijktijdige weigeringen delen één verversing', () => {
    http.get('/api/bookings').subscribe();
    http.get('/api/payments').subscribe();
    backend.expectOne('/api/bookings').flush({ code: 'AUTHZ_CHANGED' }, changed);
    backend.expectOne('/api/payments').flush({ code: 'AUTHZ_CHANGED' }, changed);

    backend.expectOne((r) => r.url.endsWith('/auth/token/refresh')).flush({ token: newToken });

    backend.expectOne('/api/bookings').flush([]);
    backend.expectOne('/api/payments').flush([]);
  });

  it('lukt verversen niet (bijv. account gelockt), dan uitloggen', () => {
    const logout = spyOn(auth, 'logout');
    http.get('/api/bookings').subscribe({ error: () => undefined });

    backend.expectOne('/api/bookings').flush({ code: 'AUTHZ_CHANGED' }, changed);
    backend.expectOne((r) => r.url.endsWith('/auth/token/refresh')).flush({ message: 'Log opnieuw in' }, changed);

    expect(logout).toHaveBeenCalled();
  });

  it('een gewone 401 logt uit zonder te verversen', () => {
    const logout = spyOn(auth, 'logout');
    http.get('/api/bookings').subscribe({ error: () => undefined });

    backend.expectOne('/api/bookings').flush({ message: 'nee' }, changed);

    expect(logout).toHaveBeenCalled();
    backend.expectNone((r) => r.url.endsWith('/auth/token/refresh'));
  });
});
