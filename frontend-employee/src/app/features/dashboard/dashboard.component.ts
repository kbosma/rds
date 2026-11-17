import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { ACCESS } from '../../core/auth/access';
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
 * Kiest het dashboard op basis van authorities (nooit rollen), zie ACCESS:
 *  - beheerdashboard: wie organisaties, personen, accounts en rollen mag lezen (systeembeheer);
 *  - managerdashboard: wie accounts mag aanmaken en boekingen en betalingen mag lezen;
 *  - anders het dashboard voor medewerkers.
 * Een dashboard verschijnt alleen als alle API-aanroepen die het doet ook mogen, dus nooit met 403-fouten.
 */
export class DashboardComponent {
  private auth = inject(AuthService);

  isAdmin(): boolean {
    return this.auth.can(ACCESS.adminDashboard);
  }

  isManager(): boolean {
    return !this.isAdmin() && this.auth.can(ACCESS.managerDashboard);
  }
}
