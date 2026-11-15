import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { BookingStatusChange } from '../../shared/models';
import { BookingService } from './booking.service';

export interface BookingStatusHistoryDialogData {
  bookingId: string;
  bookingNumber: string;
}

/** De statusgeschiedenis van een boeking: wie (of het systeem), wanneer, van welke naar welke status en waarom. */
@Component({
  selector: 'app-booking-status-history-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'bookingStatus.historyTitle' | translate }} — {{ data.bookingNumber }}</h2>
    <mat-dialog-content>
      @if (changes().length === 0) {
        <p class="empty">{{ 'bookingStatus.historyEmpty' | translate }}</p>
      } @else {
        <ul class="changes zebra-rows">
          @for (c of changes(); track c.bookingStatusChangeId) {
            <li class="change" [class.automatic]="c.automatic">
              <mat-icon class="who-icon">{{ c.automatic ? 'smart_toy' : 'person' }}</mat-icon>
              <div class="what">
                <div class="transition">
                  {{ 'bookings.status_' + c.fromStatus | translate }} → <strong>{{ 'bookings.status_' + c.toStatus | translate }}</strong>
                </div>
                <div class="reason">{{ c.reason }}</div>
                <div class="sub">
                  {{ c.createdAt | date:'dd-MM-yyyy HH:mm' }} ·
                  {{ c.automatic ? ('bookingStatus.bySystem' | translate) : (c.createdByName ?? '') }}
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .changes { list-style: none; margin: 0; padding: 0; min-width: 420px; }
    .change { display: flex; gap: 12px; padding: 8px; border-radius: 6px; }
    .who-icon { color: var(--theme-primary); flex: none; }
    .reason { font-size: 13px; }
    .sub { font-size: 12px; color: var(--ui-text-secondary, #666); }
    .empty { color: var(--ui-text-secondary, #666); }
  `],
})
export class BookingStatusHistoryDialogComponent implements OnInit {
  data: BookingStatusHistoryDialogData = inject(MAT_DIALOG_DATA);
  private bookingService = inject(BookingService);
  private destroyRef = inject(DestroyRef);

  changes = signal<BookingStatusChange[]>([]);

  ngOnInit() {
    this.bookingService.statusChanges(this.data.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (list) => this.changes.set(list), error: () => this.changes.set([]) });
  }
}
