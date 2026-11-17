import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { RoleService } from './role.service';
import { RoleAuthorityService } from './role-authority.service';
import { AuthorityService } from './authority.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Authority, Role } from '../../shared/models';

@Component({
  selector: 'app-role-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    TranslatePipe,
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
      <mat-card class="section-card">
        <mat-card-header>
          <mat-card-title>{{ 'roles.authorities' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (canAssign && editable()) {
            <div class="link-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ 'roles.selectAuthority' | translate }}</mat-label>
                <mat-select [formControl]="authorityControl">
                  @for (a of availableAuthorities(); track a.authorityId) {
                    <mat-option [value]="a.authorityId">
                      {{ a.description }}
                      @if (a.requires?.length) {
                        <span class="requires">({{ 'roles.alsoAdds' | translate }} {{ a.requires!.join(', ') }})</span>
                      }
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" type="button" class="add-authority-btn"
                      [disabled]="!authorityControl.value" (click)="addAuthority()">
                <mat-icon>add</mat-icon> {{ 'roles.addAuthority' | translate }}
              </button>
            </div>
          }
          <div class="item-grid">
            @for (a of assigned(); track a.authorityId) {
              <div class="list-item">
                <span class="item-text">{{ a.description }}</span>
                @if (canRemove && editable()) {
                  <button mat-icon-button type="button" class="remove-authority-btn act-delete" (click)="removeAuthority(a)">
                    <mat-icon>link_off</mat-icon>
                  </button>
                }
              </div>
            } @empty {
              <p class="empty-text">{{ 'roles.noAuthoritiesAssigned' | translate }}</p>
            }
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .link-row { display: flex; gap: 12px; align-items: baseline; max-width: 760px; }
    /* Rechten in een raster: veel rechten passen zo op één scherm. */
    .item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; }
    .list-item { display: flex; justify-content: space-between; align-items: center; gap: 4px; min-height: 32px; padding: 0 2px 0 10px; border: 1px solid var(--ui-line); border-radius: var(--ui-radius); }
    .item-text { font-size: 12px; overflow-wrap: anywhere; }
    .locked-note { display: flex; align-items: center; gap: 6px; color: var(--ui-text-muted, #5b6b77); margin: -4px 0 12px; }
    .requires { color: var(--ui-text-muted, #5b6b77); font-size: 12px; }
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
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmService);

  canReadAuthorities = this.authService.hasAuthority('ROLEAUTHORITY_READ');
  canAssign = this.authService.hasAuthority('ROLEAUTHORITY_CREATE');
  canRemove = this.authService.hasAuthority('ROLEAUTHORITY_DELETE');

  /** De rol zoals de server hem kent, met het oordeel of de gebruiker hem mag wijzigen. */
  role = signal<Role | null>(null);
  /** Een nieuwe rol is altijd te bewerken; een bestaande alleen als de server dat zegt (eigen rol, onder je niveau). */
  editable = computed(() => this.isNew() || !!this.role()?.editable);

  assigned = signal<Authority[]>([]);
  private allAuthorities = signal<Authority[]>([]);
  availableAuthorities = computed(() => {
    const taken = new Set(this.assigned().map(a => a.authorityId));
    return this.allAuthorities().filter(a => !taken.has(a.authorityId));
  });
  authorityControl = new FormControl<string | null>(null);

  isNew = signal(true);
  saving = signal(false);
  private roleId: string | null = null;

  form = this.fb.group({
    description: ['', Validators.required],
  });

  ngOnInit() {
    this.roleId = this.route.snapshot.paramMap.get('id');
    this.isNew.set(!this.roleId);
    if (this.roleId) {
      this.roleService.getById(this.roleId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (role) => {
          this.role.set(role);
          this.form.patchValue(role);
          if (!role.editable) this.form.disable();
        },
      });
      if (this.canReadAuthorities) this.loadAuthorities();
    }
  }

  save() {
    if (this.saving()) return;
    this.saving.set(true);
    const value = { description: this.form.value.description ?? undefined };
    const op = this.roleId
      ? this.roleService.update(this.roleId, value)
      : this.roleService.create(value);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('common.saved'), '', { duration: 3000 });
        this.goBack();
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err?.error?.message || this.translate.instant('common.saveError'), '', { duration: 5000 });
      },
    });
  }

  private loadAuthorities() {
    forkJoin({
      links: this.roleAuthorityService.getAll(),
      // Alleen wat de gebruiker zelf mag uitdelen (G(u)); de rest kan de server toch niet toestaan.
      all: this.authorityService.getGrantable(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ links, all }) => {
        this.allAuthorities.set(all);
        this.assigned.set(
          links.filter(l => l.role.roleId === this.roleId)
            .map(l => ({ authorityId: l.authority.authorityId, description: l.authority.description }) as Authority)
            .sort((a, b) => a.description.localeCompare(b.description))
        );
      },
    });
  }

  addAuthority() {
    const authorityId = this.authorityControl.value;
    if (!this.canAssign || !authorityId || !this.roleId) return;
    this.roleAuthorityService.create(this.roleId, authorityId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.authorityControl.reset();
        this.snackBar.open(this.translate.instant('roles.authorityAssigned'), '', { duration: 3000 });
        this.loadAuthorities();
      },
      error: (err) => this.snackBar.open(err?.error?.message || this.translate.instant('roles.authorityAssignError'), '', { duration: 5000 }),
    });
  }

  async removeAuthority(authority: Authority) {
    if (!this.canRemove || !this.roleId) return;
    if (!await this.confirmService.confirm(this.translate.instant('roles.removeAuthorityConfirm', { authority: authority.description }))) return;
    this.roleAuthorityService.delete(this.roleId, authority.authorityId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('roles.authorityRemoved'), '', { duration: 3000 });
        this.loadAuthorities();
      },
      error: (err) => this.snackBar.open(err?.error?.message || this.translate.instant('roles.authorityRemoveError'), '', { duration: 5000 }),
    });
  }

  goBack() {
    this.router.navigate(['/admin/roles']);
  }
}
