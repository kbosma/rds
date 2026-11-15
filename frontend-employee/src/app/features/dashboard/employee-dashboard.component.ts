import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsCardComponent } from '../notifications/notifications-card.component';
import { WelcomeHeaderComponent } from './welcome-header.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [WelcomeHeaderComponent, NotificationsCardComponent, MatCardModule, MatIconModule, TranslatePipe],
  template: `
    <app-welcome-header />
    @if (auth.hasAuthority('NOTIFICATION_READ')) {
      <app-notifications-card />
    }
    <mat-card>
      <mat-card-content class="empty-state">
        <mat-icon>construction</mat-icon>
        <p>{{ 'common.placeholderPage' | translate }}</p>
      </mat-card-content>
    </mat-card>
  `,
})
export class EmployeeDashboardComponent {
  auth = inject(AuthService);
}
