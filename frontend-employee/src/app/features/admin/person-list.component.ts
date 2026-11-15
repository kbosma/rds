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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { PersonService } from './person.service';
import { OrganizationService } from './organization.service';
import { AuthService } from '../../core/auth/auth.service';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { Person } from '../../shared/models';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

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
    EmptyStateComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RowActionsComponent,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
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

      @if (canSeeOrganizations) {
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
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.name' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ fullName(row) }}</td>
          </ng-container>

          <ng-container matColumnDef="organization">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'persons.organization' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.organizationName }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewPerson(row)" (edit)="navigateToEdit(row)" (remove)="deletePerson(row)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              <app-empty-state icon="people" [filtered]="dataSource.data.length > 0" [message]="'persons.emptyState' | translate">
                <button mat-stroked-button class="act-create" (click)="navigateToNew()"><mat-icon>add</mat-icon> {{ 'persons.newPerson' | translate }}</button>
              </app-empty-state>
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    }
  `,
  styles: [`
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
      background-color: var(--theme-primary) !important;
      color: white !important;
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
  private confirmService = inject(ConfirmService);

  canView = this.authService.hasAuthority('PERSON_READ');
  canEdit = this.authService.hasAuthority('PERSON_UPDATE');
  canDelete = this.authService.hasAuthority('PERSON_DELETE');
  /** Organisaties tonen/kiezen: alleen wie ze mag zien (ORGANIZATION_READ), niet op basis van een rol. */
  canSeeOrganizations = this.authService.hasAuthority('ORGANIZATION_READ');
  displayedColumns = this.canSeeOrganizations
    ? ['name', 'organization', 'actions']
    : ['name', 'actions'];
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
      organizations: this.canSeeOrganizations ? this.organizationService.getAll() : of([]),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ persons, organizations }) => {
        const orgMap = new Map(organizations.map(o => [o.organizationId, o.name]));

        if (this.canSeeOrganizations) {
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
          // De kolom Naam sorteert op achternaam (daarna voornaam), zoals in een telefoonboek.
          this.dataSource.sortingDataAccessor = (row, column) =>
            column === 'name' ? `${row.lastname} ${row.firstname}`.toLowerCase() : String((row as unknown as Record<string, unknown>)[column] ?? '');
          this.dataSource.sort = this.sort;
        });
      },
      error: () => this.loading.set(false),
    });
  }

  /** Volledige naam: voornaam, tussenvoegsel en achternaam (zonder dubbele spatie bij een leeg tussenvoegsel). */
  fullName(person: Person): string {
    return [person.firstname, person.prefix, person.lastname].filter(Boolean).join(' ');
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

  viewPerson(person: PersonRow) {
    this.router.navigate(['/admin/persons', person.persoonId], { queryParams: { readonly: 'true' } });
  }

  navigateToEdit(person: PersonRow) {
    this.router.navigate(['/admin/persons', person.persoonId]);
  }

  async deletePerson(person: PersonRow) {
    const name = `${person.firstname} ${person.prefix ? person.prefix + ' ' : ''}${person.lastname}`;
    const message = this.translate.instant('persons.deleteConfirm', { name });
    if (!await this.confirmService.confirmDelete(message)) return;

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
