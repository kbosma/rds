import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';
import { PortalPayment } from '../../shared/models/portal.models';
import { SectionCardComponent } from '../../shared/components/section-card.component';

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** De betalingen: voortgang als donut, totalen, een regel per betaling en de knop om te betalen. */
@Component({
  selector: 'app-payments-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, SectionCardComponent],
  template: `
    <app-section-card
      titleKey="dashboard.payments.title"
      icon="payments"
      [status]="store.payments.status()"
      [empty]="store.paymentList().length === 0"
      emptyKey="dashboard.payments.empty"
      (retry)="store.reload('payments')">
      @if (store.paymentSummary(); as sum) {
        <div class="summary">
          <svg width="88" height="88" viewBox="0 0 88 88" role="img"
               [attr.aria-label]="'dashboard.payments.progressAria' | translate: { percent: sum.paidPercent }">
            <circle cx="44" cy="44" [attr.r]="radius" fill="none" stroke="var(--ui-line)" stroke-width="9" />
            <circle cx="44" cy="44" [attr.r]="radius" fill="none" stroke="var(--theme-primary)" stroke-width="9"
                    stroke-linecap="round" transform="rotate(-90 44 44)"
                    [attr.stroke-dasharray]="dash(sum.paidPercent) + ' ' + circumference" />
            <text x="44" y="49" text-anchor="middle" font-size="17" font-weight="600" fill="currentColor">{{ sum.paidPercent }}%</text>
          </svg>
          <dl class="totals">
            <dt>{{ 'dashboard.payments.total' | translate }}</dt>
            <dd>{{ sum.total | currency: sum.currency : 'symbol' : '1.2-2' : locale() }}</dd>
            <dt>{{ 'dashboard.payments.paid' | translate }}</dt>
            <dd>{{ sum.paid | currency: sum.currency : 'symbol' : '1.2-2' : locale() }}</dd>
            <dt>{{ 'dashboard.payments.outstanding' | translate }}</dt>
            <dd [class.due]="sum.open > 0">{{ sum.open | currency: sum.currency : 'symbol' : '1.2-2' : locale() }}</dd>
          </dl>
        </div>

        <ul class="rows">
          @for (payment of store.paymentList(); track payment.molliePaymentId) {
            <li class="row">
              <div class="g">
                <div class="desc">{{ payment.description }}</div>
                <div class="sub">
                  <span [class]="'st ' + tone(payment)">
                    <mat-icon aria-hidden="true">{{ statusIcon(payment) }}</mat-icon>
                    {{ 'dashboard.payments.status.' + payment.currentStatus | translate }}
                  </span>
                  @if (payment.currentStatus === 'paid' && store.statusDate(payment.molliePaymentId); as paidOn) {
                    <span>{{ 'dashboard.payments.paidOn' | translate: { date: (paidOn | date: 'd MMM y' : undefined : locale()) } }}</span>
                  }
                </div>
              </div>
              <div class="amount">{{ payment.amount | currency: payment.currency : 'symbol' : '1.2-2' : locale() }}</div>
            </li>
          }
        </ul>

        @for (payment of store.payable(); track payment.molliePaymentId) {
          <button mat-flat-button type="button" class="pay" (click)="store.pay(payment)" [attr.aria-busy]="store.payingId() === payment.molliePaymentId">
            @if (store.payingId() === payment.molliePaymentId) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <ng-container>
                <mat-icon aria-hidden="true">lock</mat-icon>
                {{ 'dashboard.payments.pay' | translate: { amount: (payment.amount | currency: payment.currency : 'symbol' : '1.2-2' : locale()) } }}
              </ng-container>
            }
          </button>
        }
        @if (store.payError()) {
          <p class="err" role="alert">{{ 'dashboard.payments.payError' | translate }}</p>
        }
      }
    </app-section-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .summary { display: flex; gap: 16px; align-items: center; margin-bottom: 8px; }
    svg { flex: none; color: var(--ui-text); }
    .totals { display: grid; grid-template-columns: auto auto; gap: 3px 16px; margin: 0; font-size: .9em; }
    .totals dt { color: var(--ui-text-muted); }
    .totals dd { margin: 0; text-align: right; font-weight: 600; }
    .totals dd.due { color: #b25e00; }
    .rows { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 9px 0; border-top: 1px solid var(--ui-line); }
    .g { min-width: 0; }
    .desc { font-weight: 500; }
    .sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--ui-text-muted); font-size: .84em; margin-top: 2px; }
    .amount { font-weight: 600; white-space: nowrap; }
    .st { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px 1px 5px; border-radius: 99px; font-weight: 500; font-size: .95em; }
    .st mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .st.ok { background: #e6f4ea; color: #1b5e20; }
    .st.wait { background: #fff4e0; color: #8a4b00; }
    .st.bad { background: #fdeaea; color: #a12622; }
    .pay { width: 100%; margin-top: 10px; background: var(--theme-primary); color: #fff; min-height: 44px; }
    .pay mat-icon { margin-right: 6px; }
    .err { margin: 8px 0 0; color: #a12622; font-size: .88em; }
  `],
})
export class PaymentsCardComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;
  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE.toFixed(1);

  protected dash(percent: number): string {
    return ((Math.min(Math.max(percent, 0), 100) / 100) * CIRCUMFERENCE).toFixed(1);
  }

  /** De status krijgt naast een kleur ook een pictogram en een tekst: kleur alleen is niet genoeg. */
  protected tone(payment: PortalPayment): 'ok' | 'wait' | 'bad' {
    switch (payment.currentStatus) {
      case 'paid': return 'ok';
      case 'failed':
      case 'canceled':
      case 'expired': return 'bad';
      default: return 'wait';
    }
  }

  protected statusIcon(payment: PortalPayment): string {
    const tone = this.tone(payment);
    return tone === 'ok' ? 'check_circle' : tone === 'bad' ? 'error' : 'schedule';
  }
}
