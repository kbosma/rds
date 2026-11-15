import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
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

      <div class="info-item status-line">
        <span class="info-label">{{ 'common.status' | translate }}</span>
        <span class="info-value current-status">
          {{ 'bookings.status_' + data.booking.bookingStatus | translate }}
          @if (quoteConfirmedControl.value && canConfirm) {
            → <strong class="next-status">{{ 'bookings.status_boeking' | translate }}</strong>
          }
        </span>
        <span class="hint status-hint">{{ 'bookingStatus.setBySystem' | translate }}</span>
      </div>

      <div class="quote">
        <mat-checkbox [formControl]="quoteConfirmedControl" class="quote-confirmed">{{ 'bookings.quoteConfirmed' | translate }}</mat-checkbox>
        @if (data.booking.quoteConfirmed) {
          <span class="hint confirmed-on">{{ 'bookings.quoteConfirmedOn' | translate }} {{ data.booking.quoteConfirmedAt | date:'dd-MM-yyyy HH:mm' }}</span>
        } @else if (!canConfirm) {
          <span class="hint confirm-hint">{{ 'bookings.quoteConfirmHint' | translate }}</span>
        } @else if (quoteConfirmedControl.value) {
          <span class="hint confirm-effect">{{ 'bookings.quoteConfirmEffect' | translate }}</span>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        <mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}
      </button>
      <button mat-raised-button color="primary"
              (click)="onSave()"
              [disabled]="saving() || !confirming()">
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
    .status-line { margin-bottom: 16px; }
    .quote { display: flex; flex-direction: column; gap: 4px; }
    .hint { font-size: 12px; color: #5d7a85; }
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

  /**
   * De hoofdboeker bevestigt de offerte: kan alleen in status Offerte en met een hoofdboeker. Eenmaal bevestigd blijft
   * het vinkje staan; terugzetten gaat via "Status terugzetten" (met reden). De status zelf kies je hier niet: die zet
   * het systeem (offerte versturen, bevestigen, betalingen en reisdatums).
   */
  readonly canConfirm = !this.data.booking.quoteConfirmed
    && this.data.booking.bookingStatus === 'offerte'
    && !!this.data.booking.bookerId;
  quoteConfirmedControl = this.fb.nonNullable.control({ value: this.data.booking.quoteConfirmed, disabled: !this.canConfirm });

  /** Er valt alleen iets op te slaan als de offerte nu wordt bevestigd. */
  confirming(): boolean {
    return this.canConfirm && this.quoteConfirmedControl.value;
  }

  onSave() {
    if (!this.confirming()) return;
    this.saving.set(true);

    // Altijd de hele boeking meesturen: een PUT vervangt alles, dus zonder bookerId zou de hoofdboeker loskomen.
    this.bookingService.update(this.data.booking.bookingId, {
      ...this.data.booking,
      quoteConfirmed: true,
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
