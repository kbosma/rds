import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { PersonService } from './person.service';
import { OrganizationService } from './organization.service';
import { AccountService } from './account.service';
import { AuthService } from '../../core/auth/auth.service';
import { Person, Organization, Account } from '../../shared/models';

@Component({
  selector: 'app-person-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <a routerLink="/admin/persons" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'persons.backToPersons' | translate }}
    </a>

    <h1 class="page-title">
      {{ isNew() ? ('persons.newTitle' | translate) : ('persons.editTitle' | translate) + ' — ' + currentName() }}
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
            <div class="row">
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>{{ 'persons.firstname' | translate }}</mat-label>
                <input matInput formControlName="firstname" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>{{ 'persons.prefix' | translate }}</mat-label>
                <input matInput formControlName="prefix" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-2">
                <mat-label>{{ 'persons.lastname' | translate }}</mat-label>
                <input matInput formControlName="lastname" />
              </mat-form-field>
            </div>

            @if (isAdmin) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'persons.organization' | translate }}</mat-label>
                <mat-select formControlName="organizationId">
                  @for (org of organizations(); track org.organizationId) {
                    <mat-option [value]="org.organizationId">{{ org.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <div class="actions">
              <a mat-button routerLink="/admin/persons"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</a>
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
            <mat-card-title>{{ 'accounts.title' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (accounts().length > 0) {
              @for (account of accounts(); track account.accountId) {
                <div class="sub-item" (click)="navigateToAccount(account)">
                  <div class="sub-item-info">
                    <mat-icon>account_circle</mat-icon>
                    <span>{{ account.userName }}</span>
                    <span class="status-badge" [class.status-active]="!account.locked" [class.status-locked]="account.locked">
                      {{ account.locked ? ('accounts.locked' | translate) : ('accounts.active' | translate) }}
                    </span>
                  </div>
                  <mat-icon class="sub-item-arrow">chevron_right</mat-icon>
                </div>
              }
            } @else {
              <p class="empty-text">{{ 'persons.noAccountsLinked' | translate }}</p>
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
    .row {
      display: flex;
      gap: 16px;
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
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
    .sub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .sub-item:hover {
      background-color: #f5f5f5;
    }
    .sub-item-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sub-item-arrow {
      color: #999;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-active {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .status-locked {
      background-color: #ffebee;
      color: #c62828;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
  `],
})
export class PersonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private personService = inject(PersonService);
  private organizationService = inject(OrganizationService);
  private accountService = inject(AccountService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  isAdmin = this.authService.hasRole('ADMIN');

  isNew = signal(true);
  loading = signal(false);
  saving = signal(false);
  currentName = signal('');
  organizations = signal<Organization[]>([]);
  accounts = signal<Account[]>([]);

  private personId: string | null = null;

  form = this.fb.group({
    firstname: ['', Validators.required],
    prefix: [''],
    lastname: ['', Validators.required],
    organizationId: ['', Validators.required],
  });

  ngOnInit() {
    // MANAGER: auto-set organizationId to own org
    if (!this.isAdmin) {
      const orgId = this.authService.currentUser()?.organizationId || '';
      this.form.patchValue({ organizationId: orgId });
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.personId = id;
      this.loading.set(true);
      this.loadPerson(id);
    } else if (this.isAdmin) {
      this.loading.set(true);
      this.organizationService.getAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (orgs) => {
            this.organizations.set(orgs);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
    }
  }

  private loadPerson(id: string) {
    const sources: Record<string, ReturnType<typeof this.personService.getById>> = {
      person: this.personService.getById(id),
      accounts: this.accountService.getAll() as any,
    };
    if (this.isAdmin) {
      sources['organizations'] = this.organizationService.getAll() as any;
    }

    forkJoin(sources).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result: any) => {
        const person: Person = result.person;
        const accounts: Account[] = result.accounts;
        const name = `${person.firstname} ${person.prefix ? person.prefix + ' ' : ''}${person.lastname}`;
        this.currentName.set(name);
        if (this.isAdmin && result.organizations) {
          this.organizations.set(result.organizations);
        }
        this.accounts.set(accounts.filter(a => a.personId === id));
        this.form.patchValue({
          firstname: person.firstname,
          prefix: person.prefix || '',
          lastname: person.lastname,
          organizationId: person.organizationId,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('persons.notFound'), this.translate.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/admin/persons']);
      },
    });
  }

  onSave() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const { firstname, prefix, lastname, organizationId } = this.form.value;
    const payload: Partial<Person> = {
      firstname: firstname!,
      prefix: prefix || '',
      lastname: lastname!,
      organizationId: organizationId!,
    };

    if (this.isNew()) {
      this.personService.create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('persons.created'), this.translate.instant('common.close'), { duration: 3000 });
            this.router.navigate(['/admin/persons']);
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('persons.createError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    } else {
      this.personService.update(this.personId!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            const name = `${firstname} ${prefix ? prefix + ' ' : ''}${lastname}`;
            this.currentName.set(name);
            this.snackBar.open(this.translate.instant('persons.saved'), this.translate.instant('common.close'), { duration: 3000 });
          },
          error: () => {
            this.saving.set(false);
            this.snackBar.open(this.translate.instant('persons.saveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    }
  }

  navigateToAccount(account: Account) {
    this.router.navigate(['/admin/accounts', account.accountId]);
  }
}
