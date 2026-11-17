import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** De backend weigert een token omdat de rechten van de gebruiker zijn gewijzigd (zie JwtAuthenticationFilter). */
const AUTHZ_CHANGED = 'AUTHZ_CHANGED';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthEndpoint = req.url.includes('/api/auth/login');
  const isRefresh = req.url.includes('/api/auth/token/refresh');
  const token = authService.getToken();

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Rechten gewijzigd: nieuw token ophalen en de aanroep één keer herhalen. Lukt verversen niet (account gelockt,
      // verlopen of nieuw wachtwoord nodig), dan geeft die 401 en volgt hieronder het uitloggen.
      if (error.status === 401 && error.error?.code === AUTHZ_CHANGED && !isRefresh) {
        return authService.refreshToken().pipe(
          switchMap((fresh) => next(req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } }))),
        );
      }
      if (error.status === 401 && !isAuthEndpoint) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
