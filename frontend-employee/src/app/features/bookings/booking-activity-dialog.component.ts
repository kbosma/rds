import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivityService } from '../activities/activity.service';
import { BookingActivityService } from './booking-activity.service';
import { Activity, BookingActivity } from '../../shared/models';

export interface BookingActivityDialogData {
  bookingId: string;
  bookingActivity?: BookingActivity;
}

@Component({
  selector: 'app-booking-activity-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
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
    <h2 mat-dialog-title>{{ isEdit ? ('bookingActivity.editTitle' | translate) : ('bookingActivity.addTitle' | translate) }}</h2>
    <mat-dialog-content>
      @if (loadingData()) {
        <div class="loading"><mat-spinner diameter="30"></mat-spinner></div>
      } @else {
        <form [formGroup]="form">
          @if (!isEdit) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'bookingActivity.activity' | translate }}</mat-label>
              <mat-select formControlName="activityId">
                @for (act of activities(); track act.activityId) {
                  <mat-option [value]="act.activityId">{{ act.name }} ({{ 'activity.' + act.activityType | translate }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
          } @else {
            <div class="resolved-field">
              <span class="resolved-label">{{ 'bookingActivity.activity' | translate }}</span>
              <span class="resolved-value">{{ editActivityName }} ({{ editActivityType }})</span>
            </div>
          }

          <div class="row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>{{ 'bookingActivity.fromDateTime' | translate }}</mat-label>
              <input matInput formControlName="fromDate" type="datetime-local" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>{{ 'bookingActivity.untilDateTime' | translate }}</mat-label>
              <input matInput formControlName="untilDate" type="datetime-local" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'bookingActivity.meetingPoint' | translate }}</mat-label>
            <input matInput formControlName="meetingPoint" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'bookingActivity.totalPrice' | translate }}</mat-label>
            <span matTextPrefix>&euro;&nbsp;</span>
            <input matInput type="number" formControlName="totalPrice" />
          </mat-form-field>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary"
              (click)="onSubmit()"
              [disabled]="saving() || form.invalid || loadingData()">
        @if (saving()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          @if (isEdit) {
            <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
          } @else {
            <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
          }
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; }
    .flex-1 { flex: 1; }
    .loading { display: flex; justify-content: center; padding: 24px; }
    .resolved-field { display: flex; flex-direction: column; margin-bottom: 16px; }
    .resolved-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
    .resolved-value { font-size: 15px; font-weight: 500; margin-top: 2px; }
  `],
})
export class BookingActivityDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<BookingActivityDialogComponent>);
  private data: BookingActivityDialogData = inject(MAT_DIALOG_DATA);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private activityService = inject(ActivityService);
  private bookingActivityService = inject(BookingActivityService);
  private translate = inject(TranslateService);

  isEdit = !!this.data.bookingActivity;
  editActivityName = this.data.bookingActivity?.activityName ?? '';
  editActivityType = this.data.bookingActivity?.activityType
    ? this.translate.instant('activity.' + this.data.bookingActivity.activityType)
    : '';

  activities = signal<Activity[]>([]);
  loadingData = signal(true);
  saving = signal(false);

  form = this.fb.group({
    activityId: [this.data.bookingActivity?.activityId ?? '', Validators.required],
    fromDate: [this.data.bookingActivity?.fromDate ?? ''],
    untilDate: [this.data.bookingActivity?.untilDate ?? ''],
    meetingPoint: [this.data.bookingActivity?.meetingPoint ?? ''],
    totalPrice: [this.data.bookingActivity?.totalPrice ?? null as number | null, [Validators.min(0)]],
  });

  ngOnInit() {
    if (this.isEdit) {
      this.loadingData.set(false);
    } else {
      this.activityService.getAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (activities) => {
            this.activities.set(activities);
            this.loadingData.set(false);
          },
        });
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();

    if (this.isEdit) {
      const ba = this.data.bookingActivity!;
      this.bookingActivityService.update(ba.bookingActivityId, {
        bookingId: ba.bookingId,
        activityId: ba.activityId,
        fromDate: raw.fromDate!,
        untilDate: raw.untilDate!,
        meetingPoint: raw.meetingPoint!,
        totalPrice: raw.totalPrice!,
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookingActivity.saveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
    } else {
      this.bookingActivityService.create({
        bookingId: this.data.bookingId,
        activityId: raw.activityId!,
        fromDate: raw.fromDate!,
        untilDate: raw.untilDate!,
        meetingPoint: raw.meetingPoint!,
        totalPrice: raw.totalPrice!,
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookingActivity.addError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
    }
  }
}
