import { InjectionToken } from '@angular/core';

/** "Nu" als functie, zodat tests de klok kunnen vastzetten. */
export const PORTAL_NOW = new InjectionToken<() => Date>('PORTAL_NOW', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Stuurt de browser naar een andere pagina (de betaalpagina van Mollie); in tests te vervangen. */
export const PORTAL_REDIRECT = new InjectionToken<(url: string) => void>('PORTAL_REDIRECT', {
  providedIn: 'root',
  factory: () => (url: string) => window.location.assign(url),
});

/** Bewaart een gedownload bestand; in tests te vervangen. */
export const PORTAL_SAVE_FILE = new InjectionToken<(blob: Blob, filename: string) => void>('PORTAL_SAVE_FILE', {
  providedIn: 'root',
  factory: () => (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url));
  },
});
