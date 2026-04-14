import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from './activity.service';
import { Activity } from '../../shared/models';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <a routerLink="/activities" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'activity.title' | translate }}
    </a>

    <h1 class="page-title">{{ isNew() ? ('activity.newActivity' | translate) : ('activity.name' | translate) }}</h1>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <mat-card class="form-card">
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'activity.name' | translate }}</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'activity.description' | translate }}</mat-label>
              <textarea matInput formControlName="description" rows="3"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'activity.type' | translate }}</mat-label>
              <mat-select formControlName="activityType">
                @for (type of activityTypes; track type.value) {
                  <mat-option [value]="type.value">{{ type.labelKey | translate }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="actions">
              <button mat-button type="button" routerLink="/activities">
                <mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}
              </button>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title { font-size: 22px; font-weight: 500; margin: 8px 0 24px; }
    .form-card { border-radius: 12px; max-width: 600px; }
    .full-width { width: 100%; }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .loading { display: flex; justify-content: center; padding: 40px; }
  `],
})
export class ActivityDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private activityService = inject(ActivityService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  isNew = signal(true);
  loading = signal(false);
  saving = signal(false);
  private activityId: string | null = null;

  activityTypes = [
    { value: 'tour', labelKey: 'activity.tour' },
    { value: 'excursie', labelKey: 'activity.excursie' },
    { value: 'ticket', labelKey: 'activity.ticket' },
    { value: 'transfer', labelKey: 'activity.transfer' },
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    activityType: ['', Validators.required],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.activityId = id;
      this.loading.set(true);
      this.activityService.getById(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (activity) => {
            this.form.patchValue({
              name: activity.name,
              description: activity.description,
              activityType: activity.activityType,
            });
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.router.navigate(['/activities']);
          },
        });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const data: Partial<Activity> = {
      name: raw.name ?? undefined,
      description: raw.description ?? undefined,
      activityType: raw.activityType ?? undefined,
    };

    if (this.isNew()) {
      this.activityService.create(data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/activities']);
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('activity.saveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    } else {
      this.activityService.update(this.activityId!, data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/activities']);
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('activity.saveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    }
  }
}
