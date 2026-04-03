import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { OrganizationService } from '../admin/organization.service';
import { PersonService } from '../admin/person.service';
import { AccountService } from '../admin/account.service';
import { AccountRoleService } from '../admin/account-role.service';
import { RoleService } from '../admin/role.service';

interface OrgOverview {
  name: string;
  personCount: number;
  accountCount: number;
  roleCounts: { role: string; count: number }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  template: `
    <div class="welcome-card">
      <mat-card>
        <mat-card-content class="welcome-content">
          <mat-icon class="welcome-icon">admin_panel_settings</mat-icon>
          <div>
            <h2 class="welcome-title">{{ 'dashboard.welcome' | translate }}, {{ auth.currentUser()?.personName }}</h2>
            <p class="welcome-detail">
              <strong>{{ 'dashboard.role' | translate }}:</strong> {{ auth.currentUser()?.roles?.join(', ') }}
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <mat-card class="overview-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="header-icon">business</mat-icon>
            {{ 'dashboard.organizationsOverview' | translate }}
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="org-grid">
            @for (org of organizations(); track org.name) {
              <div class="org-tile">
                <div class="org-name">{{ org.name }}</div>
                <div class="org-stats">
                  <div class="org-stat">
                    <mat-icon class="org-stat-icon persons-icon">people</mat-icon>
                    <span class="org-stat-number">{{ org.personCount }}</span>
                    <span class="org-stat-label">{{ 'dashboard.persons' | translate }}</span>
                  </div>
                  <div class="org-stat">
                    <mat-icon class="org-stat-icon accounts-icon">manage_accounts</mat-icon>
                    <span class="org-stat-number">{{ org.accountCount }}</span>
                    <span class="org-stat-label">{{ 'dashboard.accounts' | translate }}</span>
                  </div>
                </div>
                <div class="role-chips">
                  @for (rc of org.roleCounts; track rc.role) {
                    <span class="role-chip" [class]="'role-chip role-' + rc.role.toLowerCase()">
                      {{ rc.role }}: {{ rc.count }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .welcome-card { margin-bottom: 24px; }
    .welcome-content { display: flex; align-items: center; gap: 16px; padding: 8px 0; }
    .welcome-icon { font-size: 48px; width: 48px; height: 48px; color: #7b1fa2; }
    .welcome-title { margin: 0; font-size: 20px; font-weight: 500; }
    .welcome-detail { margin: 4px 0 0; color: #666; font-size: 14px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .overview-card { border-radius: 12px; }
    .header-icon {
      vertical-align: middle;
      margin-right: 8px;
      color: #7b1fa2;
    }
    .org-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      padding: 8px 0;
    }
    .org-tile {
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      background: linear-gradient(135deg, #f5f5f5, #ffffff);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .org-tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .org-name {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #7b1fa2;
    }
    .org-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
    }
    .org-stat {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .org-stat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .persons-icon { color: #1976d2; }
    .accounts-icon { color: #388e3c; }
    .org-stat-number {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    .org-stat-label {
      font-size: 13px;
      color: #888;
    }
    .role-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .role-chip {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }
    .role-admin {
      background: #f3e5f5;
      color: #7b1fa2;
    }
    .role-manager {
      background: #e3f2fd;
      color: #1565c0;
    }
    .role-employee {
      background: #e8f5e9;
      color: #2e7d32;
    }
  `],
})
export class AdminDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private organizationService = inject(OrganizationService);
  private personService = inject(PersonService);
  private accountService = inject(AccountService);
  private accountRoleService = inject(AccountRoleService);
  private roleService = inject(RoleService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  organizations = signal<OrgOverview[]>([]);

  ngOnInit() {
    forkJoin({
      organizations: this.organizationService.getAll(),
      persons: this.personService.getAll(),
      accounts: this.accountService.getAll(),
      roles: this.roleService.getAll(),
      accountRoles: this.accountRoleService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ organizations, persons, accounts, roles, accountRoles }) => {
        const roleMap = new Map(roles.map(r => [r.roleId, r.description]));

        // Map personId → organizationId
        const personOrgMap = new Map(persons.map(p => [p.persoonId, p.organizationId]));

        // Map accountId → organizationId (via person)
        const accountOrgMap = new Map<string, string>();
        for (const acc of accounts) {
          const orgId = personOrgMap.get(acc.personId);
          if (orgId) accountOrgMap.set(acc.accountId, orgId);
        }

        // Build org overviews
        const overviews: OrgOverview[] = organizations.map(org => {
          const personCount = persons.filter(p => p.organizationId === org.organizationId).length;
          const accountCount = accounts.filter(a => personOrgMap.get(a.personId) === org.organizationId).length;

          // Count roles for this org's accounts
          const orgAccountIds = new Set(
            accounts.filter(a => accountOrgMap.get(a.accountId) === org.organizationId).map(a => a.accountId)
          );
          const roleCountMap = new Map<string, number>();
          for (const ar of accountRoles) {
            if (orgAccountIds.has(ar.account.accountId)) {
              const roleName = roleMap.get(ar.role.roleId) ?? ar.role.description;
              roleCountMap.set(roleName, (roleCountMap.get(roleName) ?? 0) + 1);
            }
          }
          const roleCounts = [...roleCountMap.entries()]
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => a.role.localeCompare(b.role));

          return { name: org.name, personCount, accountCount, roleCounts };
        });

        this.organizations.set(overviews);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
