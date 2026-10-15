import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';

export interface MolliePaymentViewDialogData {
  payment: MolliePayment;
  /** Boekingsnummer waaraan de betaling hangt (indien bekend). */
  bookingNumber?: string;
}

/**
 * Alleen-lezen weergave van een betaling met de volledige statushistorie. Een betaling is
 * geschiedenis ("de waarheid"): hier is niets te wijzigen.
 */
@Component({
  selector: 'app-mollie-payment-view-dialog',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatProgressSpinnerModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'payments.viewTitle' | translate }}</h2>
    <mat-dialog-content>
      <dl class="details">
        <dt>{{ 'payments.mollieId' | translate }}</dt>
        <dd>{{ data.payment.molliePaymentExternalId || '—' }}</dd>
        <dt>{{ 'bookings.bookingNumber' | translate }}</dt>
        <dd>{{ data.bookingNumber || '—' }}</dd>
        <dt>{{ 'common.description' | translate }}</dt>
        <dd>{{ data.payment.description || '—' }}</dd>
        <dt>{{ 'common.amount' | translate }}</dt>
        <dd>{{ data.payment.currency || '€' }} {{ data.payment.amount | number:'1.2-2' }}</dd>
        <dt>{{ 'common.method' | translate }}</dt>
        <dd>{{ data.payment.method || '—' }}</dd>
        <dt>{{ 'common.date' | translate }}</dt>
        <dd>{{ data.payment.createdAt | date:'dd-MM-yyyy HH:mm' }}</dd>
      </dl>

      <h3>{{ 'payments.statusHistory' | translate }}</h3>
      @if (loading()) {
        <mat-spinner diameter="24"></mat-spinner>
      } @else if (entries().length === 0) {
        <p class="no-data">{{ 'payments.noStatusHistory' | translate }}</p>
      } @else {
        <table class="history">
          <thead>
            <tr>
              <th>{{ 'common.status' | translate }}</th>
              <th>{{ 'common.date' | translate }}</th>
              <th>{{ 'bookings.by' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.molliePaymentStatusEntryId) {
              <tr>
                <td>{{ entry.status }}</td>
                <td>{{ entry.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                <td>{{ entry.createdBy ?? ('common.system' | translate) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .details { display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin: 0 0 16px; }
    .details dt { font-weight: 600; color: #555; }
    .details dd { margin: 0; word-break: break-all; }
    h3 { margin: 8px 0; font-size: 15px; }
    .history { width: 100%; border-collapse: collapse; font-size: 13px; }
    .history th, .history td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #eee; }
    .no-data { color: #888; }
  `],
})
export class MolliePaymentViewDialogComponent implements OnInit {
  data: MolliePaymentViewDialogData = inject(MAT_DIALOG_DATA);
  private paymentService = inject(MolliePaymentService);
  private destroyRef = inject(DestroyRef);

  entries = signal<MolliePaymentStatusEntry[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.paymentService.getStatusEntries(this.data.payment.molliePaymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          this.entries.set(entries);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
