import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TravelerService } from './traveler.service';
import { Traveler } from '../../shared/models';

export interface TravelerDialogData {
  bookingId: string;
  traveler?: Traveler;
}

@Component({
  selector: 'app-traveler-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ (isNew() ? 'travelers.addTraveler' : 'travelers.editTraveler') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'travelers.firstname' | translate }}</mat-label>
          <input matInput formControlName="firstname" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'travelers.prefix' | translate }}</mat-label>
          <input matInput formControlName="prefix" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'travelers.lastname' | translate }}</mat-label>
          <input matInput formControlName="lastname" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'travelers.initials' | translate }}</mat-label>
          <input matInput formControlName="initials" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'travelers.gender' | translate }}</mat-label>
          <mat-select formControlName="gender">
            <mat-option value="M">{{ 'common.male' | translate }}</mat-option>
            <mat-option value="F">{{ 'common.female' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'travelers.birthdate' | translate }}</mat-label>
          <input matInput formControlName="birthdate" type="date" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || saving()" (click)="save()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } form { display: flex; flex-direction: column; gap: 4px; min-width: 350px; }`],
})
export class TravelerDialogComponent implements OnInit {
  data = inject<TravelerDialogData>(MAT_DIALOG_DATA);
  private travelerService = inject(TravelerService);
  private dialogRef = inject(MatDialogRef<TravelerDialogComponent>);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  isNew = signal(true);
  saving = signal(false);

  form = this.fb.group({
    firstname: ['', Validators.required],
    prefix: [''],
    lastname: ['', Validators.required],
    initials: [''],
    gender: [''],
    birthdate: [''],
  });

  ngOnInit() {
    if (this.data.traveler) {
      this.isNew.set(false);
      this.form.patchValue(this.data.traveler);
    }
  }

  save() {
    this.saving.set(true);
    const v = this.form.value;
    const value: Partial<Traveler> = {
      bookingId: this.data.bookingId,
      firstname: v.firstname ?? undefined,
      prefix: v.prefix ?? undefined,
      lastname: v.lastname ?? undefined,
      initials: v.initials ?? undefined,
      gender: v.gender ?? undefined,
      birthdate: v.birthdate ?? undefined,
    };
    const op = this.data.traveler
      ? this.travelerService.update(this.data.traveler.travelerId, value)
      : this.travelerService.create(value);
    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('common.saved'), '', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('common.saveError'), '', { duration: 3000 });
      },
    });
  }
}
