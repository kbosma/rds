import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="login-wrapper">
      <mat-card class="login-card">
        <div class="login-header">
          <h1 class="app-title">{{ 'app.title' | translate }}</h1>
          <p class="app-subtitle">{{ 'app.subtitle' | translate }}</p>
        </div>
        <mat-card-content>
          @if (error()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <span>{{ error() }}</span>
            </div>
          }

          @if (!auth.requiresTotp()) {
            <!-- Step 1: Username + Password -->
            <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'auth.username' | translate }}</mat-label>
                <mat-icon matPrefix>person</mat-icon>
                <input matInput formControlName="userName" autocomplete="username" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'auth.password' | translate }}</mat-label>
                <mat-icon matPrefix>lock</mat-icon>
                <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" autocomplete="current-password" />
                <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())" tabindex="-1">
                  <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" class="full-width login-btn" [disabled]="loading() || loginForm.invalid">
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>login</mat-icon> {{ 'auth.login' | translate }}</ng-container>
                }
              </button>
            </form>
          } @else {
            <!-- Step 2: TOTP Code -->
            @if (!showRecovery()) {
              <form [formGroup]="totpForm" (ngSubmit)="onTotpLogin()">
                <p class="totp-info">{{ 'auth.totpPrompt' | translate }}</p>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.totpCode' | translate }}</mat-label>
                  <mat-icon matPrefix>security</mat-icon>
                  <input matInput formControlName="totpCode" autocomplete="one-time-code" maxlength="6" />
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" class="full-width login-btn" [disabled]="loading() || totpForm.invalid">
                  @if (loading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>verified_user</mat-icon> {{ 'auth.verify' | translate }}</ng-container>
                  }
                </button>
              </form>
              <div class="totp-actions">
                <button mat-button (click)="showRecovery.set(true)">{{ 'auth.useRecoveryCode' | translate }}</button>
                <button mat-button (click)="onBack()">{{ 'common.back' | translate }}</button>
              </div>
            } @else {
              <!-- Recovery code input -->
              <form [formGroup]="recoveryForm" (ngSubmit)="onRecoveryLogin()">
                <p class="totp-info">{{ 'auth.recoveryPrompt' | translate }}</p>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>{{ 'auth.recoveryCode' | translate }}</mat-label>
                  <mat-icon matPrefix>vpn_key</mat-icon>
                  <input matInput formControlName="recoveryCode" autocomplete="off" />
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" class="full-width login-btn" [disabled]="loading() || recoveryForm.invalid">
                  @if (loading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>vpn_key</mat-icon> {{ 'auth.verify' | translate }}</ng-container>
                  }
                </button>
              </form>
              <div class="totp-actions">
                <button mat-button (click)="showRecovery.set(false)">{{ 'auth.useTotpCode' | translate }}</button>
                <button mat-button (click)="onBack()">{{ 'common.back' | translate }}</button>
              </div>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
    }
    .login-card {
      width: 420px;
      padding: 32px;
      border-radius: 12px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .app-title {
      font-size: 36px;
      font-weight: 700;
      color: #1976d2;
      margin: 0;
      letter-spacing: 2px;
    }
    .app-subtitle {
      color: #666;
      margin: 4px 0 0;
      font-size: 14px;
    }
    .full-width {
      width: 100%;
    }
    mat-form-field {
      margin-bottom: 4px;
    }
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
    .login-btn {
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 1px;
      margin-top: 8px;
    }
    .totp-info {
      color: #555;
      font-size: 14px;
      margin-bottom: 16px;
      text-align: center;
    }
    .totp-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
  `],
})
export class LoginComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  loginForm = this.fb.group({
    userName: ['', Validators.required],
    password: ['', Validators.required],
  });

  totpForm = this.fb.group({
    totpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  recoveryForm = this.fb.group({
    recoveryCode: ['', Validators.required],
  });

  hidePassword = signal(true);
  loading = signal(false);
  error = signal('');
  showRecovery = signal(false);

  onLogin() {
    this.loading.set(true);
    this.error.set('');
    const { userName, password } = this.loginForm.value;
    this.auth.login(userName!, password!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        if (!this.auth.requiresTotp()) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.message ?? err?.message ?? '';
        this.error.set(detail || this.translate.instant('auth.loginError'));
      },
    });
  }

  onTotpLogin() {
    this.loading.set(true);
    this.error.set('');
    const { totpCode } = this.totpForm.value;
    this.auth.loginWithTotp(totpCode!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.message ?? err?.message ?? '';
        this.error.set(detail || this.translate.instant('auth.totpError'));
      },
    });
  }

  onRecoveryLogin() {
    this.loading.set(true);
    this.error.set('');
    const { recoveryCode } = this.recoveryForm.value;
    this.auth.loginWithRecovery(recoveryCode!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.message ?? err?.message ?? '';
        this.error.set(detail || this.translate.instant('auth.recoveryError'));
      },
    });
  }

  onBack() {
    this.auth.resetTotpState();
    this.error.set('');
    this.showRecovery.set(false);
    this.totpForm.reset();
    this.recoveryForm.reset();
  }
}
