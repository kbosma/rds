import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookerService } from './booker.service';
import { Booker } from '../../shared/models';

export interface BookerDialogData {
  booker?: Booker;
  readOnly: boolean;
}

@Component({
  selector: 'app-booker-dialog',
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
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.readOnly ? 'bookers.viewTitle' : 'bookers.editTitle') | translate }}</h2>
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
              <mat-option value="MAN">{{ 'bookers.genderMale' | translate }}</mat-option>
              <mat-option value="VROUW">{{ 'bookers.genderFemale' | translate }}</mat-option>
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
        <mat-icon>close</mat-icon> {{ (data.readOnly ? 'common.close' : 'common.cancel') | translate }}
      </button>
      @if (!data.readOnly) {
        <button mat-raised-button color="primary"
                (click)="onSubmit()"
                [disabled]="saving() || form.invalid">
          @if (saving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row {
      display: flex;
      gap: 16px;
    }
    .flex-1 { flex: 1; }
  `],
})
export class BookerDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<BookerDialogComponent>);
  data: BookerDialogData = inject(MAT_DIALOG_DATA);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private bookerService = inject(BookerService);
  private translate = inject(TranslateService);

  saving = signal(false);

  form = this.fb.group({
    firstname: [this.data.booker?.firstname ?? '', Validators.required],
    prefix: [this.data.booker?.prefix ?? ''],
    lastname: [this.data.booker?.lastname ?? '', Validators.required],
    callsign: [this.data.booker?.callsign ?? ''],
    initials: [this.data.booker?.initials ?? ''],
    telephone: [this.data.booker?.telephone ?? ''],
    emailaddress: [this.data.booker?.emailaddress ?? '', [Validators.required, Validators.email]],
    gender: [this.data.booker?.gender ?? ''],
    birthdate: [this.data.booker?.birthdate ?? ''],
  });

  ngOnInit() {
    if (this.data.readOnly) {
      this.form.disable();
    }
  }

  onSubmit() {
    if (this.form.invalid || !this.data.booker) return;
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
    };

    this.bookerService.update(this.data.booker.bookerId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookers.saved'), this.translate.instant('common.close'), { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookers.saveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
