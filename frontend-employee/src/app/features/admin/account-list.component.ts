import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AccountService } from './account.service';
import { PersonService } from './person.service';
import { OrganizationService } from './organization.service';
import { AccountRoleService } from './account-role.service';
import { AuthService } from '../../core/auth/auth.service';
import { Account } from '../../shared/models';

interface AccountRow extends Account {
  personName: string;
  organizationName: string;
  organizationId: string;
  roleDescriptions: string[];
}

interface FilterChip {
  labelKey?: string;
  label?: string;
  value: string;
}

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
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'accounts.title' | translate }}</h1>
      <button mat-raised-button color="primary" (click)="navigateToNew()">
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
                  [class.active-chip]="activeRoleChip() === chip.value"
                  (click)="filterByRole(chip.value)">
            {{ chip.labelKey | translate }}
          </button>
        }
      </div>

      @if (isAdmin) {
        <div class="filter-chips">
          @for (chip of orgChips(); track chip.value) {
            <button mat-stroked-button
                    [class.active-chip]="activeOrgChip() === chip.value"
                    (click)="filterByOrganization(chip.value)">
              {{ chip.labelKey ? (chip.labelKey | translate) : chip.label }}
            </button>
          }
        </div>
      }
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
            <td mat-cell *matCellDef="let row">{{ row.personName }}</td>
          </ng-container>

          <ng-container matColumnDef="organization">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'accounts.organization' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.organizationName }}</td>
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
              <button mat-icon-button color="primary" (click)="navigateToEdit(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteAccount(row)">
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
      flex-wrap: wrap;
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
  private personService = inject(PersonService);
  private organizationService = inject(OrganizationService);
  private accountRoleService = inject(AccountRoleService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  isAdmin = this.authService.hasRole('ADMIN');
  displayedColumns = this.isAdmin
    ? ['userName', 'person', 'organization', 'status', 'actions']
    : ['userName', 'person', 'status', 'actions'];
  dataSource = new MatTableDataSource<AccountRow>();
  loading = signal(true);
  activeRoleChip = signal('ALL');
  activeOrgChip = signal('ALL');
  orgChips = signal<FilterChip[]>([{ labelKey: 'accounts.allOrganizations', value: 'ALL' }]);

  roleChips = [
    { labelKey: 'accounts.all', value: 'ALL' },
    { labelKey: 'accounts.roleAdmin', value: 'ADMIN' },
    { labelKey: 'accounts.roleManager', value: 'MANAGER' },
    { labelKey: 'accounts.roleEmployee', value: 'EMPLOYEE' },
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private allAccounts: AccountRow[] = [];

  ngOnInit() {
    forkJoin({
      accounts: this.accountService.getAll(),
      persons: this.personService.getAll(),
      organizations: this.isAdmin ? this.organizationService.getAll() : of([]),
      accountRoles: this.accountRoleService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ accounts, persons, organizations, accountRoles }) => {
        const personMap = new Map(persons.map(p => [p.persoonId, p]));
        const orgMap = new Map(organizations.map(o => [o.organizationId, o.name]));
        const roleMap = new Map<string, string[]>();
        for (const ar of accountRoles) {
          const existing = roleMap.get(ar.account.accountId) || [];
          existing.push(ar.role.description);
          roleMap.set(ar.account.accountId, existing);
        }

        if (this.isAdmin) {
          this.orgChips.set([
            { labelKey: 'accounts.allOrganizations', value: 'ALL' },
            ...organizations.map(o => ({ label: o.name, value: o.organizationId })),
          ]);
        }

        this.allAccounts = accounts.map(a => {
          const person = personMap.get(a.personId);
          const orgId = person?.organizationId || '';
          const personName = person
            ? `${person.firstname} ${person.prefix ? person.prefix + ' ' : ''}${person.lastname}`
            : a.personId;
          return {
            ...a,
            personName,
            organizationId: orgId,
            organizationName: orgMap.get(orgId) || '',
            roleDescriptions: roleMap.get(a.accountId) || [],
          };
        });

        this.dataSource.data = this.allAccounts;
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
    this.activeRoleChip.set(role);
    this.applyFilters();
  }

  filterByOrganization(orgId: string) {
    this.activeOrgChip.set(orgId);
    this.applyFilters();
  }

  navigateToNew() {
    this.router.navigate(['/admin/accounts/new']);
  }

  navigateToEdit(account: AccountRow) {
    this.router.navigate(['/admin/accounts', account.accountId]);
  }

  deleteAccount(account: AccountRow) {
    const message = this.translate.instant('accounts.deleteConfirm', { name: account.userName });
    if (!confirm(message)) return;

    this.accountService.delete(account.accountId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('accounts.removed'), '', { duration: 3000 });
        this.allAccounts = this.allAccounts.filter(a => a.accountId !== account.accountId);
        this.applyFilters();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('accounts.removeError'), '', { duration: 3000 });
      },
    });
  }

  private applyFilters() {
    const role = this.activeRoleChip();
    const orgId = this.activeOrgChip();

    let filtered = this.allAccounts;

    if (role !== 'ALL') {
      filtered = filtered.filter(a => a.roleDescriptions.includes(role));
    }
    if (orgId !== 'ALL') {
      filtered = filtered.filter(a => a.organizationId === orgId);
    }

    this.dataSource.data = filtered;
  }
}
