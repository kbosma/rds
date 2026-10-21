import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SentEmail } from '../../shared/models';
import { SentEmailService } from './sent-email.service';

export interface SentEmailViewDialogData {
  email: SentEmail;
  canResend: boolean;
}

/**
 * Alleen-lezen weergave van een verzonden e-mail zoals hij verstuurd is. Opnieuw versturen stuurt dezelfde inhoud
 * naar hetzelfde adres en sluit het dialoog met `true`, zodat de aanroeper de tijdlijn herlaadt.
 */
@Component({
  selector: 'app-sent-email-view-dialog',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.email.subject }}</h2>
    <mat-dialog-content>
      <dl class="meta">
        <dt>{{ 'messages.from' | translate }}</dt><dd>{{ data.email.fromAddress }}</dd>
        <dt>{{ 'messages.to' | translate }}</dt><dd>{{ data.email.toAddress }}</dd>
        <dt>{{ 'messages.sentOn' | translate }}</dt><dd>{{ data.email.createdAt | date:'dd-MM-yyyy HH:mm' }}</dd>
        <dt>{{ 'messages.sentBy' | translate }}</dt><dd>{{ data.email.createdByName || ('messages.unknown' | translate) }}</dd>
      </dl>
      <iframe class="body" sandbox="" [srcdoc]="body"></iframe>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.canResend) {
        <button mat-stroked-button class="act-send resend-btn" (click)="resend()" [disabled]="sending()">
          <mat-icon>forward_to_inbox</mat-icon> {{ 'messages.resend' | translate }}
        </button>
      }
      <button mat-button mat-dialog-close>{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .meta { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 12px; }
    .meta dt { color: var(--ui-text-muted); }
    .meta dd { margin: 0; }
    .body { width: 100%; height: 320px; border: 1px solid var(--ui-line); border-radius: 8px; background: #fff; }
  `],
})
export class SentEmailViewDialogComponent {
  data: SentEmailViewDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<SentEmailViewDialogComponent>);
  private sentEmailService = inject(SentEmailService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);

  sending = signal(false);
  /** De bewaarde HTML wordt in een sandbox-iframe zonder scripts getoond. */
  body: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(this.data.email.bodyHtml);

  resend() {
    if (this.sending()) return;
    this.sending.set(true);
    this.sentEmailService.resend(this.data.email.sentEmailId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('messages.resendDone'), this.translate.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.sending.set(false);
        this.snackBar.open(this.translate.instant('messages.resendError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }
}
