import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { formatNumber } from '@angular/common';

/**
 * Bedrag in de notatie van de app-locale (nl-NL): `€ 1.685,00`, altijd twee decimalen en een vaste spatie na het
 * valutateken, zodat teken en bedrag nooit over twee regels breken. Eén plek, zodat lijsten, kaarten en dialogen
 * bedragen hetzelfde tonen. Leeg (null/undefined) geeft een lege tekst.
 *
 *   {{ row.amount | money }}               → € 1.685,00
 *   {{ payment.amount | money: 'USD' }}    → USD 1.685,00
 */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: number | null | undefined, currency: string | null = 'EUR'): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    const symbol = !currency || currency === 'EUR' ? '€' : currency;
    return `${symbol}\u00a0${formatNumber(value, this.locale, '1.2-2')}`;
  }
}
