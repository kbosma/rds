import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { OrganizationService } from './organization.service';
import { Organization } from '../../shared/models';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { RowActionsComponent } from '../../shared/components/row-actions.component';

@Component({
  selector: 'app-organization-list',
  standalone: true,
  imports: [
    EmptyStateComponent,
    RowActionsComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
    DatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'organizations.title' | translate }}</h1>
      <div class="header-actions">
        @if (canOnboard) {
          <button mat-raised-button class="onboarding-btn" (click)="navigateToOnboarding()">
            <mat-icon>rocket_launch</mat-icon> {{ 'organizations.onboardingWizard' | translate }}
          </button>
        }
        @if (canCreate) {
          <button mat-raised-button color="primary" class="new-btn" (click)="navigateToNew()">
            <mat-icon>add</mat-icon> {{ 'organizations.newOrganization' | translate }}
          </button>
        }
      </div>
    </div>

    <div class="filter-bar">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'common.search' | translate }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput (keyup)="applyFilter($event)" [placeholder]="'organizations.searchPlaceholder' | translate" />
      </mat-form-field>
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
            <td mat-cell *matCellDef="let row">{{ row.name }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'organizations.createdAt' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <app-row-actions [canEdit]="canEdit" [canDelete]="canDelete"
                               (edit)="navigateToEdit(row)" (remove)="deleteOrganization(row)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              <app-empty-state icon="business" [filtered]="dataSource.data.length > 0" [message]="'organizations.emptyState' | translate">
                @if (canCreate) {
                  <button mat-stroked-button class="act-create" (click)="navigateToNew()"><mat-icon>add</mat-icon> {{ 'organizations.newOrganization' | translate }}</button>
                }
              </app-empty-state>
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    }
  `,
  styles: [`
    .header-actions {
      display: flex;
      gap: 8px;
    }
  `],
})
export class OrganizationListComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private authService = inject(AuthService);

  // Knoppen volgen de authorities die de backend per endpoint eist (OrganizationController), nooit de rol.
  canCreate = this.authService.hasAuthority('ORGANIZATION_CREATE');
  canEdit = this.authService.hasAuthority('ORGANIZATION_UPDATE');
  canDelete = this.authService.hasAuthority('ORGANIZATION_DELETE');
  // De wizard maakt achtereenvolgens een organisatie, persoon, account en rolkoppeling aan.
  canOnboard = ['ORGANIZATION_CREATE', 'PERSON_CREATE', 'ACCOUNT_CREATE', 'ACCOUNTROLE_CREATE']
    .every(authority => this.authService.hasAuthority(authority));

  displayedColumns = ['name', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Organization>();
  loading = signal(true);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.organizationService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (organizations) => {
        // Alleen klanten: RDS Platform (de beheerders) wordt hier niet beheerd en is niet te verwijderen.
        this.dataSource.data = organizations.filter((o) => !o.platform);
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

  navigateToOnboarding() {
    this.router.navigate(['/admin/organizations/onboarding']);
  }

  navigateToNew() {
    this.router.navigate(['/admin/organizations/new']);
  }

  navigateToEdit(org: Organization) {
    this.router.navigate(['/admin/organizations', org.organizationId]);
  }

  async deleteOrganization(org: Organization) {
    const message = this.translate.instant('organizations.deleteConfirm', { name: org.name });
    if (!await this.confirmService.confirmDelete(message)) return;

    this.organizationService.delete(org.organizationId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('organizations.removed'), '', { duration: 3000 });
        this.dataSource.data = this.dataSource.data.filter(o => o.organizationId !== org.organizationId);
      },
      error: (err: HttpErrorResponse) => {
        // 409: de server weigert omdat de organisatie nog bedrijfsgegevens heeft (OrganizationDeletionGuard).
        const key = err?.status === 409 ? 'organizations.deleteBlocked' : 'organizations.removeError';
        this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 6000 });
      },
    });
  }
}
