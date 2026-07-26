import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Booking } from '../../shared/models';

export interface BookingSelectDialogData {
  bookerName: string;
  bookings: Booking[];
}

@Component({
  selector: 'app-booking-select-dialog',
  standalone: true,
  imports: [MatDialogModule, MatListModule, MatButtonModule, DatePipe, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'bookers.selectBooking' | translate }} — {{ data.bookerName }}</h2>
    <mat-dialog-content>
      <mat-nav-list>
        @for (booking of data.bookings; track booking.bookingId) {
          <a mat-list-item (click)="select(booking.bookingId)">
            {{ booking.bookingNumber }} ({{ booking.fromDate | date:'dd-MM-yyyy' }})
          </a>
        }
      </mat-nav-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
    </mat-dialog-actions>
  `,
})
export class BookingSelectDialogComponent {
  data = inject<BookingSelectDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<BookingSelectDialogComponent>);

  select(bookingId: string) {
    this.dialogRef.close(bookingId);
  }
}
