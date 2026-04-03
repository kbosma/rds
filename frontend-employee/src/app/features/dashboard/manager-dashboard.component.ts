import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { BookingService } from '../bookings/booking.service';
import { BookingLineService } from '../bookings/booking-line.service';
import { MolliePaymentService } from '../mollie/mollie-payment.service';
import { Booking } from '../../shared/models';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
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

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <!-- Bookings overview tile -->
      <mat-card class="bookings-tile clickable" routerLink="/bookings">
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.bookingsOverview' | translate: { year: currentYear } }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="booking-stats">
            <div class="booking-stat">
              <mat-icon class="stat-icon stat-icon-blue">book_online</mat-icon>
              <div class="stat-number">{{ totalBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.totalBookings' | translate }}</div>
            </div>
            <div class="booking-stat">
              <mat-icon class="stat-icon stat-icon-green">check_circle</mat-icon>
              <div class="stat-number">{{ completedBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.completedBookings' | translate }}</div>
            </div>
            <div class="booking-stat">
              <mat-icon class="stat-icon stat-icon-orange">flight_takeoff</mat-icon>
              <div class="stat-number">{{ activeBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.activeBookings' | translate }}</div>
            </div>
            <div class="booking-stat">
              <mat-icon class="stat-icon stat-icon-purple">schedule</mat-icon>
              <div class="stat-number">{{ futureBookings() }}</div>
              <div class="stat-desc">{{ 'dashboard.futureBookings' | translate }}</div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Financial tiles -->
      <div class="stat-cards">
        <mat-card class="stat-card stat-dark">
          <mat-card-content class="stat-content">
            <mat-icon>euro</mat-icon>
            <div>
              <div class="stat-value">&euro; {{ totalRevenue() | number:'1.2-2' }}</div>
              <div class="stat-label">{{ 'dashboard.totalRevenue' | translate: { year: currentYear } }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card stat-teal">
          <mat-card-content class="stat-content">
            <mat-icon>check_circle</mat-icon>
            <div>
              <div class="stat-value">&euro; {{ paidAmount() | number:'1.2-2' }}</div>
              <div class="stat-label">{{ 'dashboard.paidAmount' | translate: { year: currentYear } }}</div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card stat-orange clickable" routerLink="/payments">
          <mat-card-content class="stat-content">
            <mat-icon>warning</mat-icon>
            <div>
              <div class="stat-value">&euro; {{ outstandingAmount() | number:'1.2-2' }}</div>
              <div class="stat-label">{{ 'dashboard.outstandingAmount' | translate }}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Top 3 tiles -->
      <div class="top3-cards">
        <mat-card class="top3-card top3-booked">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.topBookedAccommodations' | translate: { year: currentYear } }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of topBookedAccommodations(); track item.name; let i = $index) {
              <div class="top3-row">
                <span class="top3-rank">{{ i + 1 }}.</span>
                <span class="top3-name">{{ item.name }}</span>
                <span class="top3-value">{{ 'dashboard.timesBooked' | translate: { count: item.count } }}</span>
              </div>
            } @empty {
              <p class="top3-empty">{{ 'common.noData' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="top3-card top3-revenue">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.topRevenueAccommodations' | translate: { year: currentYear } }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @for (item of topRevenueAccommodations(); track item.name; let i = $index) {
              <div class="top3-row">
                <span class="top3-rank">{{ i + 1 }}.</span>
                <span class="top3-name">{{ item.name }}</span>
                <span class="top3-value">&euro; {{ item.revenue | number:'1.2-2' }}</span>
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
    .bookings-tile {
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .booking-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      padding: 8px 0;
    }
    .booking-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 4px;
    }
    .stat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      margin-bottom: 4px;
    }
    .stat-icon-blue { color: #1976d2; }
    .stat-icon-green { color: #388e3c; }
    .stat-icon-orange { color: #f57c00; }
    .stat-icon-purple { color: #7b1fa2; }
    .stat-number {
      font-size: 32px;
      font-weight: 600;
      color: #333;
    }
    .stat-desc {
      font-size: 13px;
      color: #888;
    }
    .stat-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .stat-card {
      border-radius: 12px;
      overflow: hidden;
    }
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 8px;
    }
    .stat-content mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      opacity: 0.9;
    }
    .stat-value {
      font-size: 26px;
      font-weight: 600;
    }
    .stat-label {
      font-size: 13px;
      opacity: 0.85;
      margin-top: 2px;
    }
    .stat-dark {
      background: #37474f;
      color: white;
    }
    .stat-teal {
      background: #00796b;
      color: white;
    }
    .stat-orange {
      background: #f57c00;
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
    .top3-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 24px;
    }
    .top3-card {
      border-radius: 12px;
      color: white;
    }
    .top3-booked {
      background: linear-gradient(135deg, #1976d2, #42a5f5);
    }
    .top3-revenue {
      background: linear-gradient(135deg, #7b1fa2, #ab47bc);
    }
    .top3-row {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .top3-row:last-child {
      border-bottom: none;
    }
    .top3-rank {
      font-weight: 600;
      font-size: 16px;
      opacity: 0.8;
      width: 28px;
    }
    .top3-name {
      flex: 1;
      font-size: 15px;
    }
    .top3-value {
      font-weight: 500;
      font-size: 14px;
      opacity: 0.9;
    }
    .top3-empty {
      opacity: 0.8;
      text-align: center;
      padding: 16px 0;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    @media (max-width: 1200px) {
      .booking-stats {
        grid-template-columns: repeat(2, 1fr);
      }
      .stat-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 700px) {
      .booking-stats {
        grid-template-columns: repeat(2, 1fr);
      }
      .stat-cards {
        grid-template-columns: 1fr;
      }
      .top3-cards {
        grid-template-columns: 1fr;
      }
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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ bookings, bookingLines, payments }) => {
        const yearBookings = bookings.filter(b => this.isInYear(b));
        const yearBookingIds = new Set(yearBookings.map(b => b.bookingId));
        const yearLines = bookingLines.filter(bl => yearBookingIds.has(bl.bookingId));

        this.totalBookings.set(yearBookings.length);
        this.completedBookings.set(yearBookings.filter(b => b.untilDate && b.untilDate < today).length);
        this.activeBookings.set(yearBookings.filter(b => b.fromDate && b.untilDate && b.fromDate <= today && b.untilDate >= today).length);
        this.futureBookings.set(yearBookings.filter(b => b.fromDate && b.fromDate > today).length);
        const yearPayments = payments.filter(p => p.createdAt && new Date(p.createdAt).getFullYear() === this.currentYear);
        const revenue = yearBookings.reduce((sum, b) => sum + (b.totalSum ?? 0), 0);
        const paid = yearPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount ?? 0), 0);
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
