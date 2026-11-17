import { Route } from '@angular/router';
import { routes } from './app.routes';
import { authorityGuard } from './core/auth/authority.guard';
import { bookingRoutes } from './features/bookings/booking.routes';
import { accommodationRoutes } from './features/accommodations/accommodation.routes';
import { activityRoutes } from './features/activities/activity.routes';
import { supplierRoutes } from './features/suppliers/supplier.routes';

/**
 * Elke pagina achter het inloggen is bewaakt op authorities (ACCESS), behalve de pagina's die voor iedereen zijn.
 * Een nieuwe route zonder guard laat deze spec falen.
 */
describe('routes', () => {
  const OPEN_FOR_EVERYONE = ['', 'dashboard', 'totp-settings'];

  const guarded = (route: Route) =>
    (route.canActivate ?? []).includes(authorityGuard) && !!route.data?.['access'];

  it('guards every page behind the login with authorities', () => {
    const layout = routes.find((r) => r.path === '' && r.children)!;
    const unguarded = layout.children!
      .filter((r) => !OPEN_FOR_EVERYONE.includes(r.path ?? ''))
      .filter((r) => !guarded(r))
      .map((r) => r.path);
    expect(unguarded).toEqual([]);
  });

  it('guards the "new" pages of the features with their create authority', () => {
    for (const featureRoutes of [bookingRoutes, accommodationRoutes, activityRoutes, supplierRoutes]) {
      const newPage = featureRoutes.find((r) => r.path === 'new')!;
      expect(guarded(newPage)).withContext(String(newPage.loadComponent)).toBe(true);
    }
  });
});
