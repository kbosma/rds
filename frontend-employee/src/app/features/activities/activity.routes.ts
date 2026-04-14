import { Routes } from '@angular/router';

export const activityRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./activity-list.component').then((m) => m.ActivityListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./activity-detail.component').then((m) => m.ActivityDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./activity-detail.component').then((m) => m.ActivityDetailComponent),
  },
];
