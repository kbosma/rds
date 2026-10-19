import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { PaymentStatusBadgeComponent } from '../../shared/components/payment-status-badge.component';
import { MolliePaymentCorrectionDialogComponent } from './mollie-payment-correction-dialog.component';
import { MolliePaymentRelinkDialogComponent } from './mollie-payment-relink-dialog.component';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment, MolliePaymentStatusEntry, PaymentRelink } from '../../shared/models';

export interface MolliePaymentViewDialogData {
  payment: MolliePayment;
  /** Boekingsnummer waaraan de betaling hangt (indien bekend). */
  bookingNumber?: string;
  /** Mag de gebruiker een correctie registreren (authority PAYMENT_CORRECT en niet alleen-lezen)? */
  canCorrect?: boolean;
  /** De boeking waaraan de betaling nu hangt (nodig om te kunnen herkoppelen). */
  currentBookingId?: string;
  /** Mag de gebruiker de betaling aan een andere boeking koppelen (authority PAYMENT_RELINK en niet alleen-lezen)? */
  canRelink?: boolean;
}

/**
 * Alleen-lezen weergave van een betaling met de volledige statushistorie. Een betaling is
 * geschiedenis ("de waarheid"): hier is niets te wijzigen.
 */
@Component({
  selector: 'app-mollie-payment-view-dialog',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PaymentStatusBadgeComponent, TranslatePipe],
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
              <th>{{ 'payments.reason' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of entries(); track entry.molliePaymentStatusEntryId) {
              <tr>
                <td>
                  <app-payment-status-badge [status]="entry.status" />
                  @if (entry.correction) { <span class="correction-tag">{{ 'payments.correction' | translate }}</span> }
                </td>
                <td>{{ entry.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                <td>{{ entry.createdByName ?? (entry.createdBy ? ('common.unknown' | translate) : ('common.system' | translate)) }}</td>
                <td class="reason">{{ entry.reason ?? '' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }

      @if (relinks().length > 0) {
        <h3>{{ 'payments.relinkHistory' | translate }}</h3>
        <table class="history relinks">
          <thead>
            <tr>
              <th>{{ 'payments.relinkFrom' | translate }}</th>
              <th>{{ 'payments.relinkTo' | translate }}</th>
              <th>{{ 'common.date' | translate }}</th>
              <th>{{ 'bookings.by' | translate }}</th>
              <th>{{ 'payments.reason' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (r of relinks(); track r.relinkId) {
              <tr>
                <td>{{ r.fromBookingNumber }}</td>
                <td>{{ r.toBookingNumber }}</td>
                <td>{{ r.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                <td>{{ r.createdByName ?? ('common.unknown' | translate) }}</td>
                <td class="reason">{{ r.reason }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.canRelink && data.currentBookingId) {
        <button mat-stroked-button color="primary" class="relink-btn" (click)="openRelink()" [disabled]="loading()">
          <mat-icon>swap_horiz</mat-icon> {{ 'payments.relinkButton' | translate }}
        </button>
      }
      @if (data.canCorrect) {
        <button mat-stroked-button color="primary" class="correct-btn" (click)="openCorrection()" [disabled]="loading()">
          <mat-icon>edit_note</mat-icon> {{ 'payments.registerCorrection' | translate }}
        </button>
      }
      <button mat-button [mat-dialog-close]="changed()">{{ 'common.close' | translate }}</button>
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
    .correction-tag { margin-left: 6px; font-size: 11px; color: #8d6e00; background: #fff8e1; border-radius: 8px; padding: 1px 6px; }
    .reason { color: #555; font-style: italic; }
  `],
})
export class MolliePaymentViewDialogComponent implements OnInit {
  data: MolliePaymentViewDialogData = inject(MAT_DIALOG_DATA);
  private paymentService = inject(MolliePaymentService);
  private destroyRef = inject(DestroyRef);

  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<MolliePaymentViewDialogComponent>);

  entries = signal<MolliePaymentStatusEntry[]>([]);
  relinks = signal<PaymentRelink[]>([]);
  loading = signal(true);
  /** True zodra er een correctie is geregistreerd; de aanroeper ververst dan zijn lijst (het dialoog sluit met dit antwoord). */
  changed = signal(false);

  ngOnInit() {
    this.loadEntries();
    this.loadRelinks();
  }

  openCorrection() {
    const latest = this.entries().at(-1);
    this.dialog.open(MolliePaymentCorrectionDialogComponent, {
      data: { payment: this.data.payment, currentStatus: latest?.status?.toLowerCase() ?? null },
      width: '480px',
      maxWidth: '95vw',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved) => {
      if (!saved) return;
      this.changed.set(true);
      this.loadEntries();
    });
  }

  /** Na een herkoppeling hangt de betaling niet meer aan deze boeking: sluit en laat de aanroeper herladen. */
  openRelink() {
    this.dialog.open(MolliePaymentRelinkDialogComponent, {
      data: { payment: this.data.payment, currentBookingId: this.data.currentBookingId },
      width: '480px',
      maxWidth: '95vw',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved) => {
      if (saved) this.dialogRef.close(true);
    });
  }

  private loadRelinks() {
    this.paymentService.getRelinks(this.data.payment.molliePaymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (relinks) => this.relinks.set(relinks), error: () => this.relinks.set([]) });
  }

  private loadEntries() {
    this.loading.set(true);
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
