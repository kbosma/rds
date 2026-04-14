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
import { PersonService } from './person.service';
import { OrganizationService } from './organization.service';
import { AuthService } from '../../core/auth/auth.service';
import { Person } from '../../shared/models';

interface PersonRow extends Person {
  organizationName: string;
}

interface OrgChip {
  labelKey?: string;
  label?: string;
  value: string;
}

@Component({
  selector: 'app-person-list',
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
      <h1>{{ 'persons.title' | translate }}</h1>
      <button mat-raised-button color="primary" (click)="navigateToNew()">
        <mat-icon>add</mat-icon> {{ 'persons.newPerson' | translate }}
      </button>
    </div>

    <div class="filter-bar">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'common.search' | translate }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput (keyup)="applyFilter($event)" [placeholder]="'persons.searchPlaceholder' | translate" />
      </mat-form-field>

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
          <ng-container matColumnDef="firstname">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'persons.firstname' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.firstname }}</td>
          </ng-container>

          <ng-container matColumnDef="prefix">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'persons.prefix' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.prefix }}</td>
          </ng-container>

          <ng-container matColumnDef="lastname">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'persons.lastname' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.lastname }}</td>
          </ng-container>

          <ng-container matColumnDef="organization">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'persons.organization' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.organizationName }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="primary" (click)="navigateToEdit(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deletePerson(row)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'persons.noPersonsFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    }
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
  `],
})
export class PersonListComponent implements OnInit {
  private personService = inject(PersonService);
  private organizationService = inject(OrganizationService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  isAdmin = this.authService.hasRole('ADMIN');
  displayedColumns = this.isAdmin
    ? ['firstname', 'prefix', 'lastname', 'organization', 'actions']
    : ['firstname', 'prefix', 'lastname', 'actions'];
  dataSource = new MatTableDataSource<PersonRow>();
  loading = signal(true);
  activeOrgChip = signal('ALL');
  orgChips = signal<OrgChip[]>([{ labelKey: 'persons.allOrganizations', value: 'ALL' }]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private allPersons: PersonRow[] = [];

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    forkJoin({
      persons: this.personService.getAll(),
      organizations: this.isAdmin ? this.organizationService.getAll() : of([]),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ persons, organizations }) => {
        const orgMap = new Map(organizations.map(o => [o.organizationId, o.name]));

        if (this.isAdmin) {
          this.orgChips.set([
            { labelKey: 'persons.allOrganizations', value: 'ALL' },
            ...organizations.map(o => ({ label: o.name, value: o.organizationId })),
          ]);
        }

        this.allPersons = persons.map(p => ({
          ...p,
          organizationName: orgMap.get(p.organizationId) || p.organizationId,
        }));
        this.dataSource.data = this.allPersons;
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

  filterByOrganization(orgId: string) {
    this.activeOrgChip.set(orgId);
    if (orgId === 'ALL') {
      this.dataSource.data = this.allPersons;
    } else {
      this.dataSource.data = this.allPersons.filter(p => p.organizationId === orgId);
    }
  }

  navigateToNew() {
    this.router.navigate(['/admin/persons/new']);
  }

  navigateToEdit(person: PersonRow) {
    this.router.navigate(['/admin/persons', person.persoonId]);
  }

  deletePerson(person: PersonRow) {
    const name = `${person.firstname} ${person.prefix ? person.prefix + ' ' : ''}${person.lastname}`;
    const message = this.translate.instant('persons.deleteConfirm', { name });
    if (!confirm(message)) return;

    this.personService.delete(person.persoonId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('persons.removed'), '', { duration: 3000 });
        this.allPersons = this.allPersons.filter(p => p.persoonId !== person.persoonId);
        this.filterByOrganization(this.activeOrgChip());
      },
      error: () => {
        this.snackBar.open(this.translate.instant('persons.removeError'), '', { duration: 3000 });
      },
    });
  }
}
