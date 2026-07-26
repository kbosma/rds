import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

interface Activity {
  activityId: string;
  name: string;
  description: string;
  fromDate: string;
  untilDate: string;
  location: string;
  activityType: string;
}

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule, TranslatePipe],
  template: `
    <h1>{{ 'activities.title' | translate }}</h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (activities().length === 0) {
      <mat-card class="empty-card">
        <mat-card-content class="empty-content">
          <mat-icon>local_activity</mat-icon>
          <p>{{ 'activities.noActivities' | translate }}</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="activity-list">
        @for (activity of activities(); track activity.activityId) {
          <mat-card class="activity-card">
            <mat-card-content class="activity-content">
              <div class="date-badge">
                <span class="date-day">{{ activity.fromDate | date:'d' }}</span>
                <span class="date-month">{{ activity.fromDate | date:'MMM' }}</span>
              </div>
              <div class="activity-details">
                <div class="activity-header">
                  <span class="activity-name">{{ activity.name }}</span>
                  <mat-chip-set>
                    <mat-chip class="type-chip">{{ activity.activityType }}</mat-chip>
                  </mat-chip-set>
                </div>
                @if (activity.description) {
                  <div class="activity-description">{{ activity.description }}</div>
                }
                <div class="activity-meta">
                  @if (activity.location) {
                    <span><mat-icon inline>place</mat-icon> {{ activity.location }}</span>
                  }
                  <span>
                    <mat-icon inline>schedule</mat-icon>
                    {{ activity.fromDate | date:'HH:mm' }} – {{ activity.untilDate | date:'HH:mm' }}
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    h1 { font-size: 22px; font-weight: 500; margin-bottom: 20px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .activity-list { display: grid; gap: 12px; }
    .activity-card { border-radius: 12px; }
    .activity-content { display: flex; align-items: flex-start; gap: 16px; padding: 8px 0; }

    .date-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      height: 44px;
      background: #2e7d32;
      border-radius: 8px;
      color: white;
      flex-shrink: 0;
    }
    .date-day { font-size: 18px; font-weight: 700; line-height: 1; }
    .date-month { font-size: 10px; text-transform: uppercase; opacity: 0.85; }

    .activity-details { flex: 1; min-width: 0; }
    .activity-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
    .activity-name { font-size: 15px; font-weight: 500; }
    .type-chip { font-size: 11px; height: 20px; background: #e8f5e9; color: #1b5e20; }
    .activity-description { font-size: 13px; color: #555; margin-bottom: 6px; }
    .activity-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: #888;
      flex-wrap: wrap;
    }
    .activity-meta span { display: flex; align-items: center; gap: 3px; }
    .activity-meta mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .empty-card { border-radius: 12px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; padding: 32px; color: #888; }
    .empty-content mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
  `],
})
export class ActivitiesComponent implements OnInit {
  private api = inject(ApiService);

  activities = signal<Activity[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.getAll<Activity>('booker-portal/activities').subscribe({
      next: (data) => {
        this.activities.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
