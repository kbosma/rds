import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BookerAuthService } from '../../core/auth/booker-auth.service';

@Component({
  selector: 'app-request-otp',
  standalone: true,
  imports: [
    FormsModule,
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
          <p class="instruction">{{ 'auth.instruction' | translate }}</p>
          @if (message()) {
            <div [class]="messageType() === 'success' ? 'success-banner' : 'error-banner'">
              <mat-icon>{{ messageType() === 'success' ? 'check_circle' : 'error_outline' }}</mat-icon>
              <span>{{ message() }}</span>
            </div>
          }
          <form (ngSubmit)="onRequestOtp()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.emailAddress' | translate }}</mat-label>
              <mat-icon matPrefix>email</mat-icon>
              <input matInput type="email" [(ngModel)]="emailaddress" name="emailaddress" required />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'auth.bookingNumber' | translate }}</mat-label>
              <mat-icon matPrefix>confirmation_number</mat-icon>
              <input matInput [(ngModel)]="bookingNumber" name="bookingNumber" required />
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading()">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <ng-container><mat-icon>send</mat-icon> {{ 'auth.requestCode' | translate }}</ng-container>
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #e3f2fd 0%, #f5f5f5 100%);
      padding: 16px;
    }
    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
      border-radius: 12px;
    }
    .login-header {
      text-align: center;
      margin-bottom: 16px;
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
    .instruction {
      text-align: center;
      color: #888;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .full-width { width: 100%; }
    mat-form-field { margin-bottom: 4px; }
    .success-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #e8f5e9;
      color: #2e7d32;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
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
    .success-banner mat-icon, .error-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .submit-btn {
      height: 48px;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.5px;
      margin-top: 8px;
    }
  `],
})
export class RequestOtpComponent {
  private authService = inject(BookerAuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  emailaddress = '';
  bookingNumber = '';
  loading = signal(false);
  message = signal('');
  messageType = signal<'success' | 'error'>('success');

  onRequestOtp() {
    this.loading.set(true);
    this.message.set('');
    this.authService
      .requestOtp(this.emailaddress, this.bookingNumber)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.message.set(this.translate.instant('auth.codeSent'));
          this.messageType.set('success');
          this.router.navigate(['/verify'], {
            queryParams: {
              email: this.emailaddress,
              booking: this.bookingNumber,
            },
          });
        },
        error: () => {
          this.loading.set(false);
          this.message.set(this.translate.instant('auth.codeSent'));
          this.messageType.set('success');
        },
      });
  }
}
