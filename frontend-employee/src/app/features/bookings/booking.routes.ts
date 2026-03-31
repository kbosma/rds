import { Routes } from '@angular/router';

export const bookingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./booking-list.component').then((m) => m.BookingListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./booking-detail.component').then((m) => m.BookingDetailComponent),
  },
  {
    path: ':id/payments',
    loadComponent: () =>
      import('../mollie/mollie-payments.component').then((m) => m.MolliePaymentsComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./booking-detail.component').then((m) => m.BookingDetailComponent),
  },
];
