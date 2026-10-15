import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { EmployeeDashboardComponent } from './employee-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AdminDashboardComponent, ManagerDashboardComponent, EmployeeDashboardComponent],
  template: `
    @if (isAdmin()) {
      <app-admin-dashboard />
    } @else if (isManager()) {
      <app-manager-dashboard />
    } @else {
      <app-employee-dashboard />
    }
  `,
})
/**
 * Kiest het dashboard op basis van authorities (nooit rollen):
 *  - beheerdashboard: wie organisaties mag zien (ORGANIZATION_READ; systeembeheer);
 *  - managerdashboard: wie accounts mag aanmaken (ACCOUNT_CREATE; beheert de gebruikers van de organisatie);
 *  - anders het dashboard voor medewerkers.
 */
export class DashboardComponent {
  private auth = inject(AuthService);

  isAdmin(): boolean {
    return this.auth.hasAuthority('ORGANIZATION_READ');
  }

  isManager(): boolean {
    return !this.isAdmin() && this.auth.hasAuthority('ACCOUNT_CREATE');
  }
}
