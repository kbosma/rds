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
export class DashboardComponent {
  private auth = inject(AuthService);

  isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  isManager(): boolean {
    return this.auth.hasRole('MANAGER');
  }
}
