import { TestBed } from '@angular/core/testing';
import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  let pipe: MoneyPipe;

  beforeEach(() => {
    pipe = TestBed.runInInjectionContext(() => new MoneyPipe());
  });

  it('toont euro in Nederlandse notatie met een vaste spatie', () => {
    expect(pipe.transform(8790.75)).toBe('€\u00a08.790,75');
    expect(pipe.transform(0)).toBe('€\u00a00,00');
  });

  it('toont een andere valuta met de code', () => {
    expect(pipe.transform(12.5, 'USD')).toBe('USD\u00a012,50');
  });

  it('geeft een lege tekst zonder bedrag', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
