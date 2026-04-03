import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';

@Component({
  selector: 'app-mollie-payments-overview',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
    MatPaginatorModule,
    TranslateModule,
  ],
  template: `
    <h1>{{ 'payments.title' | translate }}</h1>

    <div class="summary-cards">
      <mat-card class="summary-card">
        <mat-card-content class="summary-content">
          <mat-icon class="summary-icon total-icon">receipt_long</mat-icon>
          <div>
            <div class="summary-label">{{ 'common.total' | translate }}</div>
            <div class="summary-value">&euro; {{ totalAmount() | number:'1.2-2' }}</div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="summary-card summary-green">
        <mat-card-content class="summary-content">
          <mat-icon class="summary-icon paid-icon">check_circle</mat-icon>
          <div>
            <div class="summary-label">{{ 'common.paid' | translate }}</div>
            <div class="summary-value paid-value">&euro; {{ paidAmount() | number:'1.2-2' }}</div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="summary-card summary-orange">
        <mat-card-content class="summary-content">
          <mat-icon class="summary-icon open-icon">schedule</mat-icon>
          <div>
            <div class="summary-label">{{ 'common.outstanding' | translate }}</div>
            <div class="summary-value open-value">&euro; {{ openAmount() | number:'1.2-2' }}</div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    <mat-form-field class="search-field" appearance="outline">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" [placeholder]="'bookers.searchPlaceholder' | translate">
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="pagedPayments()" matSort (matSortChange)="onSort($event)" multiTemplateDataRows class="full-width">
          <ng-container matColumnDef="molliePaymentExternalId">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'payments.mollieId' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="mollie-id">{{ row.molliePaymentExternalId }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.date' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.description' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.description }}</td>
          </ng-container>

          <ng-container matColumnDef="method">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.method' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.method) {
                <span class="method-badge">{{ row.method }}</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.amount' | translate }}</th>
            <td mat-cell *matCellDef="let row">&euro; {{ row.amount | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.status' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-badge" [attr.data-status]="row.status?.toLowerCase()">
                {{ row.status }}
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
                              <span class="status-badge" [attr.data-status]="entry.status">{{ entry.status }}</span>
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

      <mat-paginator
        [length]="filteredPayments().length"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>
    }
  `,
  styles: [`
    h1 {
      margin: 0 0 20px;
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
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
    }
    .summary-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }
    .total-icon { color: #1976d2; }
    .paid-icon { color: #388e3c; }
    .open-icon { color: #f57c00; }
    .summary-label {
      font-size: 13px;
      color: #888;
    }
    .summary-value {
      font-size: 24px;
      font-weight: 600;
    }
    .paid-value { color: #388e3c; }
    .open-value { color: #f57c00; }
    .summary-green {
      border-left: 4px solid #388e3c;
    }
    .summary-orange {
      border-left: 4px solid #f57c00;
    }
    .search-field {
      width: 100%;
      margin-bottom: 16px;
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
    @media (max-width: 900px) {
      .summary-cards {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class MolliePaymentsOverviewComponent implements OnInit {
  private molliePaymentService = inject(MolliePaymentService);
  private destroyRef = inject(DestroyRef);

  payments = signal<MolliePayment[]>([]);
  loading = signal(true);
  searchTerm = signal('');
  pageIndex = signal(0);
  pageSize = signal(25);
  sortActive = signal('createdAt');
  sortDirection = signal<'asc' | 'desc' | ''>('desc');

  expandedPaymentId = signal<string | null>(null);
  statusEntries = signal<MolliePaymentStatusEntry[]>([]);
  statusEntriesLoading = signal(false);

  displayedColumns = ['molliePaymentExternalId', 'createdAt', 'description', 'method', 'amount', 'status', 'expand'];

  totalAmount = computed(() =>
    this.payments().reduce((sum, p) => sum + (p.amount ?? 0), 0)
  );

  paidAmount = computed(() =>
    this.payments()
      .filter((p) => p.status?.toLowerCase() === 'paid')
      .reduce((sum, p) => sum + (p.amount ?? 0), 0)
  );

  openAmount = computed(() => this.totalAmount() - this.paidAmount());

  filteredPayments = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let result = this.payments();
    if (term) {
      result = result.filter((p) =>
        (p.molliePaymentExternalId ?? '').toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term) ||
        (p.status ?? '').toLowerCase().includes(term) ||
        (p.method ?? '').toLowerCase().includes(term)
      );
    }

    const active = this.sortActive();
    const direction = this.sortDirection();
    if (active && direction) {
      result = [...result].sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[active];
        const bVal = (b as unknown as Record<string, unknown>)[active];
        const compare = aVal != null && bVal != null
          ? String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
          : 0;
        return direction === 'asc' ? compare : -compare;
      });
    }

    return result;
  });

  pagedPayments = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredPayments().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.molliePaymentService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSort(sort: Sort) {
    this.sortActive.set(sort.active);
    this.sortDirection.set(sort.direction);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
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
