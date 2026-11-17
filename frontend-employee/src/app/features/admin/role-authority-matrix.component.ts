import { Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslatePipe } from '@ngx-translate/core';
import { Authority } from '../../shared/models';

/** Een wijziging in de matrix: deze authority aan (true) of uit (false). */
export interface AuthorityToggle {
  authority: Authority;
  checked: boolean;
}

interface MatrixRow {
  domain: string;
  read?: Authority;
  create?: Authority;
  update?: Authority;
  delete?: Authority;
  other: Authority[];
}

/** Volgorde van de onderwerpen: eerst het dagelijkse werk, dan stamgegevens, dan beheer. */
const DOMAIN_ORDER = [
  'BOOKING', 'PAYMENT', 'DOCUMENT', 'EMAIL', 'NOTIFICATION', 'TEMPLATE',
  'ACCOMMODATION', 'SUPPLIER', 'ACTIVITY',
  'PERSON', 'ACCOUNT', 'ROLE', 'ROLEAUTHORITY', 'ACCOUNTROLE', 'AUTHORITY',
  'ORGANIZATION_THEME', 'ORGANIZATION_SETTINGS', 'ORGANIZATION', 'PLATFORM', 'BOOKER_PORTAL',
];

const CRUD = ['READ', 'CREATE', 'UPDATE', 'DELETE'] as const;

/**
 * De rechten van een rol als matrix: per onderwerp een rij, met Lezen/Aanmaken/Wijzigen/Verwijderen en Overig.
 * Alleen wat de gebruiker zelf mag uitdelen is aan te vinken; de rest is zichtbaar maar grijs. Het vinkje zelf is
 * gemak: de backend controleert alles (en vinkt vereisten mee aan).
 *
 * Zie docs/voorstel-eigen-rollen.md, §7.2.
 */
@Component({
  selector: 'app-role-authority-matrix',
  standalone: true,
  imports: [MatCheckboxModule, NgTemplateOutlet, TranslatePipe],
  template: `
    <div class="matrix-wrap">
      <table class="matrix">
        <thead>
          <tr>
            <th class="domain">{{ 'roles.matrix.subject' | translate }}</th>
            @for (action of crud; track action) {
              <th class="cell">{{ 'roles.matrix.' + action.toLowerCase() | translate }}</th>
            }
            <th>{{ 'roles.matrix.other' | translate }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.domain) {
            <tr>
              <th class="domain" scope="row">{{ domainLabel(row.domain) | translate }}</th>
              @for (action of crud; track action) {
                <td class="cell">
                  @if (cellOf(row, action); as authority) {
                    <ng-container *ngTemplateOutlet="box; context: { $implicit: authority, label: '' }" />
                  } @else {
                    <span class="none">–</span>
                  }
                </td>
              }
              <td class="other">
                @for (authority of row.other; track authority.authorityId) {
                  <ng-container *ngTemplateOutlet="box; context: { $implicit: authority, label: nameLabel(authority) }" />
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <ng-template #box let-authority let-label="label">
      <span class="box" [attr.title]="titleOf(authority) | translate">
        <mat-checkbox [checked]="assigned().has(authority.description)"
                      [disabled]="!canChange(authority)"
                      [attr.data-authority]="authority.description"
                      (change)="toggle.emit({ authority, checked: $event.checked })">
          @if (label) {
            {{ label | translate }}
          }
        </mat-checkbox>
        @if (newNames().has(authority.description)) {
          <span class="badge badge-new">{{ 'roles.matrix.new' | translate }}</span>
        }
      </span>
    </ng-template>
  `,
  styles: [`
    .matrix-wrap { overflow-x: auto; }
    .matrix { border-collapse: collapse; width: 100%; font-size: 13px; }
    .matrix th, .matrix td { border-bottom: 1px solid var(--ui-line); padding: 4px 8px; text-align: left; vertical-align: middle; }
    .matrix thead th { font-size: 12px; color: var(--ui-text-muted, #5b6b77); font-weight: 600; white-space: nowrap; }
    .matrix .domain { font-weight: 600; white-space: nowrap; }
    .matrix .cell { text-align: center; width: 90px; }
    .matrix .other { display: flex; flex-wrap: wrap; gap: 0 12px; }
    .none { color: var(--ui-text-muted, #9aa6af); }
    .box { display: inline-flex; align-items: center; gap: 2px; }
    .badge-new { background: var(--theme-accent); color: #1d2b36; font-size: 10px; padding: 1px 6px; border-radius: 8px; }
  `],
})
export class RoleAuthorityMatrixComponent {
  /** Alle authorities (met domein en vereisten). */
  readonly authorities = input<Authority[]>([]);
  /** Namen van de authorities van deze rol. */
  readonly assigned = input<Set<string>>(new Set());
  /** Namen die de ingelogde gebruiker mag uitdelen (G(u)). */
  readonly grantable = input<Set<string>>(new Set());
  /** Namen van nieuwe rechten (label "Nieuw"). */
  readonly newNames = input<Set<string>>(new Set());
  /** Mag de gebruiker deze rol wijzigen? */
  readonly editable = input(false);

  readonly toggle = output<AuthorityToggle>();

  readonly crud = CRUD;

  /**
   * Rijen per onderwerp. Een onderwerp waar de gebruiker niets van mag uitdelen en dat de rol niet heeft, verdwijnt
   * (bijv. platformbeheer voor een klant): dat kan hier toch niemand aanzetten.
   */
  readonly rows = computed<MatrixRow[]>(() => {
    const byDomain = new Map<string, MatrixRow>();
    for (const authority of this.authorities()) {
      const domain = authority.domain ?? authority.description;
      const row = byDomain.get(domain) ?? { domain, other: [] };
      const action = CRUD.find((a) => authority.description === `${domain}_${a}`);
      if (action) {
        row[action.toLowerCase() as 'read' | 'create' | 'update' | 'delete'] = authority;
      } else {
        row.other.push(authority);
      }
      byDomain.set(domain, row);
    }
    const relevant = (row: MatrixRow) =>
      [row.read, row.create, row.update, row.delete, ...row.other]
        .some((a) => !!a && (this.grantable().has(a.description) || this.assigned().has(a.description)));
    const rank = (domain: string) => {
      const index = DOMAIN_ORDER.indexOf(domain);
      return index === -1 ? DOMAIN_ORDER.length : index;
    };
    return [...byDomain.values()]
      .filter(relevant)
      .sort((x, y) => rank(x.domain) - rank(y.domain) || x.domain.localeCompare(y.domain));
  });

  cellOf(row: MatrixRow, action: (typeof CRUD)[number]): Authority | undefined {
    return row[action.toLowerCase() as 'read' | 'create' | 'update' | 'delete'];
  }

  canChange(authority: Authority): boolean {
    return this.editable() && this.grantable().has(authority.description);
  }

  titleOf(authority: Authority): string {
    if (!this.grantable().has(authority.description)) return 'roles.matrix.notYours';
    return authority.requires?.length ? 'roles.matrix.hasRequirements' : '';
  }

  domainLabel(domain: string): string {
    return `authorityDomains.${domain}`;
  }

  nameLabel(authority: Authority): string {
    return `authorityNames.${authority.description}`;
  }
}
