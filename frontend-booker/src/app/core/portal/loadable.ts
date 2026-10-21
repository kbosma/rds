import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export type LoadStatus = 'loading' | 'ready' | 'error';

/**
 * Eén stuk gegevens met een eigen laadtoestand. Elke kaart op het dashboard heeft er één, zodat een kaart die
 * faalt of nog laadt de rest niet meeneemt.
 */
export class Loadable<T> {
  readonly status = signal<LoadStatus>('loading');
  readonly data = signal<T | null>(null);

  constructor(
    private readonly source: () => Observable<T>,
    private readonly destroyRef: DestroyRef,
  ) {}

  /**
   * Haalt de gegevens op. `silent` ververst op de achtergrond: de kaart blijft zijn gegevens tonen en een fout
   * wordt genegeerd zolang er al gegevens zijn.
   */
  load(options: { silent?: boolean; onLoaded?: () => void } = {}): void {
    if (!options.silent) this.status.set('loading');
    this.source()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => {
          this.data.set(value);
          this.status.set('ready');
          options.onLoaded?.();
        },
        error: () => {
          if (!options.silent || this.data() === null) this.status.set('error');
        },
      });
  }
}
