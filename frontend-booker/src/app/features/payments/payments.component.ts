import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PaymentService } from './payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models/mollie-payment.model';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    TranslateModule,
  ],
  template: `
    <h1>{{ 'payments.title' | translate }}</h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="summary-cards">
        <mat-card class="summary-card total">
          <mat-card-content class="summary-content">
            <mat-icon>receipt_long</mat-icon>
            <div>
              <div class="summary-label">{{ 'common.total' | translate }}</div>
              <div class="summary-value">{{ totalAmount() | currency:'EUR':'symbol':'1.2-2' }}</div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card paid">
          <mat-card-content class="summary-content">
            <mat-icon>check_circle</mat-icon>
            <div>
              <div class="summary-label">{{ 'common.paid' | translate }}</div>
              <div class="summary-value">{{ paidAmount() | currency:'EUR':'symbol':'1.2-2' }}</div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="summary-card open">
          <mat-card-content class="summary-content">
            <mat-icon>schedule</mat-icon>
            <div>
              <div class="summary-label">{{ 'common.outstanding' | translate }}</div>
              <div class="summary-value">{{ openAmount() | currency:'EUR':'symbol':'1.2-2' }}</div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (payments().length === 0) {
        <mat-card class="empty-card">
          <mat-card-content class="empty-content">
            <mat-icon>payments</mat-icon>
            <p>{{ 'payments.noPayments' | translate }}</p>
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="table-container">
          <table mat-table [dataSource]="payments()" multiTemplateDataRows class="full-width">
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.description' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.description }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.amount' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.amount | currency:'EUR':'symbol':'1.2-2' }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
              <td mat-cell *matCellDef="let p">
                <span class="status-badge" [class]="'status-' + p.status">
                  {{ statusLabel(p.status) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'dd-MM-yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                @if (isPayable(p)) {
                  <button mat-raised-button color="primary"
                          (click)="startPayment(p); $event.stopPropagation()"
                          [disabled]="payingId() === p.molliePaymentId">
                    @if (payingId() === p.molliePaymentId) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <ng-container><mat-icon>payment</mat-icon> {{ 'payments.pay' | translate }}</ng-container>
                    }
                  </button>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="expand">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p">
                <button mat-icon-button (click)="toggleRow(p); $event.stopPropagation()">
                  <mat-icon>{{ expandedPaymentId() === p.molliePaymentId ? 'expand_less' : 'expand_more' }}</mat-icon>
                </button>
              </td>
            </ng-container>

            <!-- Expanded detail: status entries -->
            <ng-container matColumnDef="expandedDetail">
              <td mat-cell *matCellDef="let p" [attr.colspan]="displayedColumns.length">
                @if (expandedPaymentId() === p.molliePaymentId) {
                  <div class="status-history">
                    <h4>{{ 'payments.statusHistory' | translate }}</h4>
                    @if (statusEntriesLoading()) {
                      <mat-spinner diameter="24"></mat-spinner>
                    } @else if (statusEntriesForPayment(p.molliePaymentId).length === 0) {
                      <p class="no-data">{{ 'payments.noStatusHistory' | translate }}</p>
                    } @else {
                      <table class="history-table">
                        <thead>
                          <tr>
                            <th>Status</th>
                            <th>Datum</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (entry of statusEntriesForPayment(p.molliePaymentId); track entry.molliePaymentStatusEntryId) {
                            <tr>
                              <td>
                                <span class="status-badge" [class]="'status-' + entry.status">
                                  {{ statusLabel(entry.status) }}
                                </span>
                              </td>
                              <td>{{ entry.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                            </tr>
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
          </table>
        </div>
      }
    }
  `,
  styles: [`
    h1 {
      font-size: 22px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .summary-card {
      border-radius: 12px;
    }
    .summary-card.total { border-left: 4px solid #1976d2; }
    .summary-card.paid { border-left: 4px solid #4caf50; }
    .summary-card.open { border-left: 4px solid #ff9800; }
    .summary-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }
    .summary-content mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .total .summary-content mat-icon { color: #1976d2; }
    .paid .summary-content mat-icon { color: #4caf50; }
    .open .summary-content mat-icon { color: #ff9800; }
    .summary-label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-value {
      font-size: 16px;
      font-weight: 600;
      margin-top: 2px;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width { width: 100%; }
    .alt-row { background-color: #fafafa; }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover {
      background-color: #f0f0f0;
    }
    .detail-row {
      height: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-paid { background: #e8f5e9; color: #2e7d32; }
    .status-open { background: #fff3e0; color: #e65100; }
    .status-pending { background: #fff3e0; color: #e65100; }
    .status-authorized { background: #e3f2fd; color: #1565c0; }
    .status-failed { background: #ffebee; color: #c62828; }
    .status-canceled { background: #efebe9; color: #5d4037; }
    .status-expired { background: #fafafa; color: #757575; }
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
      color: #888;
      font-style: italic;
    }
    .empty-card { border-radius: 12px; }
    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: #888;
    }
    .empty-content mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 8px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `],
})
export class PaymentsComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private translateService = inject(TranslateService);

  payments = signal<MolliePayment[]>([]);
  loading = signal(true);
  payingId = signal<string | null>(null);
  expandedPaymentId = signal<string | null>(null);
  statusEntries = signal<MolliePaymentStatusEntry[]>([]);
  statusEntriesLoading = signal(false);

  displayedColumns = ['description', 'amount', 'status', 'createdAt', 'actions', 'expand'];

  private readonly statusKeys: Record<string, string> = {
    open: 'payments.statusOpen',
    pending: 'payments.statusPending',
    authorized: 'payments.statusAuthorized',
    paid: 'payments.statusPaid',
    failed: 'payments.statusFailed',
    canceled: 'payments.statusCanceled',
    expired: 'payments.statusExpired',
  };

  totalAmount = computed(() =>
    this.payments().reduce((sum, p) => sum + p.amount, 0)
  );

  paidAmount = computed(() =>
    this.payments()
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0)
  );

  openAmount = computed(() => this.totalAmount() - this.paidAmount());

  ngOnInit() {
    this.paymentService.getPayments().subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.loadStatusEntries();
  }

  statusLabel(status: string): string {
    const key = this.statusKeys[status?.toLowerCase()];
    return key ? this.translateService.instant(key) : status;
  }

  isPayable(payment: MolliePayment): boolean {
    const status = payment.status?.toLowerCase();
    return status === 'open' || status === 'failed' || status === 'expired';
  }

  startPayment(payment: MolliePayment) {
    this.payingId.set(payment.molliePaymentId);

    this.paymentService
      .initiatePayment(payment.molliePaymentId)
      .subscribe({
        next: (res) => {
          this.payingId.set(null);
          if (res._links?.checkout?.href) {
            window.location.href = res._links.checkout.href;
          }
        },
        error: () => this.payingId.set(null),
      });
  }

  toggleRow(payment: MolliePayment) {
    if (this.expandedPaymentId() === payment.molliePaymentId) {
      this.expandedPaymentId.set(null);
    } else {
      this.expandedPaymentId.set(payment.molliePaymentId);
    }
  }

  statusEntriesForPayment(molliePaymentId: string): MolliePaymentStatusEntry[] {
    return this.statusEntries().filter(e => e.molliePaymentId === molliePaymentId);
  }

  private loadStatusEntries() {
    this.statusEntriesLoading.set(true);
    this.paymentService.getStatusEntries().subscribe({
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
