import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h1>{{ 'profile.changePasswordTitle' | translate }}</h1>
    <mat-card>
      <mat-card-content>
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
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || mismatch">
            {{ 'common.save' | translate }}
          </button>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-card { max-width: 500px; }
    form { display: flex; flex-direction: column; gap: 8px; }
    .error { color: #f44336; font-size: 13px; margin: 0; }
  `],
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

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
        this.form.reset();
        this.snackBar.open(this.translate.instant('profile.passwordChanged'), '', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open(this.translate.instant('profile.passwordError'), '', { duration: 3000 });
      },
    });
  }
}
