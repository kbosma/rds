import { Component, computed, DestroyRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { RoleService } from './role.service';
import { RoleAuthorityService } from './role-authority.service';
import { AuthorityService } from './authority.service';
import { AuthorizationLogService } from './authorization-log.service';
import { AuthorityToggle, RoleAuthorityMatrixComponent } from './role-authority-matrix.component';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { HasUnsavedChanges } from '../../shared/guards/unsaved-changes.guard';
import { requiredClosure } from './authority-requirements';
import { Authority, AuthorizationLogEntry, Role } from '../../shared/models';

/**
 * Een rol bekijken, aanmaken of bewerken in één formulier: omschrijving, een sjabloon en de rechtenmatrix.
 * De matrix is een concept; pas Opslaan stuurt naam en rechten in één keer naar de server, die alleen het verschil
 * opslaat (alles of niets). Annuleren laat alles zoals het was. Wat mag, bepaalt de server (eigen rol van de eigen
 * organisatie, onder je niveau, alleen uitdeelbare rechten); dit scherm laat zien wat kan en geeft de uitleg door.
 */
@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslatePipe,
    RoleAuthorityMatrixComponent,
  ],
  template: `
    <div class="page-header">
      <button mat-icon-button (click)="goBack()"><mat-icon>arrow_back</mat-icon></button>
      <h1>{{ (isNew() ? 'roles.newRole' : (editable() ? 'roles.editTitle' : 'roles.viewTitle')) | translate }}</h1>
    </div>
    @if (!isNew() && role() && !editable()) {
      <p class="locked-note">
        <mat-icon>lock</mat-icon>
        {{ (role()?.systemKey ? 'roles.systemRoleLocked' : 'roles.aboveYourLevel') | translate }}
      </p>
    }

    <mat-card class="detail-card">
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'roles.description' | translate }}</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>
          @if (matrixEditable()) {
            <!-- dynamic: de hint is twee regels en mag de regel eronder niet overlappen -->
            <mat-form-field appearance="outline" class="full-width template-field" subscriptSizing="dynamic">
              <mat-label>{{ 'roles.template' | translate }}</mat-label>
              <mat-select formControlName="template" class="template" (selectionChange)="applyTemplate($event.value)">
                <mat-option [value]="null">{{ 'roles.noTemplate' | translate }}</mat-option>
                @for (r of templateCandidates(); track r.roleId) {
                  <mat-option [value]="r.roleId">{{ r.description }}</mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'roles.templateHint' | translate }}</mat-hint>
            </mat-form-field>
          }
          @if (!isNew() && role()?.accountCount != null) {
            <p class="usage">{{ 'roles.usedBy' | translate: { count: role()!.accountCount } }}</p>
          }
          <div class="actions">
            @if (editable() && changeCount() > 0) {
              <span class="pending">{{ 'roles.pendingChanges' | translate: { count: changeCount() } }}</span>
            }
            <button mat-button type="button" (click)="goBack()">{{ (editable() ? 'common.cancel' : 'common.close') | translate }}</button>
            @if (editable()) {
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
                {{ 'common.save' | translate }}
              </button>
            }
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (canReadAuthorities) {
      <mat-card class="section-card authorities-card">
        <mat-card-header>
          <mat-card-title>{{ 'roles.authorities' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (matrixEditable()) {
            <p class="hint">{{ 'roles.matrix.hint' | translate }}</p>
          }
          <app-role-authority-matrix
            [authorities]="allAuthorities()" [assigned]="draft()" [grantable]="grantable()"
            [newNames]="newNames()" [editable]="matrixEditable()" (toggle)="onToggle($event)" />
        </mat-card-content>
      </mat-card>
    }

    @if (!isNew() && history().length > 0) {
      <mat-card class="section-card history-card">
        <mat-card-header>
          <mat-card-title>{{ 'roles.history' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table class="history">
            <thead>
              <tr>
                <th>{{ 'roles.historyWhen' | translate }}</th>
                <th>{{ 'roles.historyWho' | translate }}</th>
                <th>{{ 'roles.historyWhat' | translate }}</th>
                <th>{{ 'roles.historyAuthority' | translate }}</th>
                <th>{{ 'roles.historyDetails' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of history(); track entry.authorizationLogId) {
                <tr>
                  <td class="when">{{ entry.createdAt | date: 'dd-MM-yyyy HH:mm' }}</td>
                  <td class="who">{{ entry.createdByName || ('roles.historyBySystem' | translate) }}</td>
                  <td>{{ 'roles.log.' + entry.action | translate }}</td>
                  <td>{{ entry.authority ?? entry.accountUserName ?? '' }}</td>
                  <td class="details">{{ entry.details ?? '' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .locked-note { display: flex; align-items: center; gap: 6px; color: var(--ui-text-muted, #5b6b77); margin: -4px 0 12px; }
    .usage, .hint { color: var(--ui-text-muted, #5b6b77); font-size: 13px; margin: 0 0 8px; }
    .template-field { margin-bottom: 12px; }
    .pending { margin-right: auto; color: var(--ui-text-muted, #5b6b77); font-size: 13px; align-self: center; }
    .history { border-collapse: collapse; width: 100%; font-size: 13px; }
    .history th { text-align: left; font-size: 12px; font-weight: 600; color: var(--ui-text-muted, #5b6b77); padding: 4px 8px;
                  border-bottom: 1px solid var(--ui-line); }
    .history td { border-bottom: 1px solid var(--ui-line); padding: 4px 8px; }
    .history tbody tr:nth-child(even) { background: var(--ui-zebra, rgba(0, 0, 0, .025)); }
    .history .when, .history .who { white-space: nowrap; width: 1%; }
    .history .details { color: var(--ui-text-muted, #5b6b77); }
  `],
})
export class RoleDetailComponent implements OnInit, HasUnsavedChanges {
  private roleService = inject(RoleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private roleAuthorityService = inject(RoleAuthorityService);
  private authorityService = inject(AuthorityService);
  private logService = inject(AuthorizationLogService);
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmService);

  canReadAuthorities = this.authService.hasAuthority('ROLEAUTHORITY_READ') && this.authService.hasAuthority('AUTHORITY_READ');
  /** Rechten aan- en uitzetten vraagt allebei; de matrix kent één vinkje per recht. */
  canChange = this.authService.hasAuthority('ROLEAUTHORITY_CREATE') && this.authService.hasAuthority('ROLEAUTHORITY_DELETE');
  /** Hernoemen vraagt ROLE_UPDATE; een nieuwe rol een naam geven mag met ROLE_CREATE (de route vraagt dat al). */
  private canRename = this.authService.hasAuthority('ROLE_UPDATE');

  isNew = signal(true);
  saving = signal(false);
  /** De rol zoals de server hem kent, met het oordeel of de gebruiker hem mag wijzigen. */
  role = signal<Role | null>(null);
  /** Een nieuwe rol is altijd te bewerken; een bestaande alleen als de server dat zegt (eigen rol, onder je niveau). */
  editable = computed(() => this.isNew() || !!this.role()?.editable);
  matrixEditable = computed(() => this.editable() && this.canChange && this.canReadAuthorities);

  allAuthorities = signal<Authority[]>([]);
  grantable = signal<Set<string>>(new Set());
  newNames = signal<Set<string>>(new Set());
  history = signal<AuthorizationLogEntry[]>([]);
  /** Rollen die als sjabloon kunnen dienen: alleen die waarvan je alle rechten zelf mag uitdelen (niet de rol zelf). */
  templateCandidates = signal<Role[]>([]);

  /** De rechten zoals ze bij binnenkomst waren (leeg bij een nieuwe rol); Opslaan stuurt het concept, de server de diff. */
  initial = signal<Set<string>>(new Set());
  /** Het concept in de matrix; er wordt pas iets bewaard bij Opslaan. */
  draft = signal<Set<string>>(new Set());
  changeCount = computed(() => {
    const initial = this.initial();
    const draft = this.draft();
    return [...draft].filter((n) => !initial.has(n)).length + [...initial].filter((n) => !draft.has(n)).length;
  });

  private roleId: string | null = null;
  private authoritiesByRole = new Map<string, Set<string>>();
  private byName = computed(() => new Map(this.allAuthorities().map((a) => [a.description, a] as const)));
  /** Na opslaan mag je weg zonder vraag. */
  private saved = false;

  form = this.fb.group({
    description: ['', Validators.required],
    template: [null as string | null],
  });

  ngOnInit() {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isNew.set(!this.roleId);
    if (this.roleId) {
      this.loadRole();
      this.loadHistory();
    }
    if (this.canReadAuthorities) this.loadAuthorities();
  }

  hasUnsavedChanges(): boolean {
    if (this.saved || !this.editable()) return false;
    const description = (this.form.value.description ?? '').trim();
    const nameChanged = this.isNew() ? description !== '' : description !== (this.role()?.description ?? '');
    return nameChanged || this.changeCount() > 0;
  }

  @HostListener('window:beforeunload', ['$event'])
  warnBeforeUnload(event: BeforeUnloadEvent) {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  /** Vinkje aan: met de vereisten erbij. Uit: alleen als geen ander aangevinkt recht het nodig heeft (de matrix zorgt daarvoor). */
  onToggle({ authority, checked }: AuthorityToggle) {
    if (!this.matrixEditable()) return;
    const next = new Set(this.draft());
    if (checked) {
      next.add(authority.description);
      requiredClosure(authority.description, this.byName()).forEach((name) => next.add(name));
    } else {
      next.delete(authority.description);
    }
    this.draft.set(next);
  }

  /** Het sjabloon vervangt het concept in de matrix; met openstaande wijzigingen vraagt het eerst. */
  async applyTemplate(templateId: string | null) {
    const control = this.form.controls.template;
    if (this.changeCount() > 0
        && !(await this.confirmService.confirm(this.translate.instant('roles.templateReplaces')))) {
      control.setValue(this.appliedTemplate, { emitEvent: false });
      return;
    }
    this.appliedTemplate = templateId;
    this.draft.set(new Set(templateId ? this.authoritiesByRole.get(templateId) ?? [] : []));
  }
  private appliedTemplate: string | null = null;

  save() {
    if (this.saving() || !this.editable() || this.form.invalid) return;
    this.saving.set(true);
    const payload: Partial<Role> = { description: this.form.value.description ?? undefined };
    if (this.matrixEditable()) payload.authorities = [...this.draft()].sort();
    const op = this.roleId ? this.roleService.update(this.roleId, payload) : this.roleService.create(payload);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved = true;
        this.snackBar.open(this.translate.instant(this.roleId ? 'roles.saved' : 'roles.created'), '', { duration: 3000 });
        this.goBack();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.showError(err, 'common.saveError');
      },
    });
  }

  goBack() {
    this.router.navigate(['/admin/roles']);
  }

  private loadRole() {
    this.roleService.getById(this.roleId!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (role) => {
        this.role.set(role);
        this.form.patchValue({ description: role.description });
        if (!role.editable) this.form.disable();
        else if (!this.canRename) this.form.controls.description.disable();
      },
    });
  }

  private loadAuthorities() {
    forkJoin({
      links: this.roleAuthorityService.getAll(),
      all: this.authorityService.getAll(),
      grantable: this.authorityService.getGrantable(),
      roles: this.authService.hasAuthority('ROLE_READ') ? this.roleService.getAll() : of([] as Role[]),
      fresh: this.authService.hasAuthority('ROLE_READ') ? this.roleService.getNewAuthorities() : of([] as Authority[]),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ links, all, grantable, roles, fresh }) => {
        this.allAuthorities.set(all);
        const mayGive = new Set(grantable.map((a) => a.description));
        this.grantable.set(mayGive);
        this.newNames.set(new Set(fresh.map((a) => a.description)));
        this.authoritiesByRole = new Map();
        for (const link of links) {
          const names = this.authoritiesByRole.get(link.role.roleId) ?? new Set<string>();
          names.add(link.authority.description);
          this.authoritiesByRole.set(link.role.roleId, names);
        }
        this.templateCandidates.set(roles.filter((r) => r.roleId !== this.roleId
          && [...(this.authoritiesByRole.get(r.roleId) ?? [])].every((name) => mayGive.has(name))));
        const current = new Set(this.roleId ? this.authoritiesByRole.get(this.roleId) ?? [] : []);
        this.initial.set(current);
        this.draft.set(new Set(current));
      },
    });
  }

  private loadHistory() {
    this.logService.getForRole(this.roleId!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entries) => this.history.set(entries),
      error: () => this.history.set([]),
    });
  }

  /** De server legt uit waarom iets niet mag (403/409); anders een algemene melding. */
  private showError(err: HttpErrorResponse, fallbackKey: string) {
    const message = (err.status === 403 || err.status === 409) && err.error?.message
      ? err.error.message
      : this.translate.instant(fallbackKey);
    this.snackBar.open(message, this.translate.instant('common.close'), { duration: 6000 });
  }
}
