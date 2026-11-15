import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { PaymentStatusBadgeComponent } from '../../shared/components/payment-status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-mollie-payments',
  standalone: true,
  imports: [PaymentStatusBadgeComponent, 
    EmptyStateComponent,
    MoneyPipe,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="breadcrumb">
      <a routerLink="/bookings" class="breadcrumb-link">{{ 'nav.bookings' | translate }}</a>
      <mat-icon>chevron_right</mat-icon>
      <a [routerLink]="['/bookings', bookingId]" class="breadcrumb-link">{{ 'payments.booking' | translate }}</a>
      <mat-icon>chevron_right</mat-icon>
      <span>{{ 'payments.title' | translate }}</span>
    </div>

    <div class="page-header">
      <h1>{{ 'payments.title' | translate }}</h1>
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon> {{ 'common.newPayment' | translate }}
      </button>
    </div>

    <div class="kpi-cards">
      <mat-card class="kpi-card kpi-neutral">
        <mat-card-content>
          <div>
            <div class="kpi-label">{{ 'payments.totalBooking' | translate }}</div>
            <div class="kpi-value">{{ totalAmount() | money }}</div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="kpi-card kpi-success">
        <mat-card-content>
          <div>
            <div class="kpi-label">{{ 'common.paid' | translate }}</div>
            <div class="kpi-value">{{ paidAmount() | money }}</div>
          </div>
        </mat-card-content>
      </mat-card>
      <mat-card class="kpi-card kpi-warning">
        <mat-card-content>
          <div>
            <div class="kpi-label">{{ 'common.outstanding' | translate }}</div>
            <div class="kpi-value">{{ openAmount() | money }}</div>
          </div>
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
            <td mat-cell *matCellDef="let row" class="cell-nowrap">{{ row.createdAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.description' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.description }}</td>
          </ng-container>

          <ng-container matColumnDef="method">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.method' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.method) {
                <span class="badge badge-neutral">{{ row.method }}</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef class="cell-num">{{ 'common.amount' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="cell-num">{{ row.amount | money }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <app-payment-status-badge [status]="paymentStatusMap()[row.molliePaymentId] ?? ''" />
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
                              <app-payment-status-badge [status]="entry.status" />
                            </td>
                            <td>{{ entry.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                            <td>{{ entry.createdByName ?? (entry.createdBy ? ('common.unknown' | translate) : ('common.system' | translate)) }}</td>
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
          <tr mat-row *matRowDef="let row; columns: displayedColumns"
              (click)="toggleRow(row)"
              class="clickable-row"></tr>
          <tr mat-row *matRowDef="let row; columns: ['expandedDetail']"
              class="detail-row"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              <app-empty-state icon="credit_card" [message]="'payments.emptyState' | translate" />
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
      color: var(--ui-text-muted);
    }
    .breadcrumb-link {
      color: var(--theme-primary);
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
    .clickable-row {
      cursor: pointer;
    }
    .detail-row {
      height: 0;
    }
    .mollie-id {
      color: var(--theme-primary);
      font-family: monospace;
      font-size: 13px;
    }
    .status-history {
      padding: 16px 24px;
      background: var(--ui-primary-faint);
    }
    .status-history h4 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 500;
      color: var(--ui-text-muted);
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .history-table th {
      text-align: left;
      padding: 6px 12px;
      border-bottom: 1px solid var(--ui-line);
      color: var(--ui-text-muted);
      font-weight: 500;
    }
    .history-table td {
      padding: 6px 12px;
      border-bottom: 1px solid var(--ui-line);
    }
    .legend {
      display: flex;
      gap: 20px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--ui-text-muted);
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
  paymentStatusMap = signal<Record<string, string>>({});

  displayedColumns = ['molliePaymentExternalId', 'createdAt', 'description', 'method', 'amount', 'status', 'expand'];

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';

    this.molliePaymentService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.totalAmount.set(payments.reduce((sum, p) => sum + (p.amount ?? 0), 0));
        this.loading.set(false);
        this.loadPaymentStatuses(payments);
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

  private loadPaymentStatuses(payments: MolliePayment[]) {
    if (payments.length === 0) return;

    const statusRequests = payments.map(p =>
      this.molliePaymentService.getStatusEntries(p.molliePaymentId)
    );

    forkJoin(statusRequests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (allEntries) => {
          const map: Record<string, string> = {};
          allEntries.forEach((entries, i) => {
            if (entries.length > 0) {
              map[payments[i].molliePaymentId] = entries[entries.length - 1].status?.toLowerCase() ?? '';
            }
          });
          this.paymentStatusMap.set(map);

          const paid = payments
            .filter(p => map[p.molliePaymentId] === 'paid')
            .reduce((sum, p) => sum + (p.amount ?? 0), 0);
          this.paidAmount.set(paid);
          this.openAmount.set(this.totalAmount() - paid);
        },
      });
  }
}
