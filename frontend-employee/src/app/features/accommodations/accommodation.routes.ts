import { Routes } from '@angular/router';

export const accommodationRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./accommodation-list.component').then((m) => m.AccommodationListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./accommodation-detail.component').then((m) => m.AccommodationDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./accommodation-detail.component').then((m) => m.AccommodationDetailComponent),
  },
];
