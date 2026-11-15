import { ApplicationConfig, Injector, LOCALE_ID, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from './core/i18n/translate-loader.factory';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

/* Getallen en bedragen in Nederlandse notatie (8.790,75), ook als de interface in het Engels staat. */
registerLocaleData(localeNl);

const DD_MM_YYYY_FORMATS = {
  parse: { dateInput: 'dd-MM-yyyy' },
  display: {
    dateInput: { day: '2-digit', month: '2-digit', year: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearLabel: { year: 'numeric', month: 'short' } as Intl.DateTimeFormatOptions,
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' } as Intl.DateTimeFormatOptions,
    monthYearA11yLabel: { year: 'numeric', month: 'long' } as Intl.DateTimeFormatOptions,
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    { provide: LOCALE_ID, useValue: 'nl-NL' },
    { provide: MAT_DATE_LOCALE, useValue: 'nl-NL' },
    // Paginator-teksten vertalen; dynamisch geladen zodat de paginator niet in de startbundel komt.
    provideAppInitializer(() => {
      const injector = inject(Injector);
      void import('./shared/paginator-intl').then(m => m.translatePaginator(injector));
    }),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMATS },
    provideTranslateService({
      lang: 'nl',
    }),
    provideTranslateHttpLoader({
      prefix: './i18n/',
      suffix: '.json',
    }),
  ],
};
