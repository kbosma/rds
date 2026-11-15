import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import nl from '../../public/i18n/nl.json';

/*
 * Globale test-setup voor i18n.
 *
 * Vrijwel elke component gebruikt de `translate`-pipe / TranslateService, die de
 * app levert via `provideTranslateService()` in app.config. In unit-tests wordt
 * app.config niet geladen, dus voegen we het hier één keer globaal toe (deze
 * top-level beforeEach geldt voor álle specs; de `configureTestingModule(...)`-
 * aanroepen in de specs mergen hiermee).
 *
 * We laden de ECHTE nl.json via een statische loader, zodat DOM-tekst-asserties
 * de werkelijke vertaalde tekst zien (niet de ruwe keys).
 */
class StaticNlLoader implements TranslateLoader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTranslation(_lang: string): Observable<any> {
    return of(nl);
  }
}

/* Net als de app (app.config.ts): getallen en bedragen in Nederlandse notatie. */
registerLocaleData(localeNl);

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'nl-NL' },
      provideTranslateService({ lang: 'nl' }),
      { provide: TranslateLoader, useClass: StaticNlLoader },
    ],
  });
});
