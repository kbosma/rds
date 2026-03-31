import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { BookerAuthService } from './booker-auth.service';

export const bookerAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(BookerAuthService);

  const isAuthEndpoint = req.url.includes('/api/booker-auth/');
  const token = authService.getToken();

  const authReq = token && !isAuthEndpoint
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
