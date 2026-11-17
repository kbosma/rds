import { Routes } from '@angular/router';
import { authorityGuard } from '../../core/auth/authority.guard';
import { ACCESS } from '../../core/auth/access';

export const supplierRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./supplier-list.component').then((m) => m.SupplierListComponent),
  },
  {
    path: 'new',
    canActivate: [authorityGuard],
    data: { access: ACCESS.supplierCreate },
    loadComponent: () =>
      import('./supplier-detail.component').then((m) => m.SupplierDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./supplier-detail.component').then((m) => m.SupplierDetailComponent),
  },
];
