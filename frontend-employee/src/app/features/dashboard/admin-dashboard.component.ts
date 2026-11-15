import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { OrganizationService } from '../admin/organization.service';
import { PersonService } from '../admin/person.service';
import { AccountService } from '../admin/account.service';
import { AccountRoleService } from '../admin/account-role.service';
import { RoleService } from '../admin/role.service';
import { WelcomeHeaderComponent } from './welcome-header.component';

interface OrgOverview {
  name: string;
  personCount: number;
  accountCount: number;
  roleCounts: { role: string; count: number }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [WelcomeHeaderComponent, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe],
  template: `
    <app-welcome-header />

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ 'dashboard.organizationsOverview' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="org-grid">
            @for (org of organizations(); track org.name) {
              <div class="org-tile">
                <div class="org-name">{{ org.name }}</div>
                <div class="org-stats">
                  <div class="org-stat">
                    <mat-icon class="org-stat-icon">people</mat-icon>
                    <span class="org-stat-number">{{ org.personCount }}</span>
                    <span class="org-stat-label">{{ 'dashboard.persons' | translate }}</span>
                  </div>
                  <div class="org-stat">
                    <mat-icon class="org-stat-icon">manage_accounts</mat-icon>
                    <span class="org-stat-number">{{ org.accountCount }}</span>
                    <span class="org-stat-label">{{ 'dashboard.accounts' | translate }}</span>
                  </div>
                </div>
                <div class="role-chips">
                  @for (rc of org.roleCounts; track rc.role) {
                    <span class="badge badge-neutral">{{ rc.role }}: {{ rc.count }}</span>
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
    .org-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }
    .org-tile {
      border: 1px solid var(--ui-line);
      border-top: 3px solid var(--theme-primary);
      border-radius: var(--ui-radius);
      padding: 12px 16px;
    }
    .org-name {
      margin-bottom: 8px;
      font-size: 15px;
      font-weight: 600;
      color: var(--ui-text);
    }
    .org-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 10px;
    }
    .org-stat {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .org-stat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: var(--theme-primary);
    }
    .org-stat-number {
      font-size: 18px;
      font-weight: 600;
      color: var(--ui-text);
    }
    .org-stat-label { color: var(--ui-text-muted); }
    .role-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
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
