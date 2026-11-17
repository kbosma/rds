import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { authorityGuard } from './authority.guard';
import { AuthService } from './auth.service';
import { ACCESS, isSatisfied } from './access';

describe('authorityGuard', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  function run(authorities: string[], access: unknown) {
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { can: (a: never) => isSatisfied(a, authorities) } },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TranslateService, useValue: { get: (keys: string[]) => of(Object.fromEntries(keys.map((k) => [k, k]))) } },
      ],
    });
    const route = { data: { access } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => authorityGuard(route, {} as RouterStateSnapshot));
  }

  it('lets the user through with the required authorities', () => {
    expect(run(['BOOKING_READ'], ACCESS.bookings)).toBe(true);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('lets everyone through on a route without requirements', () => {
    expect(run([], undefined)).toBe(true);
  });

  it('sends the user to the dashboard with a message otherwise', () => {
    const result = run(['BOOKING_READ'], ACCESS.persons);
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
    expect(snackBar.open).toHaveBeenCalledWith('common.noAccess', 'common.close', jasmine.any(Object));
  });
});
