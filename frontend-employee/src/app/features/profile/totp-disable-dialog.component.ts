import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-totp-disable-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'totp.disableTitle' | translate }}</h2>
    <mat-dialog-content>
      <p>{{ 'totp.disablePrompt' | translate }}</p>
      <form [formGroup]="form" (ngSubmit)="onDisable()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'totp.verificationCode' | translate }}</mat-label>
          <input matInput formControlName="totpCode" maxlength="6" autocomplete="one-time-code" />
        </mat-form-field>
        @if (error()) {
          <p class="error-text">{{ error() }}</p>
        }
        <button mat-raised-button color="warn" type="submit" class="full-width" [disabled]="loading() || form.invalid">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            {{ 'totp.deactivate' | translate }}
          }
        </button>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">{{ 'common.cancel' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .error-text { color: #c62828; font-size: 13px; margin-bottom: 8px; }
  `],
})
export class TotpDisableDialogComponent {
  dialogRef = inject(MatDialogRef<TotpDisableDialogComponent>);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  form = this.fb.group({
    totpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  loading = signal(false);
  error = signal('');

  onDisable() {
    this.loading.set(true);
    this.error.set('');
    const { totpCode } = this.form.value;
    this.auth.disableTotp(totpCode!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Invalid code. Please try again.');
      },
    });
  }
}
