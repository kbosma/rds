import { Injector } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

/**
 * Vertaalt de teksten van elke `mat-paginator` ("Per pagina:", "1 – 10 van 25") in de taal van de gebruiker.
 *
 * Werkt op de ene (root-)instantie van `MatPaginatorIntl` in plaats van een eigen provider in app.config: zo'n
 * provider zou de paginator (met select, tooltip en overlay, ~125 kB) in de startbundel trekken (budget 700 kB).
 * app.config laadt dit bestand daarom met een dynamische import bij het opstarten.
 */
export function translatePaginator(injector: Injector): void {
  const intl = injector.get(MatPaginatorIntl);
  const translate = injector.get(TranslateService);

  const update = () => {
    intl.itemsPerPageLabel = translate.instant('paginator.itemsPerPage');
    intl.nextPageLabel = translate.instant('paginator.nextPage');
    intl.previousPageLabel = translate.instant('paginator.previousPage');
    intl.firstPageLabel = translate.instant('paginator.firstPage');
    intl.lastPageLabel = translate.instant('paginator.lastPage');
    intl.changes.next();
  };

  intl.getRangeLabel = (page: number, pageSize: number, length: number): string =>
    rangeLabel(page, pageSize, length, translate.instant('paginator.of'));

  translate.onLangChange.subscribe(update);
  translate.onTranslationChange.subscribe(update);
  update();
}

/** "1 – 10 van 25"; bij een lege lijst "0 van 0". */
export function rangeLabel(page: number, pageSize: number, length: number, of: string): string {
  if (length === 0 || pageSize === 0) {
    return `0 ${of} ${length}`;
  }
  const start = page * pageSize;
  const end = Math.min(start + pageSize, length);
  return `${start + 1} – ${end} ${of} ${length}`;
}
