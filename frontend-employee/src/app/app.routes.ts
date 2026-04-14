import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LayoutComponent } from './features/layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
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
        path: 'bookings',
        loadChildren: () =>
          import('./features/bookings/booking.routes').then(
            (m) => m.bookingRoutes
          ),
      },
      {
        path: 'bookers',
        loadComponent: () =>
          import('./features/bookers/booker-list.component').then(
            (m) => m.BookerListComponent
          ),
      },
      {
        path: 'travelers',
        loadComponent: () =>
          import('./features/travelers/traveler-list.component').then(
            (m) => m.TravelerListComponent
          ),
      },
      {
        path: 'accommodations',
        loadChildren: () =>
          import('./features/accommodations/accommodation.routes').then(
            (m) => m.accommodationRoutes
          ),
      },
      {
        path: 'activities',
        loadChildren: () =>
          import('./features/activities/activity.routes').then(
            (m) => m.activityRoutes
          ),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('./features/suppliers/supplier-list.component').then(
            (m) => m.SupplierListComponent
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/documents/document-list.component').then(
            (m) => m.DocumentListComponent
          ),
      },
      {
        path: 'templates',
        loadComponent: () =>
          import('./features/templates/template-list.component').then(
            (m) => m.TemplateListComponent
          ),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/mollie/mollie-payments-overview.component').then(
            (m) => m.MolliePaymentsOverviewComponent
          ),
      },
      {
        path: 'admin/organizations',
        loadComponent: () =>
          import('./features/admin/organization-list.component').then(
            (m) => m.OrganizationListComponent
          ),
      },
      {
        path: 'admin/organizations/onboarding',
        loadComponent: () =>
          import('./features/admin/organization-onboarding.component').then(
            (m) => m.OrganizationOnboardingComponent
          ),
      },
      {
        path: 'admin/organizations/new',
        loadComponent: () =>
          import('./features/admin/organization-detail.component').then(
            (m) => m.OrganizationDetailComponent
          ),
      },
      {
        path: 'admin/organizations/:id',
        loadComponent: () =>
          import('./features/admin/organization-detail.component').then(
            (m) => m.OrganizationDetailComponent
          ),
      },
      {
        path: 'admin/persons',
        loadComponent: () =>
          import('./features/admin/person-list.component').then(
            (m) => m.PersonListComponent
          ),
      },
      {
        path: 'admin/persons/new',
        loadComponent: () =>
          import('./features/admin/person-detail.component').then(
            (m) => m.PersonDetailComponent
          ),
      },
      {
        path: 'admin/persons/:id',
        loadComponent: () =>
          import('./features/admin/person-detail.component').then(
            (m) => m.PersonDetailComponent
          ),
      },
      {
        path: 'admin/accounts',
        loadComponent: () =>
          import('./features/admin/account-list.component').then(
            (m) => m.AccountListComponent
          ),
      },
      {
        path: 'admin/accounts/new',
        loadComponent: () =>
          import('./features/admin/account-detail.component').then(
            (m) => m.AccountDetailComponent
          ),
      },
      {
        path: 'admin/accounts/:id',
        loadComponent: () =>
          import('./features/admin/account-detail.component').then(
            (m) => m.AccountDetailComponent
          ),
      },
      {
        path: 'admin/roles',
        loadComponent: () =>
          import('./features/admin/role-list.component').then(
            (m) => m.RoleListComponent
          ),
      },
      {
        path: 'admin/roles/new',
        loadComponent: () =>
          import('./features/admin/role-detail.component').then(
            (m) => m.RoleDetailComponent
          ),
      },
      {
        path: 'admin/roles/:id',
        loadComponent: () =>
          import('./features/admin/role-detail.component').then(
            (m) => m.RoleDetailComponent
          ),
      },
      {
        path: 'admin/authorities',
        loadComponent: () =>
          import('./features/admin/authority-list.component').then(
            (m) => m.AuthorityListComponent
          ),
      },
      {
        path: 'admin/authorities/new',
        loadComponent: () =>
          import('./features/admin/authority-detail.component').then(
            (m) => m.AuthorityDetailComponent
          ),
      },
      {
        path: 'admin/authorities/:id',
        loadComponent: () =>
          import('./features/admin/authority-detail.component').then(
            (m) => m.AuthorityDetailComponent
          ),
      },
      {
        path: 'admin/theme',
        loadComponent: () =>
          import('./features/admin/organization-theme.component').then(
            (m) => m.OrganizationThemeComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/my-profile.component').then(
            (m) => m.MyProfileComponent
          ),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/profile/change-password.component').then(
            (m) => m.ChangePasswordComponent
          ),
      },
      {
        path: 'totp-settings',
        loadComponent: () =>
          import('./features/profile/totp-settings.component').then(
            (m) => m.TotpSettingsComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
