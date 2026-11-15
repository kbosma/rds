import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Vertaalde badge voor de status van een boeking. De kleur zegt wat de status vraagt: een aanvraag wacht op actie
 * (warning), een offerte loopt (update), een boeking/voorschot staat (info), betaald/op reis is rond (success) en
 * weer thuis/afgerond is klaar (neutral). Kleuren komen van de gedeelde `.badge` in styles.scss.
 */
@Component({
  selector: 'app-booking-status-badge',
  standalone: true,
  imports: [TranslatePipe],
  template: `<span [class]="'badge status-badge badge-' + tone()" [attr.data-status]="status()">{{ 'bookings.status_' + status() | translate }}</span>`,
})
export class BookingStatusBadgeComponent {
  readonly status = input.required<string>();

  readonly tone = computed(() => BOOKING_STATUS_TONE[this.status()] ?? 'neutral');
}

const BOOKING_STATUS_TONE: Record<string, string> = {
  aanvraag: 'warning',
  offerte: 'update',
  boeking: 'info',
  voorschot: 'info',
  betaald: 'success',
  opreis: 'success',
  weerthuis: 'neutral',
  afgerond: 'neutral',
};
