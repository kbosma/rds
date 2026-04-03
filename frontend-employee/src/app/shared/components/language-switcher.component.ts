import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [UpperCasePipe, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <button mat-icon-button (click)="lang.toggleLanguage()" [attr.aria-label]="'common.switchLanguage' | translate">
      <mat-icon>language</mat-icon>
    </button>
    <span class="lang-label">{{ lang.currentLang | uppercase }}</span>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
    }
    .lang-label {
      font-size: 13px;
      font-weight: 500;
      margin-right: 8px;
      cursor: default;
    }
  `],
})
export class LanguageSwitcherComponent {
  lang = inject(LanguageService);
}
