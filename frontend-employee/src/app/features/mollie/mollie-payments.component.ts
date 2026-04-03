import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';

@Component({
  selector: 'app-mollie-payments',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="breadcrumb">
      <a routerLink="/bookings" class="breadcrumb-link">{{ 'nav.bookings' | translate }}</a>
      <mat-icon>chevron_right</mat-icon>
      <a [routerLink]="['/bookings', bookingId]" class="breadcrumb-link">{{ 'payments.booking' | translate }}</a>
      <mat-icon>chevron_right</mat-icon>
      <span>{{ 'payments.title' | translate }}</span>
    </div>

    <div class="header">
      <h1>{{ 'payments.title' | translate }}</h1>
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon> {{ 'common.newPayment' | translate }}
      </button>
    </div>

    <div class="summary-cards">
      <mat-card class="summary-card">
        <mat-card-content class="summary-content">
          <div class="summary-label">{{ 'payments.totalBooking' | translate }}</div>
          <div class="summary-value">&euro; {{ totalAmount() | number:'1.2-2' }}</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="summary-card summary-green">
        <mat-card-content class="summary-content">
          <div class="summary-label">{{ 'common.paid' | translate }}</div>
          <div class="summary-value">&euro; {{ paidAmount() | number:'1.2-2' }}</div>
        </mat-card-content>
      </mat-card>

      <mat-card class="summary-card summary-orange">
        <mat-card-content class="summary-content">
          <div class="summary-label">{{ 'common.outstanding' | translate }}</div>
          <div class="summary-value">&euro; {{ openAmount() | number:'1.2-2' }}</div>
        </mat-card-content>
      </mat-card>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="payments()" multiTemplateDataRows class="full-width">
          <ng-container matColumnDef="molliePaymentExternalId">
            <th mat-header-cell *matHeaderCellDef>{{ 'payments.mollieId' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="mollie-id">{{ row.molliePaymentExternalId }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.description' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.description }}</td>
          </ng-container>

          <ng-container matColumnDef="method">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.method' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.method) {
                <span class="method-badge">{{ row.method }}</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.amount' | translate }}</th>
            <td mat-cell *matCellDef="let row">&euro; {{ row.amount | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-badge" [attr.data-status]="row.status">
                {{ 'payments.status_' + row.status | translate }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="expand">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button (click)="toggleRow(row); $event.stopPropagation()">
                <mat-icon>{{ expandedPaymentId() === row.molliePaymentId ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
            </td>
          </ng-container>

          <ng-container matColumnDef="expandedDetail">
            <td mat-cell *matCellDef="let row" [attr.colspan]="displayedColumns.length">
              @if (expandedPaymentId() === row.molliePaymentId) {
                <div class="status-history">
                  <h4>{{ 'payments.statusHistory' | translate }}</h4>
                  @if (statusEntriesLoading()) {
                    <mat-spinner diameter="24"></mat-spinner>
                  } @else {
                    <table class="history-table">
                      <thead>
                        <tr>
                          <th>{{ 'common.status' | translate }}</th>
                          <th>{{ 'common.date' | translate }}</th>
                          <th>{{ 'bookings.by' | translate }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of statusEntries(); track entry.molliePaymentStatusEntryId) {
                          <tr>
                            <td>
                              <span class="status-badge" [attr.data-status]="entry.status">{{ 'payments.status_' + entry.status | translate }}</span>
                            </td>
                            <td>{{ entry.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                            <td>{{ entry.createdBy ?? ('common.system' | translate) }}</td>
                          </tr>
                        }
                        @if (statusEntries().length === 0) {
                          <tr><td colspan="3" class="no-data">{{ 'payments.noStatusHistory' | translate }}</td></tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"
              (click)="toggleRow(row)"
              class="clickable-row"></tr>
          <tr mat-row *matRowDef="let row; columns: ['expandedDetail']"
              class="detail-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'payments.noPaymentsFound' | translate }}
            </td>
          </tr>
        </table>
      </div>
    }

    <div class="legend">
      <span class="legend-item"><span class="status-badge" data-status="paid">{{ 'payments.status_paid' | translate }}</span> {{ 'payments.legendPaid' | translate }}</span>
      <span class="legend-item"><span class="status-badge" data-status="open">{{ 'payments.status_open' | translate }}</span> {{ 'payments.legendOpen' | translate }}</span>
      <span class="legend-item"><span class="status-badge" data-status="failed">{{ 'payments.status_failed' | translate }}</span> {{ 'payments.legendFailed' | translate }}</span>
      <span class="legend-item"><span class="status-badge" data-status="canceled">{{ 'payments.status_canceled' | translate }}</span> {{ 'payments.legendCanceled' | translate }}</span>
      <span class="legend-item"><span class="status-badge" data-status="expired">{{ 'payments.status_expired' | translate }}</span> {{ 'payments.legendExpired' | translate }}</span>
    </div>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #888;
    }
    .breadcrumb-link {
      color: #1976d2;
      text-decoration: none;
    }
    .breadcrumb-link:hover {
      text-decoration: underline;
    }
    .breadcrumb mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      border-radius: 12px;
    }
    .summary-content {
      text-align: center;
      padding: 8px 0;
    }
    .summary-label {
      font-size: 13px;
      color: #888;
      margin-bottom: 4px;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 600;
    }
    .summary-green {
      border-left: 4px solid #388e3c;
    }
    .summary-green .summary-value {
      color: #388e3c;
    }
    .summary-orange {
      border-left: 4px solid #f57c00;
    }
    .summary-orange .summary-value {
      color: #f57c00;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width {
      width: 100%;
    }
    .alt-row {
      background-color: #fafafa;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover {
      background-color: #f0f0f0;
    }
    .detail-row {
      height: 0;
    }
    .mollie-id {
      color: #1976d2;
      font-family: monospace;
      font-size: 13px;
    }
    .method-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      background: #e8eaf6;
      color: #3949ab;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-badge[data-status="paid"] {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .status-badge[data-status="open"], .status-badge[data-status="pending"] {
      background-color: #fff3e0;
      color: #e65100;
    }
    .status-badge[data-status="failed"] {
      background-color: #ffebee;
      color: #c62828;
    }
    .status-badge[data-status="canceled"] {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }
    .status-badge[data-status="expired"] {
      background-color: #efebe9;
      color: #4e342e;
    }
    .status-history {
      padding: 16px 24px;
      background: #fafafa;
    }
    .status-history h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 500;
      color: #555;
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .history-table th {
      text-align: left;
      padding: 6px 12px;
      border-bottom: 1px solid #ddd;
      color: #888;
      font-weight: 500;
    }
    .history-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #eee;
    }
    .no-data {
      text-align: center;
      padding: 24px;
      color: #888;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .legend {
      display: flex;
      gap: 20px;
      margin-top: 16px;
      font-size: 13px;
      color: #666;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `],
})
export class MolliePaymentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private molliePaymentService = inject(MolliePaymentService);
  private destroyRef = inject(DestroyRef);

  bookingId = '';
  payments = signal<MolliePayment[]>([]);
  loading = signal(true);

  totalAmount = signal(0);
  paidAmount = signal(0);
  openAmount = signal(0);

  expandedPaymentId = signal<string | null>(null);
  statusEntries = signal<MolliePaymentStatusEntry[]>([]);
  statusEntriesLoading = signal(false);

  displayedColumns = ['molliePaymentExternalId', 'createdAt', 'description', 'method', 'amount', 'status', 'expand'];

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';

    this.molliePaymentService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        const total = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
        const paid = payments
          .filter((p) => p.status === 'paid')
          .reduce((sum, p) => sum + (p.amount ?? 0), 0);
        this.totalAmount.set(total);
        this.paidAmount.set(paid);
        this.openAmount.set(total - paid);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleRow(payment: MolliePayment) {
    if (this.expandedPaymentId() === payment.molliePaymentId) {
      this.expandedPaymentId.set(null);
      this.statusEntries.set([]);
      return;
    }

    this.expandedPaymentId.set(payment.molliePaymentId);
    this.statusEntriesLoading.set(true);
    this.molliePaymentService.getStatusEntries(payment.molliePaymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          this.statusEntries.set(entries);
          this.statusEntriesLoading.set(false);
        },
        error: () => {
          this.statusEntries.set([]);
          this.statusEntriesLoading.set(false);
        },
      });
  }
}
