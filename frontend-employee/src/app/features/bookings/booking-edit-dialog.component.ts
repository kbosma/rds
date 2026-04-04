import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Booking, BookingService } from './booking.service';

export interface BookingEditDialogData {
  booking: Booking;
}

@Component({
  selector: 'app-booking-edit-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
    CurrencyPipe,
    DatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'bookings.editBookingTitle' | translate }}</h2>
    <mat-dialog-content>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">{{ 'bookings.bookingNumber' | translate }}</span>
          <span class="info-value">{{ data.booking.bookingNumber }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ 'bookings.fromDateComputed' | translate }}</span>
          <span class="info-value">{{ data.booking.fromDate | date:'dd-MM-yyyy' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ 'bookings.untilDateComputed' | translate }}</span>
          <span class="info-value">{{ data.booking.untilDate | date:'dd-MM-yyyy' }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">{{ 'bookings.totalComputed' | translate }}</span>
          <span class="info-value total">{{ data.booking.totalSum | currency:'EUR':'symbol':'1.2-2' }}</span>
        </div>
      </div>

      <mat-form-field appearance="outline" class="full-width status-field">
        <mat-label>{{ 'common.status' | translate }}</mat-label>
        <mat-select [formControl]="statusControl">
          @for (s of statuses; track s.value) {
            <mat-option [value]="s.value">{{ s.labelKey | translate }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        <mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}
      </button>
      <button mat-raised-button color="primary"
              (click)="onSave()"
              [disabled]="saving() || statusControl.invalid">
        @if (saving()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .info-grid {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 15px;
      margin-top: 2px;
    }
    .info-value.total {
      font-weight: 600;
      color: #2e7d32;
    }
    .full-width { width: 100%; }
    .status-field { margin-top: 8px; }
  `],
})
export class BookingEditDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<BookingEditDialogComponent>);
  data: BookingEditDialogData = inject(MAT_DIALOG_DATA);
  private bookingService = inject(BookingService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  saving = signal(false);

  statusControl = this.fb.control(this.data.booking.bookingStatus, Validators.required);

  statuses = [
    { value: 'aanvraag', labelKey: 'bookings.status_aanvraag' },
    { value: 'offerte', labelKey: 'bookings.status_offerte' },
    { value: 'boeking', labelKey: 'bookings.status_boeking' },
    { value: 'voorschot', labelKey: 'bookings.status_voorschot' },
    { value: 'betaald', labelKey: 'bookings.status_betaald' },
    { value: 'afgerond', labelKey: 'bookings.status_afgerond' },
  ];

  onSave() {
    if (this.statusControl.invalid) return;
    this.saving.set(true);

    this.bookingService.update(this.data.booking.bookingId, {
      bookingStatus: this.statusControl.value!,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('bookings.saved'), this.translate.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('bookings.saveError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }
}
