import { Routes } from '@angular/router';
import { bookerAuthGuard } from './core/auth/booker-auth.guard';
import { LayoutComponent } from './features/layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/otp-login/request-otp.component').then(
        (m) => m.RequestOtpComponent
      ),
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./features/otp-login/verify-otp.component').then(
        (m) => m.VerifyOtpComponent
      ),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [bookerAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/documents.component').then(
            (m) => m.DocumentsComponent
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/payments/payments.component').then(
            (m) => m.PaymentsComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
