import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OrganizationService } from './organization.service';
import { PersonService } from './person.service';
import { AccountService } from './account.service';
import { AccountRoleService } from './account-role.service';
import { RoleService } from './role.service';
import { Role } from '../../shared/models';

@Component({
  selector: 'app-organization-onboarding',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'onboarding.title' | translate }}</h1>
    </div>

    <mat-stepper #stepper linear class="onboarding-stepper">
      <!-- Step 1: Organization -->
      <mat-step [stepControl]="orgForm" [label]="'onboarding.stepOrganization' | translate">
        <form [formGroup]="orgForm" class="step-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.organizationName' | translate }}</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>

          <div class="step-actions">
            <button mat-raised-button color="primary" (click)="createOrganization(stepper)"
                    [disabled]="orgForm.invalid || saving()">
              @if (saving()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'onboarding.next' | translate }}
              }
            </button>
          </div>
        </form>
      </mat-step>

      <!-- Step 2: Person -->
      <mat-step [stepControl]="personForm" [label]="'onboarding.stepPerson' | translate">
        <form [formGroup]="personForm" class="step-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.firstname' | translate }}</mat-label>
            <input matInput formControlName="firstname" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.prefix' | translate }}</mat-label>
            <input matInput formControlName="prefix" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.lastname' | translate }}</mat-label>
            <input matInput formControlName="lastname" />
          </mat-form-field>

          <div class="step-actions">
            <button mat-button matStepperPrevious>{{ 'onboarding.previous' | translate }}</button>
            <button mat-raised-button color="primary" (click)="createPerson(stepper)"
                    [disabled]="personForm.invalid || saving()">
              @if (saving()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'onboarding.next' | translate }}
              }
            </button>
          </div>
        </form>
      </mat-step>

      <!-- Step 3: Account -->
      <mat-step [stepControl]="accountForm" [label]="'onboarding.stepAccount' | translate">
        <form [formGroup]="accountForm" class="step-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.username' | translate }}</mat-label>
            <input matInput formControlName="userName" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.password' | translate }}</mat-label>
            <input matInput formControlName="password" type="password" />
          </mat-form-field>

          <mat-checkbox formControlName="mustChangePassword" class="checkbox-field">
            {{ 'onboarding.mustChangePassword' | translate }}
          </mat-checkbox>

          <div class="step-actions">
            <button mat-button matStepperPrevious>{{ 'onboarding.previous' | translate }}</button>
            <button mat-raised-button color="primary" (click)="createAccount(stepper)"
                    [disabled]="accountForm.invalid || saving()">
              @if (saving()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'onboarding.next' | translate }}
              }
            </button>
          </div>
        </form>
      </mat-step>

      <!-- Step 4: Role -->
      <mat-step [stepControl]="roleForm" [label]="'onboarding.stepRole' | translate">
        <form [formGroup]="roleForm" class="step-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'onboarding.role' | translate }}</mat-label>
            <mat-select formControlName="roleId">
              @for (role of availableRoles(); track role.roleId) {
                <mat-option [value]="role.roleId">{{ role.description }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (createdOrganizationName()) {
            <mat-card class="summary-card">
              <mat-card-header>
                <mat-card-title>{{ 'onboarding.summary' | translate }}</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="summary-row">
                  <strong>{{ 'onboarding.summaryOrganization' | translate }}:</strong>
                  <span>{{ createdOrganizationName() }}</span>
                </div>
                <div class="summary-row">
                  <strong>{{ 'onboarding.summaryPerson' | translate }}:</strong>
                  <span>{{ createdPersonName() }}</span>
                </div>
                <div class="summary-row">
                  <strong>{{ 'onboarding.summaryAccount' | translate }}:</strong>
                  <span>{{ createdAccountName() }}</span>
                </div>
                @if (selectedRoleName()) {
                  <div class="summary-row">
                    <strong>{{ 'onboarding.summaryRole' | translate }}:</strong>
                    <span>{{ selectedRoleName() }}</span>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }

          <div class="step-actions">
            <button mat-button matStepperPrevious>{{ 'onboarding.previous' | translate }}</button>
            <button mat-raised-button color="primary" (click)="assignRoleAndFinish()"
                    [disabled]="roleForm.invalid || saving()">
              @if (saving()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                {{ 'onboarding.finish' | translate }}
              }
            </button>
          </div>
        </form>
      </mat-step>
    </mat-stepper>
  `,
  styles: [`
    .header {
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .onboarding-stepper {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .step-form {
      display: flex;
      flex-direction: column;
      max-width: 500px;
      padding-top: 16px;
    }
    .full-width {
      width: 100%;
    }
    .checkbox-field {
      margin-bottom: 16px;
    }
    .step-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .summary-card {
      margin: 16px 0;
    }
    .summary-row {
      display: flex;
      gap: 8px;
      padding: 4px 0;
    }
    .summary-row strong {
      min-width: 120px;
    }
  `],
})
export class OrganizationOnboardingComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private organizationService = inject(OrganizationService);
  private personService = inject(PersonService);
  private accountService = inject(AccountService);
  private accountRoleService = inject(AccountRoleService);
  private roleService = inject(RoleService);

  saving = signal(false);
  availableRoles = signal<Role[]>([]);

  private createdOrganizationId = '';
  private createdPersonId = '';
  private createdAccountId = '';

  createdOrganizationName = signal('');
  createdPersonName = signal('');
  createdAccountName = signal('');
  selectedRoleName = signal('');

  orgForm = this.fb.group({
    name: ['', Validators.required],
  });

  personForm = this.fb.group({
    firstname: ['', Validators.required],
    prefix: [''],
    lastname: ['', Validators.required],
  });

  accountForm = this.fb.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
    mustChangePassword: [true],
  });

  roleForm = this.fb.group({
    roleId: ['', Validators.required],
  });

  constructor() {
    this.loadRoles();

    this.roleForm.get('roleId')!.valueChanges.subscribe(roleId => {
      const role = this.availableRoles().find(r => r.roleId === roleId);
      this.selectedRoleName.set(role?.description || '');
    });
  }

  private loadRoles() {
    this.roleService.getAll().subscribe({
      next: (roles) => {
        this.availableRoles.set(roles.filter(r => r.description !== 'ADMIN'));
      },
    });
  }

  createOrganization(stepper: any) {
    if (this.orgForm.invalid) return;
    this.saving.set(true);

    this.organizationService.create(this.orgForm.value as any).subscribe({
      next: (org) => {
        this.createdOrganizationId = org.organizationId;
        this.createdOrganizationName.set(org.name);
        this.snackBar.open(this.translate.instant('onboarding.organizationCreated'), '', { duration: 3000 });
        this.saving.set(false);
        stepper.next();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('onboarding.createError'), '', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  createPerson(stepper: any) {
    if (this.personForm.invalid) return;
    this.saving.set(true);

    const personData = {
      ...this.personForm.value,
      organizationId: this.createdOrganizationId,
    };

    this.personService.create(personData as any).subscribe({
      next: (person) => {
        this.createdPersonId = person.persoonId;
        const prefix = person.prefix ? person.prefix + ' ' : '';
        this.createdPersonName.set(`${person.firstname} ${prefix}${person.lastname}`);
        this.snackBar.open(this.translate.instant('onboarding.personCreated'), '', { duration: 3000 });
        this.saving.set(false);
        stepper.next();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('onboarding.createError'), '', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  createAccount(stepper: any) {
    if (this.accountForm.invalid) return;
    this.saving.set(true);

    const accountData = {
      ...this.accountForm.value,
      personId: this.createdPersonId,
    };

    this.accountService.create(accountData as any).subscribe({
      next: (account) => {
        this.createdAccountId = account.accountId;
        this.createdAccountName.set(account.userName);
        this.snackBar.open(this.translate.instant('onboarding.accountCreated'), '', { duration: 3000 });
        this.saving.set(false);
        stepper.next();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('onboarding.createError'), '', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }

  assignRoleAndFinish() {
    if (this.roleForm.invalid) return;
    this.saving.set(true);

    const roleId = this.roleForm.value.roleId!;

    this.accountRoleService.create(this.createdAccountId, roleId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('onboarding.completed'), '', { duration: 5000 });
        this.saving.set(false);
        this.router.navigate(['/admin/organizations']);
      },
      error: () => {
        this.snackBar.open(this.translate.instant('onboarding.createError'), '', { duration: 3000 });
        this.saving.set(false);
      },
    });
  }
}
