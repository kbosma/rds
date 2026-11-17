import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { Access } from './access';

/**
 * Bewaakt een route op authorities: `data: { access: ACCESS.x }`. Zonder recht ga je naar het dashboard met een
 * melding, in plaats van naar een half scherm vol 403-fouten (bijv. na het intypen van een URL).
 */
export const authorityGuard: CanActivateFn = (route) => {
  const access = route.data['access'] as Access | undefined;
  const auth = inject(AuthService);
  if (auth.can(access)) {
    return true;
  }
  // get() i.p.v. instant(): bij een ingetypte URL zijn de vertalingen nog niet geladen als de guard draait.
  const snackBar = inject(MatSnackBar);
  inject(TranslateService)
    .get(['common.noAccess', 'common.close'])
    .subscribe((t: Record<string, string>) => snackBar.open(t['common.noAccess'], t['common.close'], { duration: 4000 }));
  return inject(Router).createUrlTree(['/dashboard']);
};
