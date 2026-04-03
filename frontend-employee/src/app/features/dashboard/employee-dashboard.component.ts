import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, TranslateModule],
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
    <mat-card class="placeholder-card">
      <mat-card-content class="placeholder-content">
        <mat-icon class="placeholder-icon">construction</mat-icon>
        <p>{{ 'common.placeholderPage' | translate }}</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .welcome-card { margin-bottom: 24px; }
    .welcome-content { display: flex; align-items: center; gap: 16px; padding: 8px 0; }
    .welcome-icon { font-size: 48px; width: 48px; height: 48px; color: #1976d2; }
    .welcome-title { margin: 0; font-size: 20px; font-weight: 500; }
    .welcome-detail { margin: 4px 0 0; color: #666; font-size: 14px; }
    .separator { margin: 0 8px; color: #ccc; }
    .placeholder-card { border-radius: 12px; }
    .placeholder-content { display: flex; flex-direction: column; align-items: center; padding: 48px 0; color: #888; }
    .placeholder-icon { font-size: 64px; width: 64px; height: 64px; color: #ccc; margin-bottom: 16px; }
  `],
})
export class EmployeeDashboardComponent {
  auth = inject(AuthService);
}
