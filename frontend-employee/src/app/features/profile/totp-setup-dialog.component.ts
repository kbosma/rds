import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { TotpSetupResponse } from '../../shared/models';

@Component({
  selector: 'app-totp-setup-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'totp.setupTitle' | translate }}</h2>
    <mat-dialog-content>
      @if (error()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
        </div>
      }
      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (setupData()) {
        @if (!verified()) {
          <div class="setup-steps">
            <p>{{ 'totp.scanQrCode' | translate }}</p>
            <div class="qr-container">
              <img [src]="setupData()!.qrCodeDataUri" alt="QR Code" class="qr-code" />
            </div>
            <p class="manual-key-label">{{ 'totp.manualKey' | translate }}</p>
            <code class="manual-key">{{ setupData()!.manualEntryKey }}</code>

            <form [formGroup]="verifyForm" (ngSubmit)="onVerify()" class="verify-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'totp.verificationCode' | translate }}</mat-label>
                <input matInput formControlName="totpCode" maxlength="6" autocomplete="one-time-code" />
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="verifying() || verifyForm.invalid">
                @if (verifying()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  {{ 'totp.activate' | translate }}
                }
              </button>
            </form>
          </div>
        } @else {
          <div class="recovery-codes">
            <p class="recovery-warning">
              <mat-icon>warning</mat-icon>
              {{ 'totp.saveRecoveryCodes' | translate }}
            </p>
            <div class="codes-grid">
              @for (code of setupData()!.recoveryCodes; track code) {
                <code class="recovery-code">{{ code }}</code>
              }
            </div>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (verified()) {
        <button mat-raised-button color="primary" (click)="dialogRef.close(true)">{{ 'common.close' | translate }}</button>
      } @else {
        <button mat-button (click)="dialogRef.close(false)">{{ 'common.cancel' | translate }}</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #ffebee;
      color: #c62828;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .error-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .loading-container {
      display: flex;
      justify-content: center;
      padding: 32px;
    }
    .qr-container {
      display: flex;
      justify-content: center;
      margin: 16px 0;
    }
    .qr-code {
      width: 250px;
      height: 250px;
    }
    .manual-key-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 4px;
    }
    .manual-key {
      display: block;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 14px;
      letter-spacing: 2px;
      word-break: break-all;
      margin-bottom: 16px;
    }
    .verify-form {
      margin-top: 16px;
    }
    .full-width {
      width: 100%;
    }
    .error-text {
      color: #c62828;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .recovery-warning {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e65100;
      font-weight: 500;
      margin-bottom: 16px;
    }
    .codes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .recovery-code {
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 14px;
      letter-spacing: 1px;
      text-align: center;
    }
  `],
})
export class TotpSetupDialogComponent {
  dialogRef = inject(MatDialogRef<TotpSetupDialogComponent>);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  verifyForm = this.fb.group({
    totpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  loading = signal(true);
  verifying = signal(false);
  verified = signal(false);
  error = signal('');
  setupData = signal<TotpSetupResponse | null>(null);

  constructor() {
    this.auth.setupTotp().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.setupData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.message ?? err?.message ?? '';
        this.error.set(detail || 'Failed to generate TOTP setup');
      },
    });
  }

  onVerify() {
    this.verifying.set(true);
    this.error.set('');
    const { totpCode } = this.verifyForm.value;
    this.auth.verifyTotp(totpCode!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.verifying.set(false);
        this.verified.set(true);
      },
      error: () => {
        this.verifying.set(false);
        this.error.set('Invalid code. Please try again.');
      },
    });
  }
}
