import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  private readonly STORAGE_KEY = 'app-language';
  private readonly DEFAULT_LANG = 'nl';
  private readonly SUPPORTED_LANGS = ['nl', 'en'];

  init(): void {
    this.translate.addLangs(this.SUPPORTED_LANGS);
    this.translate.setDefaultLang(this.DEFAULT_LANG);

    const stored = localStorage.getItem(this.STORAGE_KEY);
    const lang = stored && this.SUPPORTED_LANGS.includes(stored) ? stored : this.DEFAULT_LANG;
    this.translate.use(lang);
  }

  get currentLang(): string {
    return this.translate.currentLang || this.DEFAULT_LANG;
  }

  switchLanguage(lang: string): void {
    if (this.SUPPORTED_LANGS.includes(lang)) {
      this.translate.use(lang);
      localStorage.setItem(this.STORAGE_KEY, lang);
    }
  }

  toggleLanguage(): void {
    const next = this.currentLang === 'nl' ? 'en' : 'nl';
    this.switchLanguage(next);
  }
}
