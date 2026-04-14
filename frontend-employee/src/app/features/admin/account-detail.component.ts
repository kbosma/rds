import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { AccountService } from './account.service';
import { PersonService } from './person.service';
import { AccountRoleService } from './account-role.service';
import { RoleService } from './role.service';
import { AuthService } from '../../core/auth/auth.service';
import { Account, Person, AccountRole, Role } from '../../shared/models';

interface PersonOption {
  persoonId: string;
  displayName: string;
}

@Component({
  selector: 'app-account-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <a routerLink="/admin/accounts" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'accounts.backToAccounts' | translate }}
    </a>

    <h1 class="page-title">
      {{ isNew() ? ('accounts.newTitle' | translate) : ('accounts.editTitle' | translate) + ' — ' + currentName() }}
    </h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <mat-card class="detail-card">
        <mat-card-header>
          <mat-card-title>{{ 'common.details' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="onSave()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'accounts.username' | translate }}</mat-label>
              <input matInput formControlName="userName" />
            </mat-form-field>

            @if (isNew()) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'auth.password' | translate }}</mat-label>
                <input matInput type="password" formControlName="password" />
              </mat-form-field>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'accounts.person' | translate }}</mat-label>
              <mat-select formControlName="personId">
                @for (person of personOptions(); track person.persoonId) {
                  <mat-option [value]="person.persoonId">{{ person.displayName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="checkbox-row">
              <mat-checkbox formControlName="locked">{{ 'accounts.locked' | translate }}</mat-checkbox>
              <mat-checkbox formControlName="mustChangePassword">{{ 'onboarding.mustChangePassword' | translate }}</mat-checkbox>
            </div>

            <div class="actions">
              <a mat-button routerLink="/admin/accounts"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</a>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="saving() || form.invalid">
                @if (saving()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (!isNew()) {
        <mat-card class="detail-card sub-card">
          <mat-card-header>
            <mat-card-title>{{ 'roles.title' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Add role -->
            @if (availableRoles().length > 0) {
              <div class="add-junction-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>{{ 'accounts.addRole' | translate }}</mat-label>
                  <mat-select [(value)]="selectedRoleId">
                    @for (role of availableRoles(); track role.roleId) {
                      <mat-option [value]="role.roleId">{{ role.description }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-raised-button color="primary" (click)="addRole()"
                        [disabled]="!selectedRoleId || addingRole()">
                  @if (addingRole()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>add</mat-icon> {{ 'common.add' | translate }}</ng-container>
                  }
                </button>
              </div>
            }

            <!-- Assigned roles -->
            @if (assignedRoles().length > 0) {
              @for (ar of assignedRoles(); track ar.role.roleId) {
                <div class="sub-item">
                  <div class="sub-item-info">
                    <mat-icon>security</mat-icon>
                    <span>{{ ar.role.description }}</span>
                  </div>
                  <button mat-icon-button color="warn" (click)="removeRole(ar)">
                    <mat-icon>remove_circle</mat-icon>
                  </button>
                </div>
              }
            } @else {
              <p class="empty-text">{{ 'accounts.noRolesAssigned' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
      font-size: 22px;
      font-weight: 500;
      margin: 8px 0 24px;
    }
    .detail-card {
      border-radius: 12px;
      max-width: 700px;
    }
    .sub-card {
      margin-top: 24px;
    }
    .full-width { width: 100%; }
    .checkbox-row {
      display: flex;
      gap: 24px;
      margin: 8px 0 16px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .add-junction-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .flex-1 { flex: 1; }
    .sub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .sub-item-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
  `],
})
export class AccountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private accountService = inject(AccountService);
  private personService = inject(PersonService);
  private accountRoleService = inject(AccountRoleService);
  private roleService = inject(RoleService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  isNew = signal(true);
  loading = signal(false);
  saving = signal(false);
  addingRole = signal(false);
  currentName = signal('');
  personOptions = signal<PersonOption[]>([]);
  assignedRoles = signal<AccountRole[]>([]);
  allRoles = signal<Role[]>([]);
  availableRoles = signal<Role[]>([]);

  selectedRoleId: string | null = null;

  private accountId: string | null = null;

  form = this.fb.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
    personId: ['', Validators.required],
    locked: [false],
    mustChangePassword: [false],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.accountId = id;
      this.form.get('password')!.clearValidators();
      this.form.get('password')!.updateValueAndValidity();
      this.loading.set(true);
      this.loadAccount(id);
    } else {
      this.loading.set(true);
      this.personService.getAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (persons) => {
            this.personOptions.set(this.mapPersonOptions(persons));
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
    }
  }

  private mapPersonOptions(persons: Person[]): PersonOption[] {
    return persons.map(p => ({
      persoonId: p.persoonId,
      displayName: `${p.firstname} ${p.prefix ? p.prefix + ' ' : ''}${p.lastname}`,
    }));
  }

  private loadAccount(id: string) {
    forkJoin({
      account: this.accountService.getById(id),
      persons: this.personService.getAll(),
      accountRoles: this.accountRoleService.getAll(),
      roles: this.roleService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ account, persons, accountRoles, roles }) => {
        this.currentName.set(account.userName);
        this.personOptions.set(this.mapPersonOptions(persons));
        this.allRoles.set(roles);

        const assigned = accountRoles.filter(ar => ar.account.accountId === id);
        this.assignedRoles.set(assigned);
        this.updateAvailableRoles(assigned, roles);

        this.form.patchValue({
          userName: account.userName,
          personId: account.personId,
          locked: account.locked,
          mustChangePassword: account.mustChangePassword,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('accounts.notFound'), this.translate.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/admin/accounts']);
      },
    });
  }

  private updateAvailableRoles(assigned: AccountRole[], allRoles: Role[]) {
    const assignedIds = new Set(assigned.map(ar => ar.role.roleId));
    this.availableRoles.set(allRoles.filter(r => !assignedIds.has(r.roleId)));
  }

  onSave() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const { userName, password, personId, locked, mustChangePassword } = this.form.value;
    const payload: Record<string, unknown> = {
      userName: userName!,
      personId: personId!,
      locked: locked!,
      mustChangePassword: mustChangePassword!,
    };
    if (this.isNew() && password) {
      payload['password'] = password;
    }

    if (this.isNew()) {
      this.accountService.create(payload as Partial<Account>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (account) => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('accounts.created'), this.translate.instant('common.close'), { duration: 3000 });
            this.router.navigate(['/admin/accounts', account.accountId]);
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('accounts.createError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    } else {
      this.accountService.update(this.accountId!, payload as Partial<Account>)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.currentName.set(userName!);
            this.snackBar.open(this.translate.instant('accounts.saved'), this.translate.instant('common.close'), { duration: 3000 });
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('accounts.saveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    }
  }

  addRole() {
    if (!this.selectedRoleId || !this.accountId) return;
    this.addingRole.set(true);

    this.accountRoleService.create(this.accountId, this.selectedRoleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ar) => {
          this.addingRole.set(false);
          const updated = [...this.assignedRoles(), ar];
          this.assignedRoles.set(updated);
          this.updateAvailableRoles(updated, this.allRoles());
          this.selectedRoleId = null;
          this.snackBar.open(this.translate.instant('accounts.roleAssigned'), this.translate.instant('common.close'), { duration: 3000 });
        },
        error: () => {
          this.addingRole.set(false);
          this.snackBar.open(this.translate.instant('accounts.roleAssignError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  removeRole(ar: AccountRole) {
    if (!this.accountId) return;
    if (!confirm(this.translate.instant('accounts.removeRoleConfirm', { role: ar.role.description }))) return;

    this.accountRoleService.delete(this.accountId, ar.role.roleId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const updated = this.assignedRoles().filter(r => r.role.roleId !== ar.role.roleId);
          this.assignedRoles.set(updated);
          this.updateAvailableRoles(updated, this.allRoles());
          this.snackBar.open(this.translate.instant('accounts.roleRemoved'), this.translate.instant('common.close'), { duration: 3000 });
        },
        error: () => {
          this.snackBar.open(this.translate.instant('accounts.roleRemoveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
