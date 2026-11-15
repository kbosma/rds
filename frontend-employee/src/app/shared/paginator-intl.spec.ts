import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { rangeLabel, translatePaginator } from './paginator-intl';

describe('translatePaginator', () => {
  it('zet de Nederlandse teksten op de gedeelde MatPaginatorIntl', async () => {
    await firstValueFrom(TestBed.inject(TranslateService).use('nl'));
    translatePaginator(TestBed.inject(Injector));

    const intl = TestBed.inject(MatPaginatorIntl);
    expect(intl.itemsPerPageLabel).toBe('Per pagina:');
    expect(intl.nextPageLabel).toBe('Volgende pagina');
    expect(intl.getRangeLabel(1, 10, 25)).toBe('11 – 20 van 25');
  });

  it('geeft bij een lege lijst 0 van 0', () => {
    expect(rangeLabel(0, 10, 0, 'van')).toBe('0 van 0');
  });
});
