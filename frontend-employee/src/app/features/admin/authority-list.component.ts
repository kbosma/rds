import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthorityService } from './authority.service';
import { Authority } from '../../shared/models';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

/**
 * Overzicht van alle authorities (alleen lezen). Authorities liggen vast: ze komen uit Flyway, omdat ze pas iets doen
 * als de code ze controleert. Rollen stel je samen in het rollenscherm.
 */
@Component({
  selector: 'app-authority-list',
  standalone: true,
  imports: [
    EmptyStateComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'authorities.title' | translate }}</h1>
    </div>
    <p class="hint">{{ 'authorities.readOnlyNote' | translate }}</p>

    <div class="filter-bar">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ 'common.search' | translate }}</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput (keyup)="applyFilter($event)" [placeholder]="'authorities.searchPlaceholder' | translate" />
      </mat-form-field>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="domain">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'authorities.domain' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.domain }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'authorities.description' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.description }}</td>
          </ng-container>

          <ng-container matColumnDef="requires">
            <th mat-header-cell *matHeaderCellDef>{{ 'authorities.requires' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ (row.requires ?? []).join(', ') }}</td>
          </ng-container>

          <ng-container matColumnDef="tenantAssignable">
            <th mat-header-cell *matHeaderCellDef>{{ 'authorities.tenantAssignable' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              @if (row.tenantAssignable) {
                <mat-icon class="yes">check</mat-icon>
              } @else {
                <span class="badge badge-neutral">{{ 'authorities.platformOnly' | translate }}</span>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              <app-empty-state icon="security" [filtered]="dataSource.data.length > 0" [message]="'authorities.emptyState' | translate" />
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[25, 50, 100]" showFirstLastButtons></mat-paginator>
    }
  `,
  styles: [`
    .hint { color: var(--ui-text-muted, #5b6b77); margin: -4px 0 12px; }
    .yes { color: var(--theme-primary); }
  `],
})
export class AuthorityListComponent implements OnInit {
  private authorityService = inject(AuthorityService);
  private destroyRef = inject(DestroyRef);

  displayedColumns = ['domain', 'description', 'requires', 'tenantAssignable'];
  dataSource = new MatTableDataSource<Authority>();
  loading = signal(true);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.authorityService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (authorities) => {
        this.dataSource.data = authorities;
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
}
