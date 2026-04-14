import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../admin/theme.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';

interface NavItem {
  labelKey: string;
  route: string;
  icon: string;
  authority?: string;
  roles?: string[];
  sectionKey?: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    TranslateModule,
    LanguageSwitcherComponent,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <h2 class="brand-title">{{ 'app.title' | translate }}</h2>
          <span class="brand-subtitle">{{ 'app.subtitle' | translate }}</span>
        </div>
        <mat-nav-list class="nav-list">
          @for (item of visibleNavItems(); track item.route) {
            @if (item.sectionKey) {
              <mat-divider></mat-divider>
              <div class="section-header">{{ item.sectionKey | translate }}</div>
            }
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-item" class="nav-item">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.labelKey | translate }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <mat-toolbar class="app-toolbar">
          <span class="toolbar-title">{{ 'app.toolbarTitle' | translate }}</span>
          <span class="toolbar-spacer"></span>
          @if (userName()) {
            <span class="username">{{ userName() }}</span>
          }
          <app-language-switcher />
          <button mat-icon-button (click)="auth.logout()" [attr.aria-label]="'auth.logout' | translate">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <main class="main-content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .layout-container {
      height: 100vh;
    }
    .sidenav {
      width: 260px;
      background: #fafafa;
      border-right: 1px solid rgba(0, 0, 0, 0.08);
    }
    .sidenav-header {
      padding: 24px 16px 16px;
      text-align: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }
    .brand-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--theme-primary);
      letter-spacing: 2px;
    }
    .brand-subtitle {
      display: block;
      font-size: 12px;
      color: #888;
      margin-top: 2px;
    }
    .nav-list {
      padding-top: 8px;
    }
    .section-header {
      padding: 16px 16px 4px;
      font-size: 11px;
      font-weight: 600;
      color: #888;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .nav-item {
      border-left: 4px solid transparent;
      margin: 2px 0;
    }
    .active-item {
      background-color: color-mix(in srgb, var(--theme-primary) 10%, white) !important;
      border-left: 4px solid var(--theme-primary) !important;
    }
    .active-item mat-icon {
      color: var(--theme-primary);
    }
    .active-item span[matListItemTitle] {
      color: var(--theme-primary);
      font-weight: 500;
    }
    .content {
      display: flex;
      flex-direction: column;
    }
    .app-toolbar {
      background: var(--theme-primary);
      color: white;
    }
    .toolbar-title {
      font-size: 16px;
      font-weight: 500;
    }
    .toolbar-spacer {
      flex: 1;
    }
    .username {
      margin-right: 16px;
      font-size: 14px;
      opacity: 0.9;
    }
    .main-content {
      padding: 24px;
      flex: 1;
      overflow: auto;
      background: #f5f5f5;
    }
  `],
})
export class LayoutComponent {
  auth = inject(AuthService);
  private themeService = inject(ThemeService);

  constructor() {
    this.themeService.loadAndApplyTheme();
  }

  private allNavItems: NavItem[] = [
    { labelKey: 'nav.dashboard', route: '/dashboard', icon: 'dashboard' },
    { labelKey: 'nav.bookings', route: '/bookings', icon: 'book_online', authority: 'BOOKING_READ', roles: ['MANAGER', 'EMPLOYEE'] },
    { labelKey: 'nav.bookers', route: '/bookers', icon: 'person', authority: 'BOOKING_READ', roles: ['MANAGER', 'EMPLOYEE'] },
    { labelKey: 'nav.documents', route: '/documents', icon: 'description', authority: 'BOOKING_READ', roles: ['MANAGER', 'EMPLOYEE'] },
    { labelKey: 'nav.templates', route: '/templates', icon: 'insert_drive_file', authority: 'TEMPLATE_READ', roles: ['MANAGER', 'EMPLOYEE'] },
    { labelKey: 'nav.payments', route: '/payments', icon: 'payment', authority: 'PAYMENT_READ', roles: ['MANAGER', 'EMPLOYEE'] },
    { labelKey: 'nav.organizations', route: '/admin/organizations', icon: 'corporate_fare', authority: 'ORGANIZATION_READ', roles: ['ADMIN'], sectionKey: 'nav.admin' },
    { labelKey: 'nav.persons', route: '/admin/persons', icon: 'people', authority: 'PERSON_READ', roles: ['ADMIN'] },
    { labelKey: 'nav.accounts', route: '/admin/accounts', icon: 'manage_accounts', authority: 'ACCOUNT_READ', roles: ['ADMIN'] },
    { labelKey: 'nav.roles', route: '/admin/roles', icon: 'admin_panel_settings', authority: 'ROLE_READ', roles: ['ADMIN'] },
    { labelKey: 'nav.authorities', route: '/admin/authorities', icon: 'security', authority: 'AUTHORITY_READ', roles: ['ADMIN'] },
    { labelKey: 'nav.accommodations', route: '/accommodations', icon: 'hotel', authority: 'ACCOMMODATION_READ', roles: ['MANAGER'], sectionKey: 'nav.admin' },
    { labelKey: 'nav.suppliers', route: '/suppliers', icon: 'business', authority: 'SUPPLIER_READ', roles: ['MANAGER'] },
    { labelKey: 'nav.activities', route: '/activities', icon: 'local_activity', authority: 'ACTIVITY_READ', roles: ['MANAGER'] },
    { labelKey: 'nav.persons', route: '/admin/persons', icon: 'people', authority: 'PERSON_READ', roles: ['MANAGER'] },
    { labelKey: 'nav.accounts', route: '/admin/accounts', icon: 'manage_accounts', authority: 'ACCOUNT_READ', roles: ['MANAGER'] },
    { labelKey: 'nav.theme', route: '/admin/theme', icon: 'palette', authority: 'ORGANIZATION_THEME_READ', roles: ['MANAGER'] },
    { labelKey: 'nav.myProfile', route: '/profile', icon: 'person', authority: 'PERSON_UPDATE', roles: ['EMPLOYEE'], sectionKey: 'nav.admin' },
    { labelKey: 'nav.changePassword', route: '/change-password', icon: 'lock', authority: 'ACCOUNT_UPDATE', roles: ['EMPLOYEE'] },
    { labelKey: 'nav.totpSettings', route: '/totp-settings', icon: 'security', roles: ['EMPLOYEE', 'MANAGER'] },
  ];

  visibleNavItems = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.allNavItems.filter((item) => {
      if (item.authority && !user.authorities.includes(item.authority)) return false;
      if (item.roles && !item.roles.some((role) => user.roles.includes(role))) return false;
      return true;
    });
  });

  userName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    const name = user.personName || user.accountId;
    return user.organizationName ? `${name} (${user.organizationName})` : name;
  });
}
