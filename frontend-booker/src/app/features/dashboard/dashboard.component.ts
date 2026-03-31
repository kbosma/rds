import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BookerAuthService } from '../../core/auth/booker-auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, RouterLink],
  template: `
    <h1>Mijn Boeking</h1>

    <div class="card-grid">
      <mat-card class="info-card">
        <mat-card-content class="info-content">
          <mat-icon class="info-icon">book_online</mat-icon>
          <div>
            <div class="info-label">Boeking ID</div>
            <div class="info-value">{{ auth.currentBooker()?.bookingId }}</div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="action-card" routerLink="/documents">
        <mat-card-content class="action-content">
          <mat-icon class="action-icon">description</mat-icon>
          <div>
            <div class="action-title">Documenten</div>
            <div class="action-sub">Bekijk uw reisdocumenten</div>
          </div>
          <mat-icon class="chevron">chevron_right</mat-icon>
        </mat-card-content>
      </mat-card>

      <mat-card class="action-card" routerLink="/payments">
        <mat-card-content class="action-content">
          <mat-icon class="action-icon">payments</mat-icon>
          <div>
            <div class="action-title">Betalingen</div>
            <div class="action-sub">Bekijk en betaal uw boeking</div>
          </div>
          <mat-icon class="chevron">chevron_right</mat-icon>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    h1 {
      font-size: 22px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .card-grid {
      display: grid;
      gap: 16px;
    }
    .info-card {
      border-radius: 12px;
      border-left: 4px solid #1976d2;
    }
    .info-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .info-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #1976d2;
    }
    .info-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 500;
      margin-top: 2px;
      word-break: break-all;
    }
    .action-card {
      border-radius: 12px;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .action-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .action-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .action-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #1976d2;
    }
    .action-title {
      font-size: 16px;
      font-weight: 500;
    }
    .action-sub {
      font-size: 13px;
      color: #888;
    }
    .chevron {
      margin-left: auto;
      color: #ccc;
    }
  `],
})
export class DashboardComponent {
  auth = inject(BookerAuthService);
}
