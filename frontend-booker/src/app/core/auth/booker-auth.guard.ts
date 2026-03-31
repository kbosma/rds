import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BookerAuthService } from './booker-auth.service';

export const bookerAuthGuard: CanActivateFn = () => {
  const authService = inject(BookerAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
