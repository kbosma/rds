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
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      // De vroegere losse schermen zijn opgegaan in het dashboard. Mollie stuurt de klant na het betalen nog naar
      // /payments (backend: app.mollie.urls.redirect), en bladwijzers verwijzen naar de oude paden.
      { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
      { path: 'payments', redirectTo: '', pathMatch: 'full' },
      { path: 'itinerary', redirectTo: '', pathMatch: 'full' },
      { path: 'documents', redirectTo: '', pathMatch: 'full' },
      { path: 'accommodations', redirectTo: '', pathMatch: 'full' },
      { path: 'activities', redirectTo: '', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
