import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { BookerAuthService } from '../../core/auth/booker-auth.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    TranslateModule,
    LanguageSwitcherComponent,
  ],
  template: `
    <mat-toolbar class="app-toolbar">
      <span class="brand">{{ 'app.title' | translate }}</span>
      <span class="brand-sub">{{ 'app.subtitle' | translate }}</span>
      <span class="spacer"></span>
      <app-language-switcher />
      <button mat-icon-button (click)="auth.logout()" [attr.aria-label]="'nav.logout' | translate">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <nav class="nav-tabs">
      <a mat-button routerLink="/dashboard" routerLinkActive="active-tab">
        <mat-icon>home</mat-icon> {{ 'nav.overview' | translate }}
      </a>
      <a mat-button routerLink="/itinerary" routerLinkActive="active-tab">
        <mat-icon>map</mat-icon> {{ 'nav.itinerary' | translate }}
      </a>
      <a mat-button routerLink="/documents" routerLinkActive="active-tab">
        <mat-icon>description</mat-icon> {{ 'nav.documents' | translate }}
      </a>
      <a mat-button routerLink="/activities" routerLinkActive="active-tab">
        <mat-icon>local_activity</mat-icon> {{ 'nav.activities' | translate }}
      </a>
      <a mat-button routerLink="/payments" routerLinkActive="active-tab">
        <mat-icon>payments</mat-icon> {{ 'nav.payments' | translate }}
      </a>
    </nav>

    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .app-toolbar {
      background: #1976d2;
      color: white;
    }
    .brand {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
    }
    .brand-sub {
      font-size: 14px;
      margin-left: 12px;
      opacity: 0.85;
    }
    .spacer { flex: 1; }
    .nav-tabs {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: white;
    }
    .active-tab {
      background-color: #e3f2fd !important;
      color: #1976d2 !important;
    }
    .main-content {
      padding: 24px 16px;
      max-width: 700px;
      margin: 0 auto;
    }
  `],
})
export class LayoutComponent {
  auth = inject(BookerAuthService);
}
