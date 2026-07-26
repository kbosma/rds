import { Routes } from '@angular/router';

export const supplierRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./supplier-list.component').then((m) => m.SupplierListComponent),
  },
];
