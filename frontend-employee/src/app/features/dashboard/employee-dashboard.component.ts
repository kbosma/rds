import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsCardComponent } from '../notifications/notifications-card.component';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [NotificationsCardComponent, MatCardModule, MatIconModule, TranslatePipe],
  template: `
    <div class="welcome-card">
      <mat-card>
        <mat-card-content class="welcome-content">
          <mat-icon class="welcome-icon">account_circle</mat-icon>
          <div>
            <h2 class="welcome-title">{{ 'dashboard.welcome' | translate }}, {{ auth.currentUser()?.personName }}</h2>
            <p class="welcome-detail">
              <strong>{{ 'dashboard.organization' | translate }}:</strong> {{ auth.currentUser()?.organizationName }}
              <span class="separator">|</span>
              <strong>{{ 'dashboard.role' | translate }}:</strong> {{ auth.currentUser()?.roles?.join(', ') }}
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
    @if (auth.hasAuthority('NOTIFICATION_READ')) {
      <app-notifications-card />
    }
    <mat-card class="placeholder-card">
      <mat-card-content class="placeholder-content">
        <mat-icon class="placeholder-icon">construction</mat-icon>
        <p>{{ 'common.placeholderPage' | translate }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .welcome-card { margin-bottom: 12px; }
    .welcome-content { display: flex; align-items: center; gap: 12px; padding: 2px 0; }
    .welcome-icon { font-size: 36px; width: 36px; height: 36px; color: var(--theme-primary); }
    .welcome-title { margin: 0; font-size: 17px; font-weight: 600; }
    .welcome-detail { margin: 2px 0 0; color: var(--ui-text-muted); font-size: 13px; }
    .separator { margin: 0 8px; color: #ccc; }
    .placeholder-card { border-radius: 12px; }
    .placeholder-content { display: flex; flex-direction: column; align-items: center; padding: 24px 0; color: var(--ui-text-muted); }
    .placeholder-icon { font-size: 44px; width: 44px; height: 44px; color: #ccc; margin-bottom: 8px; }
  `],
})
export class EmployeeDashboardComponent {
  auth = inject(AuthService);
}
