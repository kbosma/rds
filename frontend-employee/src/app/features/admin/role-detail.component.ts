import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { forkJoin, Observable, of } from 'rxjs';
import { RoleService } from './role.service';
import { RoleAuthorityService } from './role-authority.service';
import { AuthorityService } from './authority.service';
import { AuthorizationLogService } from './authorization-log.service';
import { AuthorityToggle, RoleAuthorityMatrixComponent } from './role-authority-matrix.component';
import { AuthService } from '../../core/auth/auth.service';
import { Authority, AuthorizationLogEntry, Role } from '../../shared/models';

/**
 * Een rol bekijken, aanmaken (eventueel als kopie) en zijn rechten instellen in een matrix.
 * Wat mag, bepaalt de server (eigen rol van de eigen organisatie, onder je niveau, alleen uitdeelbare rechten);
 * dit scherm laat alleen zien wat kan en geeft de uitleg van de server door.
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
    @if (!isNew() && !editable()) {
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
          @if (isNew()) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'roles.copyFrom' | translate }}</mat-label>
              <mat-select formControlName="copyFrom" class="copy-from">
                <mat-option [value]="null">{{ 'roles.startEmpty' | translate }}</mat-option>
                @for (r of copyCandidates(); track r.roleId) {
                  <mat-option [value]="r.roleId">{{ r.description }}</mat-option>
                }
              </mat-select>
              <mat-hint>{{ 'roles.copyFromHint' | translate }}</mat-hint>
            </mat-form-field>
          }
          @if (!isNew() && role()?.accountCount != null) {
            <p class="usage">{{ 'roles.usedBy' | translate: { count: role()!.accountCount } }}</p>
          }
          <div class="actions">
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

    @if (!isNew() && canReadAuthorities) {
      <mat-card class="section-card authorities-card">
        <mat-card-header>
          <mat-card-title>{{ 'roles.authorities' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (editable() && canChange) {
            <p class="hint">{{ 'roles.matrix.hint' | translate }}</p>
          }
          <app-role-authority-matrix
            [authorities]="allAuthorities()" [assigned]="assigned()" [grantable]="grantable()"
            [newNames]="newNames()" [editable]="editable() && canChange" (toggle)="onToggle($event)" />
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
            @for (entry of history(); track entry.authorizationLogId) {
              <tr>
                <td class="when">{{ entry.createdAt | date: 'dd-MM-yyyy HH:mm' }}</td>
                <td>{{ 'roles.log.' + entry.action | translate }}</td>
                <td>{{ entry.authority ?? entry.accountUserName ?? '' }}</td>
                <td class="details">{{ entry.details ?? '' }}</td>
              </tr>
            }
          </table>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .locked-note { display: flex; align-items: center; gap: 6px; color: var(--ui-text-muted, #5b6b77); margin: -4px 0 12px; }
    .usage, .hint { color: var(--ui-text-muted, #5b6b77); font-size: 13px; margin: 0 0 8px; }
    .history { border-collapse: collapse; width: 100%; font-size: 13px; }
    .history td { border-bottom: 1px solid var(--ui-line); padding: 4px 8px; }
    .history .when { white-space: nowrap; width: 1%; }
    .history .details { color: var(--ui-text-muted, #5b6b77); }
  `],
})
export class RoleDetailComponent implements OnInit {
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

  canReadAuthorities = this.authService.hasAuthority('ROLEAUTHORITY_READ') && this.authService.hasAuthority('AUTHORITY_READ');
  /** Rechten aan- en uitzetten vraagt allebei; de matrix kent één vinkje per recht. */
  canChange = this.authService.hasAuthority('ROLEAUTHORITY_CREATE') && this.authService.hasAuthority('ROLEAUTHORITY_DELETE');

  isNew = signal(true);
  saving = signal(false);
  /** De rol zoals de server hem kent, met het oordeel of de gebruiker hem mag wijzigen. */
  role = signal<Role | null>(null);
  /** Een nieuwe rol is altijd te bewerken; een bestaande alleen als de server dat zegt (eigen rol, onder je niveau). */
  editable = computed(() => this.isNew() || !!this.role()?.editable);

  allAuthorities = signal<Authority[]>([]);
  assigned = signal<Set<string>>(new Set());
  grantable = signal<Set<string>>(new Set());
  newNames = signal<Set<string>>(new Set());
  history = signal<AuthorizationLogEntry[]>([]);
  /** Rollen die als startpunt kunnen dienen: alleen die waarvan je alle rechten zelf mag uitdelen. */
  copyCandidates = signal<Role[]>([]);

  private roleId: string | null = null;

  form = this.fb.group({
    description: ['', Validators.required],
    copyFrom: [null as string | null],
  });

  ngOnInit() {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isNew.set(!this.roleId);
    if (!this.roleId) {
      this.loadCopyCandidates();
      return;
    }
    this.loadRole();
    if (this.canReadAuthorities) this.loadAuthorities();
    this.loadHistory();
  }

  save() {
    if (this.saving() || !this.editable()) return;
    this.saving.set(true);
    const description = this.form.value.description ?? undefined;
    const op = this.roleId
      ? this.roleService.update(this.roleId, { description })
      : this.roleService.create({ description }, this.form.value.copyFrom ?? undefined);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('common.saved'), '', { duration: 3000 });
        if (!this.roleId) {
          // Verder met de rechten van de nieuwe rol.
          this.router.navigate(['/admin/roles', saved.roleId]);
        } else {
          this.role.set(saved);
          this.loadHistory();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.showError(err, 'common.saveError');
      },
    });
  }

  onToggle({ authority, checked }: AuthorityToggle) {
    if (!this.roleId || !this.editable() || !this.canChange) return;
    const op: Observable<unknown> = checked
      ? this.roleAuthorityService.create(this.roleId, authority.authorityId)
      : this.roleAuthorityService.delete(this.roleId, authority.authorityId);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadAuthorities();
        this.loadHistory();
      },
      error: (err: HttpErrorResponse) => {
        this.showError(err, checked ? 'roles.authorityAssignError' : 'roles.authorityRemoveError');
        this.loadAuthorities(); // het vinkje terug naar de werkelijke stand
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
      },
    });
  }

  private loadAuthorities() {
    forkJoin({
      links: this.roleAuthorityService.getAll(),
      all: this.authorityService.getAll(),
      grantable: this.authorityService.getGrantable(),
      fresh: this.authService.hasAuthority('ROLE_READ') ? this.roleService.getNewAuthorities() : of([] as Authority[]),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ links, all, grantable, fresh }) => {
        this.allAuthorities.set(all);
        this.grantable.set(new Set(grantable.map((a) => a.description)));
        this.newNames.set(new Set(fresh.map((a) => a.description)));
        this.assigned.set(new Set(links.filter((l) => l.role.roleId === this.roleId).map((l) => l.authority.description)));
      },
    });
  }

  private loadHistory() {
    this.logService.getForRole(this.roleId!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (entries) => this.history.set(entries),
      error: () => this.history.set([]),
    });
  }

  private loadCopyCandidates() {
    if (!this.canReadAuthorities) return;
    forkJoin({
      roles: this.roleService.getAll(),
      links: this.roleAuthorityService.getAll(),
      grantable: this.authorityService.getGrantable(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ roles, links, grantable }) => {
        const mayGive = new Set(grantable.map((a) => a.description));
        this.copyCandidates.set(roles.filter((role) =>
          links.filter((l) => l.role.roleId === role.roleId).every((l) => mayGive.has(l.authority.description))));
      },
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
