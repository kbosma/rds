import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from './activity.service';
import { AuthService } from '../../core/auth/auth.service';
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
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'activity.title' | translate }}</h1>
      @if (canEdit) {
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
    } @else if (filtered().length === 0) {
      <p class="empty-text">{{ 'activity.noActivitiesFound' | translate }}</p>
    } @else {
      <table mat-table [dataSource]="filtered()" class="full-width">
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
          <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
          <td mat-cell *matCellDef="let a">
            @if (canEdit) {
              <a mat-icon-button color="primary" [routerLink]="'/activities/' + a.activityId"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button color="warn" (click)="deleteActivity(a)"><mat-icon>delete</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
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
    .loading { display: flex; justify-content: center; padding: 40px; }
    .empty-text { color: #888; font-style: italic; }
  `],
})
export class ActivityListComponent implements OnInit {
  private activityService = inject(ActivityService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  canEdit = this.authService.hasRole('ADMIN') || this.authService.hasRole('MANAGER');
  displayedColumns = ['name', 'activityType', 'description', 'actions'];

  allActivities = signal<Activity[]>([]);
  filtered = signal<Activity[]>([]);
  loading = signal(true);

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

  deleteActivity(activity: Activity) {
    if (!confirm(this.translate.instant('activity.deleteConfirm', { name: activity.name }))) return;

    this.activityService.delete(activity.activityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.allActivities.set(this.allActivities().filter(a => a.activityId !== activity.activityId));
          this.filtered.set(this.filtered().filter(a => a.activityId !== activity.activityId));
        },
        error: () => {
          this.snackBar.open(this.translate.instant('activity.saveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
