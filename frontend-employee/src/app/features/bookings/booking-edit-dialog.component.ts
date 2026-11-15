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
import { DatePipe } from '@angular/common';
import { Booking, BookingService } from './booking.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { BookingStatusBadgeComponent } from '../../shared/components/booking-status-badge.component';

export interface BookingEditDialogData {
  booking: Booking;
}

@Component({
  selector: 'app-booking-edit-dialog',
  standalone: true,
  imports: [
    MoneyPipe,
    BookingStatusBadgeComponent,
    ReactiveFormsModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
    DatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'bookings.editBookingTitle' | translate }}</h2>
    <mat-dialog-content>
      <dl class="kv-list">
        <dt>{{ 'bookings.bookingNumber' | translate }}</dt>
        <dd>{{ data.booking.bookingNumber }}</dd>
        <dt>{{ 'bookings.fromDateComputed' | translate }}</dt>
        <dd>{{ data.booking.fromDate | date:'dd-MM-yyyy' }}</dd>
        <dt>{{ 'bookings.untilDateComputed' | translate }}</dt>
        <dd>{{ data.booking.untilDate | date:'dd-MM-yyyy' }}</dd>
        <dt>{{ 'bookings.totalComputed' | translate }}</dt>
        <dd class="total">{{ data.booking.totalSum | money }}</dd>
        <dt>{{ 'common.status' | translate }}</dt>
        <dd class="current-status">
          <app-booking-status-badge [status]="data.booking.bookingStatus" />
          @if (quoteConfirmedControl.value && canConfirm) {
            <span class="arrow">→</span>
            <app-booking-status-badge class="next-status" status="boeking" />
          }
        </dd>
      </dl>
      <p class="hint status-hint">{{ 'bookingStatus.setBySystem' | translate }}</p>

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
        {{ 'common.cancel' | translate }}
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
    .kv-list .total { font-weight: 600; }
    .current-status { display: flex; align-items: center; gap: 6px; }
    .arrow { color: var(--ui-text-muted); }
    .status-hint { margin: 8px 0 16px; }
    .quote { display: flex; flex-direction: column; gap: 4px; }
    .hint { font-size: 12px; color: var(--ui-text-muted); }
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
