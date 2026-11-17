import { Routes } from '@angular/router';
import { authorityGuard } from '../../core/auth/authority.guard';
import { ACCESS } from '../../core/auth/access';

export const accommodationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./accommodation-list.component').then((m) => m.AccommodationListComponent),
  },
  {
    path: 'new',
    canActivate: [authorityGuard],
    data: { access: ACCESS.accommodationCreate },
    loadComponent: () =>
      import('./accommodation-detail.component').then((m) => m.AccommodationDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./accommodation-detail.component').then((m) => m.AccommodationDetailComponent),
  },
];
