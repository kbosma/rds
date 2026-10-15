import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ActivityService } from './activity.service';
import { AuthService } from '../../core/auth/auth.service';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { Activity } from '../../shared/models';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    RowActionsComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <div class="header">
      <h1>{{ 'activity.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" routerLink="/activities/new">
          <mat-icon>add</mat-icon> {{ 'activity.newActivity' | translate }}
        </button>
      }
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (input)="applyFilter($event)" />
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="paged()" class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'activity.name' | translate }}</th>
            <td mat-cell *matCellDef="let a">{{ a.name }}</td>
          </ng-container>
          <ng-container matColumnDef="activityType">
            <th mat-header-cell *matHeaderCellDef>{{ 'activity.type' | translate }}</th>
            <td mat-cell *matCellDef="let a">{{ 'activity.' + a.activityType | translate }}</td>
          </ng-container>
          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>{{ 'activity.description' | translate }}</th>
            <td mat-cell *matCellDef="let a">{{ a.description }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let a" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewActivity(a)" (edit)="editActivity(a)" (remove)="deleteActivity(a)" />
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'activity.noActivitiesFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="filtered().length"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>
    }
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h1 { margin: 0; font-size: 24px; font-weight: 500; }
    .filter-field { width: 100%; }
    .full-width { width: 100%; }
    .table-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .alt-row { background-color: #fafafa; }
    .actions-header { text-align: right; }
    .actions-cell { width: 1%; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    .loading { display: flex; justify-content: center; padding: 40px; }
  `],
})
export class ActivityListComponent implements OnInit {
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  canCreate = this.authService.hasAuthority('ACTIVITY_CREATE');
  canView = this.authService.hasAuthority('ACTIVITY_READ');
  canEdit = this.authService.hasAuthority('ACTIVITY_UPDATE');
  canDelete = this.authService.hasAuthority('ACTIVITY_DELETE');
  displayedColumns = ['name', 'activityType', 'description', 'actions'];

  allActivities = signal<Activity[]>([]);
  filtered = signal<Activity[]>([]);
  loading = signal(true);
  pageIndex = signal(0);
  pageSize = signal(25);
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.activityService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activities) => {
          this.allActivities.set(activities);
          this.filtered.set(activities);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.pageIndex.set(0);
    if (!value) {
      this.filtered.set(this.allActivities());
    } else {
      this.filtered.set(
        this.allActivities().filter(a =>
          a.name.toLowerCase().includes(value)
          || a.activityType.toLowerCase().includes(value)
          || (a.description?.toLowerCase().includes(value) ?? false)
        )
      );
    }
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  viewActivity(activity: Activity) {
    this.router.navigate(['/activities', activity.activityId], { queryParams: { readonly: 'true' } });
  }

  editActivity(activity: Activity) {
    this.router.navigate(['/activities', activity.activityId]);
  }

  async deleteActivity(activity: Activity) {
    const message = this.translate.instant('activity.deleteConfirm', { name: activity.name })
      + ' ' + this.translate.instant('activity.deleteCascadeWarning');
    if (!await this.confirmService.confirmDelete(message)) return;

    this.activityService.delete(activity.activityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.allActivities.set(this.allActivities().filter(a => a.activityId !== activity.activityId));
          this.filtered.set(this.filtered().filter(a => a.activityId !== activity.activityId));
        },
        error: (err) => {
          const key = deleteErrorKey(err) === 'common.deleteBlocked' ? 'common.deleteBlocked' : 'activity.saveError';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 6000 });
        },
      });
  }
}
