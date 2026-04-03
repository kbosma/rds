import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AccountService } from './account.service';
import { Account } from '../../shared/models';

@Component({
  selector: 'app-account-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'accounts.title' | translate }}</h1>
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon> {{ 'accounts.newAccount' | translate }}
      </button>
    </div>

    <div class="filter-bar">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'common.search' | translate }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput (keyup)="applyFilter($event)" [placeholder]="'accounts.searchPlaceholder' | translate" />
      </mat-form-field>

      <div class="filter-chips">
        @for (chip of roleChips; track chip.value) {
          <button mat-stroked-button
                  [class.active-chip]="activeChip() === chip.value"
                  (click)="filterByRole(chip.value)">
            {{ chip.labelKey | translate }}
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="userName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'accounts.username' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.userName }}</td>
          </ng-container>

          <ng-container matColumnDef="person">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'accounts.person' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.personId }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-badge" [class.status-active]="!row.locked" [class.status-locked]="row.locked">
                {{ row.locked ? ('accounts.locked' | translate) : ('accounts.active' | translate) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="primary">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="primary">
                <mat-icon>vpn_key</mat-icon>
              </button>
              <button mat-icon-button color="warn">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'accounts.noAccountsFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    }

    <div class="legend">
      <span class="legend-item"><span class="status-badge status-active">{{ 'accounts.active' | translate }}</span> {{ 'accounts.legendActive' | translate }}</span>
      <span class="legend-item"><span class="status-badge status-locked">{{ 'accounts.locked' | translate }}</span> {{ 'accounts.legendLocked' | translate }}</span>
    </div>
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .filter-bar {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .search-field {
      flex: 1;
      min-width: 300px;
    }
    .filter-chips {
      display: flex;
      gap: 8px;
      padding-top: 8px;
    }
    .filter-chips button {
      border-radius: 20px;
      font-size: 13px;
    }
    .active-chip {
      background-color: #1976d2 !important;
      color: white !important;
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
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-active {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .status-locked {
      background-color: #ffebee;
      color: #c62828;
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
      gap: 24px;
      margin-top: 16px;
      font-size: 13px;
      color: #666;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `],
})
export class AccountListComponent implements OnInit {
  private accountService = inject(AccountService);
  private destroyRef = inject(DestroyRef);

  displayedColumns = ['userName', 'person', 'status', 'actions'];
  dataSource = new MatTableDataSource<Account>();
  loading = signal(true);
  activeChip = signal('ALL');

  roleChips = [
    { labelKey: 'accounts.all', value: 'ALL' },
    { labelKey: 'accounts.roleAdmin', value: 'ADMIN' },
    { labelKey: 'accounts.roleManager', value: 'MANAGER' },
    { labelKey: 'accounts.roleEmployee', value: 'EMPLOYEE' },
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private allAccounts: Account[] = [];

  ngOnInit() {
    this.accountService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (accounts) => {
        this.allAccounts = accounts;
        this.dataSource.data = accounts;
        this.loading.set(false);
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  filterByRole(role: string) {
    this.activeChip.set(role);
    if (role === 'ALL') {
      this.dataSource.data = this.allAccounts;
    } else {
      this.dataSource.data = this.allAccounts;
    }
  }
}
