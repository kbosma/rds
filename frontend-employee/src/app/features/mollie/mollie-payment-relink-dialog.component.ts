import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MolliePaymentService } from './mollie-payment.service';
import { BookingService } from '../bookings/booking.service';
import { Booking, MolliePayment } from '../../shared/models';
import { reasonHasText } from '../../shared/utils/reason.validator';

export interface MolliePaymentRelinkDialogData {
  payment: MolliePayment;
  /** De boeking waaraan de betaling nu hangt; die is niet te kiezen. */
  currentBookingId: string;
}

/**
 * Een betaling die aan de verkeerde boeking hangt, wordt aan een andere boeking gekoppeld, met een verplichte reden.
 * Een koppeling wordt nooit losgemaakt: dit registreert een herkoppeling (wie, wanneer, van/naar, waarom) die
 * alleen-toevoegen is; de betaling en haar statushistorie blijven ongewijzigd.
 */
@Component({
  selector: 'app-mollie-payment-relink-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatSnackBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'payments.relinkTitle' | translate }}</h2>
    <mat-dialog-content>
      <p class="hint">{{ 'payments.relinkHint' | translate }}</p>
      <form [formGroup]="form" class="form">
        <mat-form-field appearance="outline">
          <mat-label>{{ 'payments.relinkTarget' | translate }}</mat-label>
          <mat-select formControlName="targetBookingId">
            @for (b of bookings(); track b.bookingId) {
              <mat-option [value]="b.bookingId">
                {{ b.bookingNumber }} ({{ 'bookings.status_' + b.bookingStatus | translate }})
              </mat-option>
            }
          </mat-select>
          @if (!loading() && bookings().length === 0) {
            <mat-hint>{{ 'payments.relinkNoBookings' | translate }}</mat-hint>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ 'payments.relinkReason' | translate }}</mat-label>
          <textarea matInput rows="3" maxlength="500" formControlName="reason"></textarea>
          <mat-hint>{{ 'payments.correctionReasonHint' | translate }}</mat-hint>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ 'payments.relinkSubmit' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 4px; min-width: 380px; }
    .hint { margin: 0 0 12px; color: var(--ui-text-muted); font-size: 13px; }
  `],
})
export class MolliePaymentRelinkDialogComponent implements OnInit {
  private data: MolliePaymentRelinkDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MolliePaymentRelinkDialogComponent>);
  private paymentService = inject(MolliePaymentService);
  private bookingService = inject(BookingService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);

  bookings = signal<Booking[]>([]);
  loading = signal(true);
  saving = signal(false);

  form = this.fb.group({
    targetBookingId: ['', Validators.required],
    reason: ['', [Validators.required, reasonHasText]],
  });

  ngOnInit() {
    this.bookingService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bookings) => {
          this.bookings.set(bookings
            .filter((b) => b.bookingId !== this.data.currentBookingId)
            .sort((a, b) => b.bookingNumber.localeCompare(a.bookingNumber)));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  save() {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const { targetBookingId, reason } = this.form.getRawValue();

    this.paymentService.relink(this.data.payment.molliePaymentId, targetBookingId!, reason!.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('payments.relinkSaved'), '', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('payments.relinkError'), '', { duration: 5000 });
        },
      });
  }
}
