import { Routes } from '@angular/router';

export const supplierRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./supplier-list.component').then((m) => m.SupplierListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./supplier-detail.component').then((m) => m.SupplierDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./supplier-detail.component').then((m) => m.SupplierDetailComponent),
  },
];
