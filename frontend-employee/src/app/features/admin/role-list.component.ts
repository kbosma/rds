import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RoleService } from './role.service';
import { Role } from '../../shared/models';

@Component({
  selector: 'app-role-list',
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
      <h1>{{ 'roles.title' | translate }}</h1>
      <button mat-raised-button color="primary" (click)="navigateToNew()">
        <mat-icon>add</mat-icon> {{ 'roles.newRole' | translate }}
      </button>
    </div>

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
            <td mat-cell *matCellDef="let row">{{ row.description }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="primary" (click)="navigateToEdit(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteRole(row)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'roles.noRolesFound' | translate }}
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
      margin-bottom: 8px;
    }
    .search-field {
      flex: 1;
      min-width: 300px;
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
export class RoleListComponent implements OnInit {
  private roleService = inject(RoleService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  displayedColumns = ['description', 'actions'];
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

  deleteRole(role: Role) {
    const message = this.translate.instant('roles.deleteConfirm', { name: role.description });
    if (!confirm(message)) return;

    this.roleService.delete(role.roleId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('roles.removed'), '', { duration: 3000 });
        this.dataSource.data = this.dataSource.data.filter(r => r.roleId !== role.roleId);
      },
      error: () => {
        this.snackBar.open(this.translate.instant('roles.removeError'), '', { duration: 3000 });
      },
    });
  }
}
