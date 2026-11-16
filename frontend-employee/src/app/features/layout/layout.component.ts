import { Component, computed, inject, signal } from '@angular/core';
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
    <mat-sidenav-container class="layout-container" autosize>
      <mat-sidenav mode="side" opened class="sidenav" [class.collapsed]="collapsed()">
        <div class="sidenav-header">
          <h2 class="brand-title">{{ 'app.title' | translate }}</h2>
          @if (!collapsed()) {
            <span class="brand-subtitle">{{ 'app.subtitle' | translate }}</span>
          }
        </div>
        <mat-nav-list class="nav-list">
          @for (item of visibleNavItems(); track item.route) {
            @if (item.sectionKey) {
              <mat-divider></mat-divider>
              @if (!collapsed()) {
                <div class="section-header">{{ item.sectionKey | translate }}</div>
              }
            }
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-item" class="nav-item"
               [attr.title]="collapsed() ? (item.labelKey | translate) : null"
               [attr.aria-label]="item.labelKey | translate">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              @if (!collapsed()) {
                <span matListItemTitle>{{ item.labelKey | translate }}</span>
              }
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <mat-toolbar class="app-toolbar">
          <button mat-icon-button class="menu-toggle" (click)="toggleCollapsed()"
                  [attr.aria-label]="(collapsed() ? 'nav.expandMenu' : 'nav.collapseMenu') | translate"
                  [attr.aria-expanded]="!collapsed()"
                  [attr.title]="(collapsed() ? 'nav.expandMenu' : 'nav.collapseMenu') | translate">
            <mat-icon>{{ collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
          </button>
          <span class="toolbar-spacer"></span>
          @if (userName()) {
            <span class="username">{{ userName() }}</span>
          }
          <app-language-switcher />
          <button mat-icon-button (click)="auth.logout()" [attr.aria-label]="'auth.logout' | translate"
                  [attr.title]="'auth.logout' | translate">
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
      width: 212px;
      background: var(--ui-primary-deep);
      border-right: none;
      border-radius: 0;
      transition: width 160ms ease;
      overflow-x: hidden;
      --mat-sidenav-container-shape: 0;
      /* Tinten van de organisatiekleur op de donkere zijbalk (geen vaste teal). */
      --sidenav-text: color-mix(in srgb, var(--theme-primary) 12%, #ffffff);
      --sidenav-icon: color-mix(in srgb, var(--theme-primary) 30%, #c9d6da);
      --sidenav-muted: color-mix(in srgb, var(--theme-primary) 30%, #9fb3b9);
      --mat-list-list-item-label-text-color: var(--sidenav-text);
      --mat-list-list-item-label-text-size: 13px;
      --mat-list-list-item-leading-icon-color: var(--sidenav-icon);
      --mat-list-list-item-hover-label-text-color: #ffffff;
      --mat-list-list-item-hover-leading-icon-color: #ffffff;
      --mat-list-list-item-hover-state-layer-color: #ffffff;
      --mat-list-list-item-hover-state-layer-opacity: 0.08;
      --mat-list-list-item-focus-state-layer-color: #ffffff;
    }
    .sidenav.collapsed {
      width: 56px;
    }
    .sidenav-header {
      height: 48px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .brand-title {
      margin: 0;
      font-size: 18px;
      line-height: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 2px;
    }
    .collapsed .brand-title {
      font-size: 13px;
      letter-spacing: 1px;
    }
    .brand-subtitle {
      display: block;
      font-size: 10.5px;
      line-height: 14px;
      color: var(--sidenav-icon);
      white-space: nowrap;
    }
    .nav-list {
      padding: 6px;
    }
    .nav-list mat-divider {
      margin: 6px 0;
      border-top-color: rgba(255, 255, 255, 0.1);
    }
    .section-header {
      padding: 4px 10px;
      font-size: 12px;
      line-height: 16px;
      font-weight: 600;
      color: var(--sidenav-muted);
      white-space: nowrap;
    }
    .nav-item {
      margin: 1px 0;
      border-radius: 8px;
      --mat-list-list-item-one-line-container-height: 34px;
      --mat-list-list-item-leading-icon-start-space: 10px;
      --mat-list-list-item-leading-icon-end-space: 12px;
    }
    .nav-item .mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .collapsed .nav-item {
      --mat-list-list-item-leading-icon-start-space: 12px;
      --mat-list-list-item-leading-icon-end-space: 0;
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
      --mat-toolbar-standard-height: 48px;
      padding: 0 8px 0 4px;
      gap: 4px;
      background: var(--theme-primary);
      color: white;
      --mat-icon-button-icon-color: #ffffff;
    }
    .toolbar-spacer {
      flex: 1;
    }
    .username {
      margin-right: 8px;
      font-size: 13px;
      opacity: 0.9;
    }
    .main-content {
      padding: 16px 20px;
      flex: 1;
      overflow: auto;
      background: var(--ui-canvas);
    }
  `],
})
export class LayoutComponent {
  auth = inject(AuthService);
  private themeService = inject(ThemeService);

  /** Ingeklapte zijbalk (alleen iconen). De keuze wordt per browser onthouden; zonder opslag start hij uitgeklapt. */
  collapsed = signal(LayoutComponent.readCollapsed());

  constructor() {
    // Alleen opvragen met de authority die de backend eist; anders geeft elke paginalading een 403 (bv. voor ADMIN
    // en EMPLOYEE, die ORGANIZATION_THEME_READ niet hebben). Zonder thema gelden de standaardkleuren uit de CSS.
    if (this.auth.hasAuthority('ORGANIZATION_THEME_READ')) {
      this.themeService.loadAndApplyTheme();
    }
  }

  toggleCollapsed() {
    this.collapsed.update((c) => !c);
    try {
      localStorage.setItem(LayoutComponent.COLLAPSED_KEY, String(this.collapsed()));
    } catch {
      // Opslag niet beschikbaar (privévenster, geblokkeerd): de keuze geldt dan alleen voor deze sessie.
    }
  }

  private static readonly COLLAPSED_KEY = 'rds_sidenav_collapsed';

  private static readCollapsed(): boolean {
    try {
      return localStorage.getItem(LayoutComponent.COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
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
    { labelKey: 'nav.organizationSettings', route: '/organization-settings', icon: 'tune', authority: 'ORGANIZATION_SETTINGS_READ' },
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
