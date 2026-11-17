import { Routes } from '@angular/router';
import { authorityGuard } from '../../core/auth/authority.guard';
import { ACCESS } from '../../core/auth/access';

export const bookingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./booking-list.component').then((m) => m.BookingListComponent),
  },
  {
    path: 'new',
    canActivate: [authorityGuard],
    data: { access: ACCESS.bookingCreate },
    loadComponent: () =>
      import('./booking-detail.component').then((m) => m.BookingDetailComponent),
  },
  {
    path: ':id/payments',
    canActivate: [authorityGuard],
    data: { access: ACCESS.bookingPayments },
    loadComponent: () =>
      import('../mollie/mollie-payments.component').then((m) => m.MolliePaymentsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./booking-detail.component').then((m) => m.BookingDetailComponent),
  },
];
