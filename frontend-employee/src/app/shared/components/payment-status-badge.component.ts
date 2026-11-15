import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Gekleurde, vertaalde badge voor de status van een betaling (open, pending, paid, ...). Eén plek voor de
 * betekenis per status; de kleuren komen van de gedeelde `.badge` in styles.scss.
 */
@Component({
  selector: 'app-payment-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  template: `<span [class]="'badge status-badge badge-' + tone()" [attr.data-status]="status()">{{ 'payments.status_' + status() | translate }}</span>`,
})
export class PaymentStatusBadgeComponent {
  readonly status = input.required<string>();

  /** Betekenis van de status → variant van de gedeelde `.badge` (styles.scss). */
  readonly tone = computed(() => PAYMENT_STATUS_TONE[this.status()] ?? 'neutral');
}

const PAYMENT_STATUS_TONE: Record<string, string> = {
  paid: 'success',
  open: 'warning',
  pending: 'warning',
  authorized: 'info',
  failed: 'danger',
  charged_back: 'danger',
  canceled: 'neutral',
  expired: 'neutral',
};
