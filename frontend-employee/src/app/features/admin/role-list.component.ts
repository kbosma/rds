import { Component, computed, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { RoleService } from './role.service';
import { Authority, Role } from '../../shared/models';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-role-list',
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
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'roles.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" (click)="navigateToNew()">
          <mat-icon>add</mat-icon> {{ 'roles.newRole' | translate }}
        </button>
      }
    </div>

    @if (newAuthorities().length > 0) {
      <div class="new-rights">
        <mat-icon>new_releases</mat-icon>
        <span>{{ 'roles.newAuthoritiesBanner' | translate: { count: newAuthorities().length, names: newAuthorityNames() } }}</span>
        @if (canUpdate) {
          <button mat-stroked-button class="seen-btn" (click)="markSeen()">{{ 'roles.newAuthoritiesSeen' | translate }}</button>
        }
      </div>
    }

    <div class="filter-bar">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'common.search' | translate }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput (keyup)="applyFilter($event)" [placeholder]="'roles.searchPlaceholder' | translate" />
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'roles.description' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              {{ row.description }}
              @if (row.systemKey) {
                <mat-icon class="lock" [attr.title]="'roles.systemRole' | translate">lock</mat-icon>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="accountCount">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'roles.accounts' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.accountCount ?? '' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <app-row-actions [canView]="!row.editable" [canEdit]="!!row.editable && canUpdate"
                               [canDelete]="!!row.editable && canDelete"
                               (view)="navigateToEdit(row)" (edit)="navigateToEdit(row)" (remove)="deleteRole(row)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              <app-empty-state icon="admin_panel_settings" [filtered]="dataSource.data.length > 0" [message]="'roles.emptyState' | translate">
                @if (canCreate) {
                  <button mat-stroked-button class="act-create" (click)="navigateToNew()"><mat-icon>add</mat-icon> {{ 'roles.newRole' | translate }}</button>
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
    .new-rights { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; border-radius: var(--ui-radius); background: color-mix(in srgb, var(--theme-accent) 18%, transparent); }
    .new-rights span { flex: 1; }
    .lock { font-size: 16px; width: 16px; height: 16px; vertical-align: text-bottom; color: var(--ui-text-muted, #5b6b77); margin-left: 4px; }
  `],
})
export class RoleListComponent implements OnInit {
  private roleService = inject(RoleService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private authService = inject(AuthService);

  canCreate = this.authService.hasAuthority('ROLE_CREATE');
  canUpdate = this.authService.hasAuthority('ROLE_UPDATE');
  canDelete = this.authService.hasAuthority('ROLE_DELETE');

  displayedColumns = ['description', 'accountCount', 'actions'];
  /** Uitdeelbare rechten die nieuw zijn sinds de organisatie ze voor het laatst bekeek. */
  newAuthorities = signal<Authority[]>([]);
  newAuthorityNames = computed(() => this.newAuthorities().map((a) => a.description).join(', '));
  dataSource = new MatTableDataSource<Role>();
  loading = signal(true);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.roleService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (roles) => {
        this.dataSource.data = roles;
        this.loading.set(false);
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: () => this.loading.set(false),
    });
    this.roleService.getNewAuthorities().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (authorities) => this.newAuthorities.set(authorities),
      error: () => this.newAuthorities.set([]),
    });
  }

  /** De nieuwe rechten als gezien markeren; de melding verdwijnt voor de hele organisatie. */
  markSeen() {
    this.roleService.markNewAuthoritiesSeen().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.newAuthorities.set([]),
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  navigateToNew() {
    this.router.navigate(['/admin/roles/new']);
  }

  navigateToEdit(role: Role) {
    this.router.navigate(['/admin/roles', role.roleId]);
  }

  async deleteRole(role: Role) {
    const message = this.translate.instant('roles.deleteConfirm', { name: role.description });
    if (!await this.confirmService.confirmDelete(message)) return;

    this.roleService.delete(role.roleId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('roles.removed'), '', { duration: 3000 });
        this.dataSource.data = this.dataSource.data.filter(r => r.roleId !== role.roleId);
      },
      error: (err) => {
        // De backend legt uit waarom (bijv. "nog toegewezen aan 2 account(s)").
        this.snackBar.open(err?.error?.message || this.translate.instant('roles.removeError'), '', { duration: 5000 });
      },
    });
  }
}
