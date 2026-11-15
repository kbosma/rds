import { Injectable, inject } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

/**
 * Vertaalde teksten voor elke `mat-paginator` ("Per pagina", "1 – 10 van 25"), in de taal van de gebruiker.
 * Wordt in app.config.ts geleverd in plaats van de Engelse standaard van Material.
 */
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  private readonly translate = inject(TranslateService);

  constructor() {
    super();
    this.translate.onLangChange.subscribe(() => this.updateLabels());
    this.translate.onTranslationChange.subscribe(() => this.updateLabels());
    this.updateLabels();
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    const of = this.translate.instant('paginator.of');
    if (length === 0 || pageSize === 0) {
      return `0 ${of} ${length}`;
    }
    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);
    return `${start + 1} – ${end} ${of} ${length}`;
  };

  private updateLabels(): void {
    this.itemsPerPageLabel = this.translate.instant('paginator.itemsPerPage');
    this.nextPageLabel = this.translate.instant('paginator.nextPage');
    this.previousPageLabel = this.translate.instant('paginator.previousPage');
    this.firstPageLabel = this.translate.instant('paginator.firstPage');
    this.lastPageLabel = this.translate.instant('paginator.lastPage');
    this.changes.next();
  }
}
