import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { authorityGuard } from './core/auth/authority.guard';
import { unsavedChangesGuard } from './shared/guards/unsaved-changes.guard';
import { ACCESS } from './core/auth/access';
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
        canActivate: [authorityGuard],
        data: { access: ACCESS.bookings },
        loadChildren: () =>
          import('./features/bookings/booking.routes').then(
            (m) => m.bookingRoutes
          ),
      },
      {
        path: 'bookers',
        canActivate: [authorityGuard],
        data: { access: ACCESS.bookers },
        loadComponent: () =>
          import('./features/bookers/booker-list.component').then(
            (m) => m.BookerListComponent
          ),
      },
      {
        path: 'prospects',
        canActivate: [authorityGuard],
        data: { access: ACCESS.prospects },
        loadComponent: () =>
          import('./features/prospects/prospect-list.component').then(
            (m) => m.ProspectListComponent
          ),
      },
      {
        path: 'travelers',
        canActivate: [authorityGuard],
        data: { access: ACCESS.travelers },
        loadComponent: () =>
          import('./features/travelers/traveler-list.component').then(
            (m) => m.TravelerListComponent
          ),
      },
      {
        path: 'accommodations',
        canActivate: [authorityGuard],
        data: { access: ACCESS.accommodations },
        loadChildren: () =>
          import('./features/accommodations/accommodation.routes').then(
            (m) => m.accommodationRoutes
          ),
      },
      {
        path: 'activities',
        canActivate: [authorityGuard],
        data: { access: ACCESS.activities },
        loadChildren: () =>
          import('./features/activities/activity.routes').then(
            (m) => m.activityRoutes
          ),
      },
      {
        path: 'suppliers',
        canActivate: [authorityGuard],
        data: { access: ACCESS.suppliers },
        loadChildren: () =>
          import('./features/suppliers/supplier.routes').then(
            (m) => m.supplierRoutes
          ),
      },
      {
        path: 'templates',
        canActivate: [authorityGuard],
        data: { access: ACCESS.templates },
        loadComponent: () =>
          import('./features/templates/template-list.component').then(
            (m) => m.TemplateListComponent
          ),
      },
      {
        path: 'email-templates',
        canActivate: [authorityGuard],
        data: { access: ACCESS.emailTemplates },
        loadComponent: () =>
          import('./features/email-templates/email-template-list.component').then(
            (m) => m.EmailTemplateListComponent
          ),
      },
      {
        path: 'payments',
        canActivate: [authorityGuard],
        data: { access: ACCESS.payments },
        loadComponent: () =>
          import('./features/mollie/mollie-payments-overview.component').then(
            (m) => m.MolliePaymentsOverviewComponent
          ),
      },
      {
        path: 'admin/organizations',
        canActivate: [authorityGuard],
        data: { access: ACCESS.organizations },
        loadComponent: () =>
          import('./features/admin/organization-list.component').then(
            (m) => m.OrganizationListComponent
          ),
      },
      {
        path: 'admin/organizations/onboarding',
        canActivate: [authorityGuard],
        data: { access: ACCESS.organizationOnboarding },
        loadComponent: () =>
          import('./features/admin/organization-onboarding.component').then(
            (m) => m.OrganizationOnboardingComponent
          ),
      },
      {
        path: 'admin/organizations/new',
        canActivate: [authorityGuard],
        data: { access: ACCESS.organizationCreate },
        loadComponent: () =>
          import('./features/admin/organization-detail.component').then(
            (m) => m.OrganizationDetailComponent
          ),
      },
      {
        path: 'admin/organizations/:id',
        canActivate: [authorityGuard],
        data: { access: ACCESS.organizations },
        loadComponent: () =>
          import('./features/admin/organization-detail.component').then(
            (m) => m.OrganizationDetailComponent
          ),
      },
      {
        path: 'admin/persons',
        canActivate: [authorityGuard],
        data: { access: ACCESS.persons },
        loadComponent: () =>
          import('./features/admin/person-list.component').then(
            (m) => m.PersonListComponent
          ),
      },
      {
        path: 'admin/persons/new',
        canActivate: [authorityGuard],
        data: { access: ACCESS.personCreate },
        loadComponent: () =>
          import('./features/admin/person-detail.component').then(
            (m) => m.PersonDetailComponent
          ),
      },
      {
        path: 'admin/persons/:id',
        canActivate: [authorityGuard],
        data: { access: ACCESS.persons },
        loadComponent: () =>
          import('./features/admin/person-detail.component').then(
            (m) => m.PersonDetailComponent
          ),
      },
      {
        path: 'admin/accounts',
        canActivate: [authorityGuard],
        data: { access: ACCESS.accounts },
        loadComponent: () =>
          import('./features/admin/account-list.component').then(
            (m) => m.AccountListComponent
          ),
      },
      {
        path: 'admin/accounts/new',
        canActivate: [authorityGuard],
        data: { access: ACCESS.accountCreate },
        loadComponent: () =>
          import('./features/admin/account-detail.component').then(
            (m) => m.AccountDetailComponent
          ),
      },
      {
        path: 'admin/accounts/:id',
        canActivate: [authorityGuard],
        data: { access: ACCESS.accounts },
        loadComponent: () =>
          import('./features/admin/account-detail.component').then(
            (m) => m.AccountDetailComponent
          ),
      },
      {
        path: 'admin/roles',
        canActivate: [authorityGuard],
        data: { access: ACCESS.roles },
        loadComponent: () =>
          import('./features/admin/role-list.component').then(
            (m) => m.RoleListComponent
          ),
      },
      {
        path: 'admin/roles/new',
        canActivate: [authorityGuard],
        canDeactivate: [unsavedChangesGuard],
        data: { access: ACCESS.roleCreate },
        loadComponent: () =>
          import('./features/admin/role-detail.component').then(
            (m) => m.RoleDetailComponent
          ),
      },
      {
        path: 'admin/roles/:id',
        canActivate: [authorityGuard],
        canDeactivate: [unsavedChangesGuard],
        data: { access: ACCESS.roles },
        loadComponent: () =>
          import('./features/admin/role-detail.component').then(
            (m) => m.RoleDetailComponent
          ),
      },
      {
        path: 'admin/authorities',
        canActivate: [authorityGuard],
        data: { access: ACCESS.authorities },
        loadComponent: () =>
          import('./features/admin/authority-list.component').then(
            (m) => m.AuthorityListComponent
          ),
      },
      {
        path: 'admin/theme',
        canActivate: [authorityGuard],
        data: { access: ACCESS.theme },
        loadComponent: () =>
          import('./features/admin/organization-theme.component').then(
            (m) => m.OrganizationThemeComponent
          ),
      },
      {
        path: 'organization-settings',
        canActivate: [authorityGuard],
        data: { access: ACCESS.organizationSettings },
        loadComponent: () =>
          import('./features/organization-settings/organization-settings.component').then(
            (m) => m.OrganizationSettingsComponent
          ),
      },
      {
        path: 'profile',
        canActivate: [authorityGuard],
        data: { access: ACCESS.profile },
        loadComponent: () =>
          import('./features/profile/my-profile.component').then(
            (m) => m.MyProfileComponent
          ),
      },
      {
        path: 'change-password',
        canActivate: [authorityGuard],
        data: { access: ACCESS.changePassword },
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
