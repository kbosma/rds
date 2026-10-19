import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../admin/theme.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher.component';

interface NavItem {
  labelKey: string;
  route: string;
  icon: string;
  authority?: string | string[];
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
    TranslatePipe,
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
      width: 240px;
      background: var(--ui-primary-deep);
      border-right: none;
      border-radius: 0;
      --mat-sidenav-container-shape: 0;
      --mat-list-list-item-label-text-color: #d3e6ea;
      --mat-list-list-item-leading-icon-color: #9cc3cb;
      --mat-list-list-item-hover-label-text-color: #ffffff;
      --mat-list-list-item-hover-leading-icon-color: #ffffff;
      --mat-list-list-item-hover-state-layer-color: #ffffff;
      --mat-list-list-item-hover-state-layer-opacity: 0.08;
      --mat-list-list-item-focus-state-layer-color: #ffffff;
    }
    .sidenav-header {
      padding: 20px 16px 14px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .brand-title {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 2px;
    }
    .brand-subtitle {
      display: block;
      font-size: 12px;
      color: #9cc3cb;
      margin-top: 2px;
    }
    .nav-list {
      padding: 8px;
    }
    .nav-list mat-divider {
      border-top-color: rgba(255, 255, 255, 0.1);
    }
    .section-header {
      padding: 16px 12px 4px;
      font-size: 11px;
      font-weight: 600;
      color: #7fa9b2;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .nav-item {
      margin: 2px 0;
      border-radius: 8px;
      --mat-list-list-item-one-line-container-height: 40px;
    }
    .active-item {
      background-color: var(--theme-primary) !important;
      --mat-list-list-item-label-text-color: #ffffff;
      --mat-list-list-item-leading-icon-color: #ffffff;
    }
    .active-item span[matListItemTitle] {
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
      padding: 20px 24px;
      flex: 1;
      overflow: auto;
      background: var(--ui-canvas);
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
    { labelKey: 'nav.bookings', route: '/bookings', icon: 'book_online', authority: 'BOOKING_READ' },
    { labelKey: 'nav.bookers', route: '/bookers', icon: 'person', authority: 'BOOKING_READ' },
    { labelKey: 'nav.prospects', route: '/prospects', icon: 'person_add', authority: 'BOOKING_READ' },
    { labelKey: 'nav.payments', route: '/payments', icon: 'payment', authority: 'PAYMENT_READ' },
    { labelKey: 'nav.organizations', route: '/admin/organizations', icon: 'corporate_fare', authority: 'ORGANIZATION_READ', sectionKey: 'nav.admin' },
    { labelKey: 'nav.accommodations', route: '/accommodations', icon: 'hotel', authority: ['ACCOMMODATION_CREATE', 'ACCOMMODATION_UPDATE', 'ACCOMMODATION_DELETE'], sectionKey: 'nav.bookingAdmin' },
    { labelKey: 'nav.suppliers', route: '/suppliers', icon: 'business', authority: ['SUPPLIER_CREATE', 'SUPPLIER_UPDATE', 'SUPPLIER_DELETE'] },
    { labelKey: 'nav.activities', route: '/activities', icon: 'local_activity', authority: ['ACTIVITY_CREATE', 'ACTIVITY_UPDATE', 'ACTIVITY_DELETE'] },
    { labelKey: 'nav.templates', route: '/templates', icon: 'insert_drive_file', authority: ['TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE'] },
    { labelKey: 'nav.emailTemplates', route: '/email-templates', icon: 'mail', authority: 'TEMPLATE_READ' },
    { labelKey: 'nav.persons', route: '/admin/persons', icon: 'people', authority: ['PERSON_CREATE', 'PERSON_DELETE'] },
    { labelKey: 'nav.accounts', route: '/admin/accounts', icon: 'manage_accounts', authority: ['ACCOUNT_CREATE', 'ACCOUNT_DELETE'] },
    { labelKey: 'nav.roles', route: '/admin/roles', icon: 'admin_panel_settings', authority: ['ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE'] },
    { labelKey: 'nav.authorities', route: '/admin/authorities', icon: 'security', authority: ['AUTHORITY_CREATE', 'AUTHORITY_UPDATE', 'AUTHORITY_DELETE'] },
    { labelKey: 'nav.theme', route: '/admin/theme', icon: 'palette', authority: ['ORGANIZATION_THEME_UPDATE'] },
    { labelKey: 'nav.myProfile', route: '/profile', icon: 'person', authority: 'PERSON_UPDATE', sectionKey: 'nav.myAdmin' },
    { labelKey: 'nav.changePassword', route: '/change-password', icon: 'lock', authority: 'ACCOUNT_UPDATE' },
    { labelKey: 'nav.totpSettings', route: '/totp-settings', icon: 'security' },
  ];

  visibleNavItems = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.allNavItems.filter((item) => {
      if (!item.authority) return true;
      if (Array.isArray(item.authority)) {
        return item.authority.some((a) => user.authorities.includes(a));
      }
      return user.authorities.includes(item.authority);
    });
  });

  userName = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return '';
    const name = user.personName || user.accountId;
    return user.organizationName ? `${name} (${user.organizationName})` : name;
  });
}
