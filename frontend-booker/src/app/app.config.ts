import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeNl from '@angular/common/locales/nl';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from './core/i18n/translate-loader.factory';

import { routes } from './app.routes';
import { bookerAuthInterceptor } from './core/auth/booker-auth.interceptor';

registerLocaleData(localeNl);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([bookerAuthInterceptor])),
    provideAnimationsAsync(),
    { provide: LOCALE_ID, useValue: 'nl' },
    provideTranslateService({
      defaultLanguage: 'nl',
    }),
    provideTranslateHttpLoader({
      prefix: './i18n/',
      suffix: '.json',
    }),
  ],
};
