import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Paginakop van elk dashboard: welkom met de naam als paginatitel, daaronder de organisatie en de rol(len).
 * Gebruikt de gedeelde `.page-header`/`.page-subtitle` (styles.scss) in plaats van een eigen kaart.
 */
@Component({
  selector: 'app-welcome-header',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-header welcome-header">
      <div>
        <h1>{{ 'dashboard.welcome' | translate }}, {{ auth.currentUser()?.personName }}</h1>
        <p class="page-subtitle">
          {{ auth.currentUser()?.organizationName }}
          @for (role of auth.currentUser()?.roles ?? []; track role) {
            <span class="badge badge-neutral">{{ role }}</span>
          }
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-subtitle { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  `],
})
export class WelcomeHeaderComponent {
  readonly auth = inject(AuthService);
}
