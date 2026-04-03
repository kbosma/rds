import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-authority-list',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <h1>{{ 'authorities.title' | translate }}</h1>
    <p class="placeholder">{{ 'common.placeholderPage' | translate }}</p>
  `,
  styles: [`.placeholder { color: #888; font-style: italic; }`],
})
export class AuthorityListComponent {}
