import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'profile.changePasswordTitle' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'profile.currentPassword' | translate }}</mat-label>
          <input matInput type="password" formControlName="currentPassword" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'profile.newPassword' | translate }}</mat-label>
          <input matInput type="password" formControlName="newPassword" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'profile.confirmPassword' | translate }}</mat-label>
          <input matInput type="password" formControlName="confirmPassword" />
        </mat-form-field>
        @if (mismatch) {
          <p class="error">{{ 'profile.passwordMismatch' | translate }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [disabled]="form.invalid || mismatch" (click)="save()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    form { display: flex; flex-direction: column; gap: 8px; min-width: 350px; }
    .error { color: #f44336; font-size: 13px; margin: 0; }
  `],
})
export class ChangePasswordDialogComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  get mismatch(): boolean {
    return this.form.value.newPassword !== this.form.value.confirmPassword
      && !!this.form.value.confirmPassword;
  }

  save() {
    if (this.form.invalid || this.mismatch) return;
    const { currentPassword, newPassword } = this.form.value;
    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('profile.passwordChanged'), '', { duration: 3000 });
        this.dialogRef.close();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('profile.passwordError'), '', { duration: 3000 });
      },
    });
  }
}
