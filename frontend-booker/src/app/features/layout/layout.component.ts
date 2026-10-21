import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { BookerAuthService } from '../../core/auth/booker-auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';

/** De schil rond het dashboard: een smalle balk met taal en uitloggen. Navigatie is er niet meer: alles staat op één pagina. */
@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, TranslatePipe, LanguageSwitcherComponent],
  template: `
    <mat-toolbar class="app-toolbar">
      <span class="brand">{{ 'app.title' | translate }}</span>
      <span class="brand-sub">{{ 'app.subtitle' | translate }}</span>
      <span class="spacer"></span>
      <app-language-switcher />
      <button mat-icon-button type="button" (click)="auth.logout()" [attr.aria-label]="'nav.logout' | translate">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .app-toolbar {
      background: var(--theme-primary);
      color: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .brand { font-size: 20px; font-weight: 700; letter-spacing: 2px; }
    .brand-sub { font-size: 14px; margin-left: 12px; opacity: 0.85; }
    .spacer { flex: 1; }
    .main-content {
      padding: 12px;
      padding-left: max(12px, env(safe-area-inset-left));
      padding-right: max(12px, env(safe-area-inset-right));
      padding-bottom: max(16px, env(safe-area-inset-bottom));
      max-width: 1320px;
      margin: 0 auto;
    }
    @media (min-width: 600px) { .main-content { padding: 20px; } }
    @media (min-width: 1000px) { .main-content { padding: 24px; } }
    @media (max-width: 480px) { .brand-sub { display: none; } }
  `],
})
export class LayoutComponent {
  auth = inject(BookerAuthService);
}
