import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';

/**
 * De betaalbalk bovenaan op de telefoon: wat er openstaat en een knop om te betalen. Is er één betaling die
 * betaald kan worden, dan start de knop die meteen; anders brengt hij je naar de betalingenkaart. Op bredere
 * schermen staat de betalingenkaart naast de kop en is deze balk niet nodig.
 */
@Component({
  selector: 'app-payment-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    @if (store.openPayable() > 0) {
      <div class="alert" role="status">
        <span class="text">
          <mat-icon aria-hidden="true">payments</mat-icon>
          {{ 'dashboard.alert.outstanding' | translate: { amount: (store.openPayable() | currency: store.paymentSummary().currency : 'symbol' : '1.2-2' : locale()) } }}
        </span>
        <button mat-flat-button type="button" (click)="act()">{{ 'dashboard.alert.pay' | translate }}</button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .alert {
      display: flex; justify-content: space-between; align-items: center; gap: 10px;
      background: #fff4e0; color: #6b3a00; border: 1px solid #f2d19b; border-radius: 12px; padding: 10px 12px;
    }
    .text { display: flex; align-items: center; gap: 6px; font-weight: 500; }
    button { background: var(--theme-primary); color: #fff; min-height: 40px; flex: none; }
  `],
})
export class PaymentAlertComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;

  protected act(): void {
    const payable = this.store.payable();
    if (payable.length === 1) {
      this.store.pay(payable[0]);
      return;
    }
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('payments')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
}
