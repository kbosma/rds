import { Component, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  authority?: string;
  section?: string;
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
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav mode="side" opened class="sidenav">
        <div class="sidenav-header">
          <h2 class="brand-title">RDS</h2>
          <span class="brand-subtitle">Reis Dossier Systeem</span>
        </div>
        <mat-nav-list class="nav-list">
          @for (item of visibleNavItems(); track item.route) {
            @if (item.section) {
              <mat-divider></mat-divider>
              <div class="section-header">{{ item.section }}</div>
            }
            <a mat-list-item [routerLink]="item.route" routerLinkActive="active-item" class="nav-item">
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <mat-toolbar class="app-toolbar">
          <span class="toolbar-title">RDS - Reis Dossier Systeem</span>
          <span class="toolbar-spacer"></span>
          @if (userName()) {
            <span class="username">{{ userName() }}</span>
          }
          <button mat-icon-button (click)="auth.logout()" aria-label="Uitloggen">
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
      color: #1976d2;
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
      background-color: #e3f2fd !important;
      border-left: 4px solid #1976d2 !important;
    }
    .active-item mat-icon {
      color: #1976d2;
    }
    .active-item span[matListItemTitle] {
      color: #1976d2;
      font-weight: 500;
    }
    .content {
      display: flex;
      flex-direction: column;
    }
    .app-toolbar {
      background: #1976d2;
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

  private allNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Boekingen', route: '/bookings', icon: 'book_online', authority: 'BOOKING_READ' },
    { label: 'Bookers', route: '/bookers', icon: 'person', authority: 'BOOKING_READ' },
    { label: 'Reizigers', route: '/travelers', icon: 'group', authority: 'BOOKING_READ' },
    { label: 'Accommodaties', route: '/accommodations', icon: 'hotel', authority: 'BOOKING_READ' },
    { label: 'Leveranciers', route: '/suppliers', icon: 'business', authority: 'BOOKING_READ' },
    { label: 'Documenten', route: '/documents', icon: 'description', authority: 'BOOKING_READ' },
    { label: 'Betalingen', route: '/payments', icon: 'payment', authority: 'PAYMENT_READ' },
    { label: 'Organisaties', route: '/admin/organizations', icon: 'corporate_fare', authority: 'ORGANIZATION_READ', section: 'BEHEER' },
    { label: 'Personen', route: '/admin/persons', icon: 'people', authority: 'PERSON_READ' },
    { label: 'Accounts', route: '/admin/accounts', icon: 'manage_accounts', authority: 'ACCOUNT_READ' },
    { label: 'Rollen', route: '/admin/roles', icon: 'admin_panel_settings', authority: 'ROLE_READ' },
  ];

  visibleNavItems = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    return this.allNavItems.filter(
      (item) => !item.authority || user.authorities.includes(item.authority)
    );
  });

  userName = computed(() => this.auth.currentUser()?.accountId ?? '');
}
