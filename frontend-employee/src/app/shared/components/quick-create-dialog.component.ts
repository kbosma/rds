import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

export interface QuickCreateDialogData {
  /** Vertaalsleutel van de titel, bv. `accommodations.newTitle`. */
  titleKey: string;
}

export interface QuickCreateResult {
  key: string;
  name: string;
}

/**
 * Klein dialoog om vanuit een keuzelijst snel een record met alleen code en naam aan te maken
 * (accommodatie, leverancier). Het dialoog doet zelf geen API-call: het sluit met `{key, name}` en de
 * aanroeper maakt het record aan. Verdere gegevens (adressen e.d.) vul je later op de detailpagina in.
 */
@Component({
  selector: 'app-quick-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.titleKey | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.name' | translate }}</mat-label>
          <input matInput formControlName="name" maxlength="255" cdkFocusInitial />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.code' | translate }}</mat-label>
          <input matInput formControlName="key" maxlength="255" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" class="cancel-btn" mat-dialog-close><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" type="button" class="create-btn" [disabled]="form.invalid" (click)="submit()">
        <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`],
})
export class QuickCreateDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<QuickCreateDialogComponent, QuickCreateResult>);
  data: QuickCreateDialogData = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    key: ['', [Validators.required, Validators.maxLength(255)]],
  });

  submit() {
    if (this.form.invalid) return;
    const { key, name } = this.form.getRawValue();
    this.dialogRef.close({ key: key!.trim(), name: name!.trim() });
  }
}
