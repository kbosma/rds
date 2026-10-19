import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Gekleurde, vertaalde badge voor de status van een betaling (open, pending, paid, ...). Eén plek voor de
 * kleuren, zodat het uitklapscherm in een boeking en het betalingsdialoog er hetzelfde uitzien.
 */
@Component({
  selector: 'app-payment-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  template: `<span class="status-badge" [attr.data-status]="status()">{{ 'payments.status_' + status() | translate }}</span>`,
  styles: [`
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-badge[data-status="paid"] { background-color: #e8f5e9; color: #2e7d32; }
    .status-badge[data-status="open"], .status-badge[data-status="pending"] { background-color: #fff3e0; color: #e65100; }
    .status-badge[data-status="failed"] { background-color: #ffebee; color: #c62828; }
    .status-badge[data-status="canceled"] { background-color: #f3e5f5; color: #7b1fa2; }
    .status-badge[data-status="expired"] { background-color: #efebe9; color: #4e342e; }
    .status-badge[data-status="authorized"] { background-color: #e3f2fd; color: #1565c0; }
  `],
})
export class PaymentStatusBadgeComponent {
  readonly status = input.required<string>();
}
