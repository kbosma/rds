import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BookerService } from '../bookers/booker.service';
import { Booker } from '../../shared/models';

/**
 * Registratie van een potentiële booker (PROSPECT). Een prospect is in het
 * datamodel een Booker met status PROSPECT; dit dialoog maakt die aan.
 */
@Component({
  selector: 'app-prospect-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'prospects.registerTitle' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.firstname' | translate }}</mat-label>
            <input matInput formControlName="firstname" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.prefix' | translate }}</mat-label>
            <input matInput formControlName="prefix" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'bookers.lastname' | translate }}</mat-label>
          <input matInput formControlName="lastname" />
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.callsign' | translate }}</mat-label>
            <input matInput formControlName="callsign" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.initials' | translate }}</mat-label>
            <input matInput formControlName="initials" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.telephone' | translate }}</mat-label>
          <input matInput formControlName="telephone" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.email' | translate }}</mat-label>
          <input matInput formControlName="emailaddress" type="email" />
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.gender' | translate }}</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="man">{{ 'bookers.genderMale' | translate }}</mat-option>
              <mat-option value="vrouw">{{ 'bookers.genderFemale' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'common.birthdate' | translate }}</mat-label>
            <input matInput formControlName="birthdate" type="date" />
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        <mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}
      </button>
      <button mat-raised-button color="primary"
              (click)="onSubmit()"
              [disabled]="saving() || form.invalid">
        @if (saving()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; }
    .flex-1 { flex: 1; }
  `],
})
export class ProspectDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProspectDialogComponent>);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private bookerService = inject(BookerService);
  private translate = inject(TranslateService);

  saving = signal(false);

  form = this.fb.group({
    firstname: ['', Validators.required],
    prefix: [''],
    lastname: ['', Validators.required],
    callsign: [''],
    initials: [''],
    telephone: [''],
    emailaddress: ['', [Validators.required, Validators.email]],
    gender: [''],
    birthdate: [''],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const payload: Partial<Booker> = {
      firstname: raw.firstname ?? undefined,
      prefix: raw.prefix ?? undefined,
      lastname: raw.lastname ?? undefined,
      callsign: raw.callsign ?? undefined,
      initials: raw.initials ?? undefined,
      telephone: raw.telephone ?? undefined,
      emailaddress: raw.emailaddress ?? undefined,
      gender: raw.gender ?? undefined,
      birthdate: raw.birthdate ?? undefined,
      status: 'prospect',
    };

    this.bookerService.create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('prospects.registered'), this.translate.instant('common.close'), { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('prospects.registerError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
