import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationsCardComponent } from '../notifications/notifications-card.component';
import { BookingService } from '../bookings/booking.service';
import { BookingLineService } from '../bookings/booking-line.service';
import { MolliePaymentService } from '../mollie/mollie-payment.service';
import { Booking, MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { WelcomeHeaderComponent } from './welcome-header.component';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    WelcomeHeaderComponent,
    NotificationsCardComponent,
    MoneyPipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <app-welcome-header />
    @if (auth.hasAuthority('NOTIFICATION_READ')) {
      <app-notifications-card />
    }

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <!-- Boekingen dit jaar -->
      <mat-card class="bookings-tile clickable" routerLink="/bookings">
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.bookingsOverview' | translate: { year: currentYear } }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="booking-stats">
            <div class="booking-stat">
              <mat-icon class="stat-icon">book_online</mat-icon>
              <div class="stat-number">{{ totalBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.totalBookings' | translate }}</div>
            </div>
            <div class="booking-stat">
              <mat-icon class="stat-icon">check_circle</mat-icon>
              <div class="stat-number">{{ completedBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.completedBookings' | translate }}</div>
            </div>
            <div class="booking-stat">
              <mat-icon class="stat-icon">flight_takeoff</mat-icon>
              <div class="stat-number">{{ activeBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.activeBookings' | translate }}</div>
            </div>
            <div class="booking-stat">
              <mat-icon class="stat-icon">schedule</mat-icon>
              <div class="stat-number">{{ futureBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.futureBookings' | translate }}</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Financieel: gedeelde KPI-tegels (styles.scss) -->
      <div class="kpi-cards">
        <mat-card class="kpi-card kpi-neutral">
          <mat-card-content>
            <mat-icon class="kpi-icon">euro</mat-icon>
            <div>
              <div class="kpi-label">{{ 'dashboard.totalRevenue' | translate: { year: currentYear } }}</div>
              <div class="kpi-value">{{ totalRevenue() | money }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card kpi-success">
          <mat-card-content>
            <mat-icon class="kpi-icon">check_circle</mat-icon>
            <div>
              <div class="kpi-label">{{ 'dashboard.paidAmount' | translate: { year: currentYear } }}</div>
              <div class="kpi-value">{{ paidAmount() | money }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="kpi-card kpi-warning clickable" routerLink="/payments">
          <mat-card-content>
            <mat-icon class="kpi-icon">schedule</mat-icon>
            <div>
              <div class="kpi-label">{{ 'dashboard.outstandingAmount' | translate }}</div>
              <div class="kpi-value">{{ outstandingAmount() | money }}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Top 5: gekleurde kaarten in tinten van de organisatiekleur (.tone-card) -->
      <div class="top3-cards">
        <mat-card class="tone-card">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.topBookedAccommodations' | translate: { year: currentYear } }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of topBookedAccommodations(); track item.name; let i = $index) {
              <div class="top3-row">
                <span class="top3-rank">{{ i + 1 }}</span>
                <span class="top3-name">{{ item.name }}</span>
                <span class="top3-value">{{ 'dashboard.timesBooked' | translate: { count: item.count } }}</span>
              </div>
            } @empty {
              <p class="top3-empty">{{ 'common.noData' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="tone-card tone-deep">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.topRevenueAccommodations' | translate: { year: currentYear } }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of topRevenueAccommodations(); track item.name; let i = $index) {
              <div class="top3-row">
                <span class="top3-rank">{{ i + 1 }}</span>
                <span class="top3-name">{{ item.name }}</span>
                <span class="top3-value">{{ item.revenue | money }}</span>
              </div>
            } @empty {
              <p class="top3-empty">{{ 'common.noData' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .bookings-tile { margin-bottom: 12px; }
    .booking-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .booking-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2px;
    }
    .stat-icon {
      width: 24px;
      height: 24px;
      font-size: 24px;
      color: var(--theme-primary);
    }
    .stat-number {
      font-size: 26px;
      line-height: 32px;
      font-weight: 600;
      color: var(--ui-text);
    }
    .stat-desc {
      font-size: 12px;
      color: var(--ui-text-muted);
    }
    .clickable { cursor: pointer; }
    .clickable:hover { border-color: var(--theme-primary); }
    .kpi-card.clickable:hover { border-color: var(--kpi-color); }
    .top3-cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .top3-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.18);
    }
    .top3-row:last-child { border-bottom: none; }
    .top3-rank {
      width: 16px;
      font-weight: 600;
      opacity: 0.75;
      font-variant-numeric: tabular-nums;
    }
    .top3-name { flex: 1; min-width: 0; }
    .top3-value { font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .top3-empty { margin: 0; padding: 10px 0; opacity: 0.85; text-align: center; }
    @media (max-width: 900px) {
      .booking-stats { grid-template-columns: repeat(2, 1fr); }
      .top3-cards { grid-template-columns: 1fr; }
    }
  `],
})
export class ManagerDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private bookingService = inject(BookingService);
  private bookingLineService = inject(BookingLineService);
  private molliePaymentService = inject(MolliePaymentService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  currentYear = new Date().getFullYear();

  totalBookings = signal(0);
  completedBookings = signal(0);
  activeBookings = signal(0);
  futureBookings = signal(0);
  totalRevenue = signal(0);
  paidAmount = signal(0);
  outstandingAmount = signal(0);
  topBookedAccommodations = signal<{ name: string; count: number }[]>([]);
  topRevenueAccommodations = signal<{ name: string; revenue: number }[]>([]);

  ngOnInit() {
    const today = this.todayString();

    forkJoin({
      bookings: this.bookingService.getAll(),
      bookingLines: this.bookingLineService.getAll(),
      payments: this.molliePaymentService.getAll(),
      statusEntries: this.molliePaymentService.getAllStatusEntries(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ bookings, bookingLines, payments, statusEntries }) => {
        const yearBookings = bookings.filter(b => this.isInYear(b));
        const yearBookingIds = new Set(yearBookings.map(b => b.bookingId));
        const yearLines = bookingLines.filter(bl => yearBookingIds.has(bl.bookingId));

        this.totalBookings.set(yearBookings.length);
        this.completedBookings.set(yearBookings.filter(b => b.untilDate && b.untilDate < today).length);
        this.activeBookings.set(yearBookings.filter(b => b.fromDate && b.untilDate && b.fromDate <= today && b.untilDate >= today).length);
        this.futureBookings.set(yearBookings.filter(b => b.fromDate && b.fromDate > today).length);
        const yearPayments = payments.filter(p => p.createdAt && new Date(p.createdAt).getFullYear() === this.currentYear);
        const revenue = yearBookings.reduce((sum, b) => sum + (b.totalSum ?? 0), 0);
        // Build map of latest status per payment from status entries
        const latestStatusMap = new Map<string, string>();
        for (const entry of statusEntries) {
          latestStatusMap.set(entry.molliePaymentId, entry.status?.toLowerCase() ?? '');
        }
        const paid = yearPayments.filter(p => latestStatusMap.get(p.molliePaymentId) === 'paid').reduce((sum, p) => sum + (p.amount ?? 0), 0);
        this.totalRevenue.set(revenue);
        this.paidAmount.set(paid);
        this.outstandingAmount.set(revenue - paid);

        // Top 3 most booked accommodations
        const countMap = new Map<string, { name: string; count: number }>();
        for (const bl of yearLines) {
          const entry = countMap.get(bl.accommodationId) ?? { name: bl.accommodationName, count: 0 };
          entry.count++;
          countMap.set(bl.accommodationId, entry);
        }
        this.topBookedAccommodations.set(
          [...countMap.values()].sort((a, b) => b.count - a.count).slice(0, 5)
        );

        // Top 3 highest revenue accommodations
        const revenueMap = new Map<string, { name: string; revenue: number }>();
        for (const bl of yearLines) {
          const entry = revenueMap.get(bl.accommodationId) ?? { name: bl.accommodationName, revenue: 0 };
          entry.revenue += bl.price ?? 0;
          revenueMap.set(bl.accommodationId, entry);
        }
        this.topRevenueAccommodations.set(
          [...revenueMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
        );

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private isInYear(b: Booking): boolean {
    if (b.createdAt) {
      return new Date(b.createdAt).getFullYear() === this.currentYear;
    }
    return false;
  }

  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
