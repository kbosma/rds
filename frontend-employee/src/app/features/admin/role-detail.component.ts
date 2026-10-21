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
import { Authority } from '../../shared/models';

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
    <div class="header">
      <button mat-icon-button (click)="goBack()"><mat-icon>arrow_back</mat-icon></button>
      <h1>{{ (isNew() ? 'roles.newRole' : 'roles.editTitle') | translate }}</h1>
    </div>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'roles.description' | translate }}</mat-label>
            <input matInput formControlName="description" />
          </mat-form-field>
          <div class="actions">
            <button mat-button type="button" (click)="goBack()">{{ 'common.cancel' | translate }}</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              {{ 'common.save' | translate }}
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (!isNew() && canReadAuthorities) {
      <mat-card class="authorities-card">
        <mat-card-header>
          <mat-card-title>{{ 'roles.authorities' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (canAssign) {
            <div class="link-row">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ 'roles.selectAuthority' | translate }}</mat-label>
                <mat-select [formControl]="authorityControl">
                  @for (a of availableAuthorities(); track a.authorityId) {
                    <mat-option [value]="a.authorityId">{{ a.description }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-raised-button color="primary" type="button" class="add-authority-btn"
                      [disabled]="!authorityControl.value" (click)="addAuthority()">
                <mat-icon>add</mat-icon> {{ 'roles.addAuthority' | translate }}
              </button>
            </div>
          }
          @for (a of assigned(); track a.authorityId) {
            <div class="list-item">
              <span>{{ a.description }}</span>
              @if (canRemove) {
                <button mat-icon-button type="button" class="remove-authority-btn act-delete" (click)="removeAuthority(a)">
                  <mat-icon>link_off</mat-icon>
                </button>
              }
            </div>
          } @empty {
            <p class="empty-text">{{ 'roles.noAuthoritiesAssigned' | translate }}</p>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 24px; font-weight: 500; }
    .full-width { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .authorities-card { margin-top: 16px; }
    .link-row { display: flex; gap: 12px; align-items: baseline; margin-top: 8px; }
    .flex-1 { flex: 1; }
    .list-item { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e0e0e0; border-radius: 8px; padding: 4px 12px; margin-bottom: 8px; min-height: 40px; }
    .empty-text { color: #888; font-style: italic; }
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
        next: (role) => this.form.patchValue(role),
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
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('common.saveError'), '', { duration: 3000 });
      },
    });
  }

  private loadAuthorities() {
    forkJoin({
      links: this.roleAuthorityService.getAll(),
      all: this.authorityService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ links, all }) => {
        this.allAuthorities.set(all);
        this.assigned.set(
          links.filter(l => l.role.roleId === this.roleId)
            .map(l => ({ authorityId: l.authority.authorityId, description: l.authority.description }))
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
      error: () => this.snackBar.open(this.translate.instant('roles.authorityAssignError'), '', { duration: 3000 }),
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
      error: () => this.snackBar.open(this.translate.instant('roles.authorityRemoveError'), '', { duration: 3000 }),
    });
  }

  goBack() {
    this.router.navigate(['/admin/roles']);
  }
}
