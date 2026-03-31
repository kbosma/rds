import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';
import { BookingService } from '../bookings/booking.service';
import { Booking } from '../../shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="welcome-card">
      <mat-card>
        <mat-card-content class="welcome-content">
          <mat-icon class="welcome-icon">account_circle</mat-icon>
          <div>
            <h2 class="welcome-title">Welkom terug</h2>
            <p class="welcome-detail">
              <strong>Account:</strong> {{ auth.currentUser()?.accountId }}
              <span class="separator">|</span>
              <strong>Rol:</strong> {{ auth.currentUser()?.roles?.join(', ') }}
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <div class="stat-cards">
      <mat-card class="stat-card stat-blue">
        <mat-card-content class="stat-content">
          <mat-icon>book_online</mat-icon>
          <div>
            <div class="stat-value">{{ bookings().length }}</div>
            <div class="stat-label">Actieve boekingen</div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="stat-card stat-green">
        <mat-card-content class="stat-content">
          <mat-icon>calendar_month</mat-icon>
          <div>
            <div class="stat-value">{{ monthlyCount() }}</div>
            <div class="stat-label">Boekingen deze maand</div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="stat-card stat-orange clickable" [routerLink]="'/payments'">
        <mat-card-content class="stat-content">
          <mat-icon>payment</mat-icon>
          <div>
            <div class="stat-value">{{ openPayments() }}</div>
            <div class="stat-label">Openstaande betalingen</div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="stat-card stat-dark">
        <mat-card-content class="stat-content">
          <mat-icon>euro</mat-icon>
          <div>
            <div class="stat-value">{{ totalRevenue() | number:'1.2-2' }}</div>
            <div class="stat-label">Totale omzet</div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <mat-card class="recent-card">
      <mat-card-header>
        <mat-card-title>Recente boekingen</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (loading()) {
          <div class="loading">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
        } @else {
          <table mat-table [dataSource]="recentBookings()" class="full-width">
            <ng-container matColumnDef="bookingNumber">
              <th mat-header-cell *matHeaderCellDef>Boekingnummer</th>
              <td mat-cell *matCellDef="let row">
                <a [routerLink]="['/bookings', row.bookingId]" class="booking-link">{{ row.bookingNumber }}</a>
              </td>
            </ng-container>

            <ng-container matColumnDef="fromDate">
              <th mat-header-cell *matHeaderCellDef>Van</th>
              <td mat-cell *matCellDef="let row">{{ row.fromDate | date:'dd-MM-yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="untilDate">
              <th mat-header-cell *matHeaderCellDef>Tot</th>
              <td mat-cell *matCellDef="let row">{{ row.untilDate | date:'dd-MM-yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="totalSum">
              <th mat-header-cell *matHeaderCellDef>Bedrag</th>
              <td mat-cell *matCellDef="let row">&euro; {{ row.totalSum | number:'1.2-2' }}</td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="recentColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: recentColumns;"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell" [attr.colspan]="recentColumns.length">
                Geen recente boekingen.
              </td>
            </tr>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .welcome-card {
      margin-bottom: 24px;
    }
    .welcome-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .welcome-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
    }
    .welcome-title {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    .welcome-detail {
      margin: 4px 0 0;
      color: #666;
      font-size: 14px;
    }
    .separator {
      margin: 0 8px;
      color: #ccc;
    }
    .stat-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      border-radius: 12px;
      overflow: hidden;
    }
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .stat-content mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      opacity: 0.9;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 600;
    }
    .stat-label {
      font-size: 13px;
      opacity: 0.8;
    }
    .stat-blue {
      background: #1976d2;
      color: white;
    }
    .stat-green {
      background: #388e3c;
      color: white;
    }
    .stat-orange {
      background: #f57c00;
      color: white;
    }
    .stat-dark {
      background: #37474f;
      color: white;
    }
    .clickable {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .recent-card {
      border-radius: 12px;
    }
    .full-width {
      width: 100%;
    }
    .booking-link {
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
    }
    .booking-link:hover {
      text-decoration: underline;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    @media (max-width: 1200px) {
      .stat-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private bookingService = inject(BookingService);
  private destroyRef = inject(DestroyRef);

  bookings = signal<Booking[]>([]);
  loading = signal(true);

  recentColumns = ['bookingNumber', 'fromDate', 'untilDate', 'totalSum'];

  recentBookings = signal<Booking[]>([]);

  monthlyCount = signal(0);
  openPayments = signal(0);
  totalRevenue = signal(0);

  ngOnInit() {
    this.bookingService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.recentBookings.set(bookings.slice(0, 10));
        this.totalRevenue.set(bookings.reduce((sum, b) => sum + (b.totalSum ?? 0), 0));

        const now = new Date();
        const thisMonth = bookings.filter((b) => {
          const created = new Date(b.createdAt);
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        });
        this.monthlyCount.set(thisMonth.length);

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
