import { Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { TotpSetupDialogComponent } from './totp-setup-dialog.component';
import { TotpDisableDialogComponent } from './totp-disable-dialog.component';
import { environment } from '../../../environments/environment';
import { Account } from '../../shared/models';

@Component({
  selector: 'app-totp-settings',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>{{ 'totp.settingsTitle' | translate }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="status-row">
          <span class="status-label">{{ 'totp.status' | translate }}:</span>
          @if (totpEnabled()) {
            <span class="status-badge enabled">
              <mat-icon>verified_user</mat-icon>
              {{ 'totp.enabled' | translate }}
            </span>
          } @else {
            <span class="status-badge disabled">
              <mat-icon>shield</mat-icon>
              {{ 'totp.disabled' | translate }}
            </span>
          }
        </div>
      </mat-card-content>
      <mat-card-actions>
        @if (totpEnabled()) {
          <button mat-raised-button color="warn" (click)="onDisable()">
            <mat-icon>lock_open</mat-icon>
            {{ 'totp.deactivate' | translate }}
          </button>
        } @else {
          <button mat-raised-button color="primary" (click)="onSetup()">
            <mat-icon>security</mat-icon>
            {{ 'totp.activate' | translate }}
          </button>
        }
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    mat-card {
      max-width: 500px;
    }
    .status-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
    }
    .status-label {
      font-weight: 500;
      font-size: 15px;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
    }
    .status-badge.enabled {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .status-badge.disabled {
      background: #fff3e0;
      color: #e65100;
    }
    .status-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `],
})
export class TotpSettingsComponent implements OnInit {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  totpEnabled = signal(false);

  ngOnInit() {
    this.loadStatus();
  }

  onSetup() {
    const dialogRef = this.dialog.open(TotpSetupDialogComponent, {
      width: '480px',
      disableClose: true,
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.loadStatus();
      }
    });
  }

  onDisable() {
    const dialogRef = this.dialog.open(TotpDisableDialogComponent, {
      width: '400px',
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.loadStatus();
      }
    });
  }

  private loadStatus() {
    const user = this.auth.currentUser();
    if (!user) return;
    this.http.get<Account>(`${environment.apiUrl}/accounts/${user.accountId}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((account) => {
        this.totpEnabled.set(account.totpEnabled);
      });
  }
}
