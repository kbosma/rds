import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { TestBed } from '@angular/core/testing';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;

  beforeEach(() => {
    registerLocaleData(localeNl);
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'nl-NL' }] });
    pipe = TestBed.runInInjectionContext(() => new MoneyPipe());
  });

  it('toont euro in Nederlandse notatie met een vaste spatie', () => {
    expect(pipe.transform(8790.75)).toBe('€ 8.790,75');
    expect(pipe.transform(0)).toBe('€ 0,00');
  });

  it('toont een andere valuta met de code', () => {
    expect(pipe.transform(12.5, 'USD')).toBe('USD 12,50');
  });

  it('geeft een lege tekst zonder bedrag', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
