import { Routes } from '@angular/router';
import { authorityGuard } from '../../core/auth/authority.guard';
import { ACCESS } from '../../core/auth/access';

export const activityRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./activity-list.component').then((m) => m.ActivityListComponent),
  },
  {
    path: 'new',
    canActivate: [authorityGuard],
    data: { access: ACCESS.activityCreate },
    loadComponent: () =>
      import('./activity-detail.component').then((m) => m.ActivityDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./activity-detail.component').then((m) => m.ActivityDetailComponent),
  },
];
