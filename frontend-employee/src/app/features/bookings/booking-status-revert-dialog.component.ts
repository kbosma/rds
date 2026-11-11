import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Booking, BookingService } from './booking.service';

export interface BookingStatusRevertDialogData {
  booking: Booking;
}

/** De statussen in volgorde; terugzetten kan naar elke status vóór de huidige. */
export const BOOKING_STATUS_ORDER = ['aanvraag', 'offerte', 'boeking', 'voorschot', 'betaald', 'opreis', 'weerthuis', 'afgerond'];

/**
 * Status terugzetten, altijd met reden. Terug naar Aanvraag of Offerte maakt ook de bevestiging van de offerte
 * ongedaan. Na een betaling mag alleen een manager dit; de server controleert dat.
 */
@Component({
  selector: 'app-booking-status-revert-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSnackBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'bookingStatus.revertTitle' | translate }}</h2>
    <mat-dialog-content>
      <p class="intro">{{ 'bookingStatus.revertIntro' | translate: { status: ('bookings.status_' + data.booking.bookingStatus | translate) } }}</p>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'bookingStatus.target' | translate }}</mat-label>
          <mat-select formControlName="targetStatus" class="target-status">
            @for (s of targets; track s) {
              <mat-option [value]="s">{{ 'bookings.status_' + s | translate }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (unconfirms()) {
          <p class="warning unconfirm-warning">{{ 'bookingStatus.unconfirmWarning' | translate }}</p>
        }
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'bookingStatus.reason' | translate }}</mat-label>
          <textarea matInput formControlName="reason" rows="3" class="reason"></textarea>
          <mat-hint>{{ 'bookingStatus.reasonHint' | translate }}</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
      <button mat-flat-button class="act-update revert-btn" [disabled]="form.invalid || saving()" (click)="revert()">
        <mat-icon>undo</mat-icon> {{ 'bookingStatus.revert' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .intro { margin-top: 0; }
    .warning { font-size: 13px; color: var(--act-update, #6a1b9a); margin: -8px 0 12px; }
  `],
})
export class BookingStatusRevertDialogComponent {
  data: BookingStatusRevertDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BookingStatusRevertDialogComponent>);
  private bookingService = inject(BookingService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  readonly targets = BOOKING_STATUS_ORDER.slice(0, Math.max(0, BOOKING_STATUS_ORDER.indexOf(this.data.booking.bookingStatus))).reverse();
  saving = signal(false);

  form = this.fb.nonNullable.group({
    targetStatus: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
  });

  unconfirms(): boolean {
    const target = this.form.controls.targetStatus.value;
    return this.data.booking.quoteConfirmed && (target === 'aanvraag' || target === 'offerte');
  }

  revert() {
    if (this.form.invalid) return;
    const { targetStatus, reason } = this.form.getRawValue();
    this.saving.set(true);
    this.bookingService.revertStatus(this.data.booking.bookingId, targetStatus, reason.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookingStatus.reverted'), this.translate.instant('common.close'), { duration: 3000 });
          this.dialogRef.close(booking);
        },
        error: (err) => {
          this.saving.set(false);
          const key = err?.status === 403 ? 'bookingStatus.revertForbidden' : 'bookingStatus.revertError';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 6000 });
        },
      });
  }
}
