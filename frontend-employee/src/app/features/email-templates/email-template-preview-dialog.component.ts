import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { EmailTemplateService } from './email-template.service';
import { AuthService } from '../../core/auth/auth.service';
import { EmailTemplate, EmailRender } from '../../shared/models';

/**
 * Het doel van de e-mail staat altijd vast: de dialoog wordt geopend vanuit een boeking (de mail gaat naar de
 * hoofdboeker) of vanuit een prospect. E-mail versturen kan nergens anders; de lijst met e-mailtemplates is
 * alleen voor het beheren van templates.
 */
export interface EmailTemplatePreviewDialogData {
  /** De boeking (geopend vanuit het boekingdetail). */
  booking?: { bookingId: string; bookingNumber: string };
  /** De prospect (geopend vanuit de prospectenlijst). */
  booker?: { bookerId: string; name: string };
}

/**
 * Een e-mailtemplate kiezen, het voorbeeld bekijken en versturen. De backend merget subject + HTML-body voor
 * de prospect/boeker of voor de boeking (dan gaat de mail naar de hoofdboeker); het resultaat wordt in een
 * sandbox-iframe zonder scripts getoond.
 */
@Component({
  selector: 'app-email-template-preview-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ 'emailTemplates.sendEmailTitle' | translate }}
      @if (data.booking) { — {{ data.booking.bookingNumber }} }
      @else if (data.booker) { — {{ data.booker.name }} }
    </h2>
    <mat-dialog-content>
      @if (loadingTemplates()) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <mat-form-field appearance="outline" class="wide-field">
          <mat-label>{{ 'emailTemplates.selectTemplate' | translate }}</mat-label>
          <mat-select [(ngModel)]="selectedTemplateId" (ngModelChange)="rendered.set(null)">
            @for (t of templates(); track t.emailTemplateId) {
              <mat-option [value]="t.emailTemplateId">{{ t.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        @if (templates().length === 0) {
          <p class="no-data">{{ 'emailTemplates.noTemplatesFound' | translate }}</p>
        }

        <div class="controls">
          @if (data.booking) {
            <span class="fixed-target">{{ 'emailTemplates.forBooking' | translate }}: {{ data.booking.bookingNumber }}</span>
          } @else if (data.booker) {
            <span class="fixed-target">{{ 'emailTemplates.forProspect' | translate }}: {{ data.booker.name }}</span>
          }
          <button mat-stroked-button color="primary"
                  [disabled]="!canRun() || rendering() || sending()"
                  (click)="render()">
            @if (rendering()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <ng-container><mat-icon>play_arrow</mat-icon> {{ 'emailTemplates.render' | translate }}</ng-container>
            }
          </button>
          @if (canSend) {
            <button mat-raised-button color="primary"
                    [disabled]="!canRun() || rendering() || sending()"
                    (click)="send()">
              @if (sending()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <ng-container><mat-icon>send</mat-icon> {{ 'emailTemplates.send' | translate }}</ng-container>
              }
            </button>
          }
        </div>

        @if (errorText()) {
          <p class="error-text">{{ errorText() }}</p>
        }

        @if (rendered(); as r) {
          <mat-divider></mat-divider>
          <div class="preview">
            <div class="subject-line">
              <span class="subject-label">{{ 'emailTemplates.subject' | translate }}:</span>
              <span class="subject-value">{{ r.subject }}</span>
            </div>
            <iframe class="body-frame" sandbox [srcdoc]="frameSrcdoc()"
                    [title]="'emailTemplates.previewTitle' | translate"></iframe>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .loading { display: flex; justify-content: center; padding: 24px; }
    .no-data { color: #888; text-align: center; padding: 24px; }
    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .wide-field { width: 100%; }
    .fixed-target { flex: 1; font-weight: 600; }
    .error-text {
      color: #c62828;
      font-size: 13px;
      margin: 8px 0;
    }
    .preview { margin-top: 12px; }
    .subject-line {
      margin: 12px 0;
      font-size: 14px;
    }
    .subject-label { font-weight: 600; margin-right: 8px; }
    .body-frame {
      width: 100%;
      height: 360px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fff;
    }
  `],
})
export class EmailTemplatePreviewDialogComponent implements OnInit {
  data: EmailTemplatePreviewDialogData = inject(MAT_DIALOG_DATA);
  private emailTemplateService = inject(EmailTemplateService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);

  canSend = this.authService.hasAuthority('EMAIL_SEND');

  templates = signal<EmailTemplate[]>([]);
  loadingTemplates = signal(true);
  selectedTemplateId: string | null = null;

  /**
   * Is alles gekozen wat nodig is om te kunnen mergen/versturen? Bewust een methode en geen computed: de
   * template-keuze is een gewoon veld (ngModel), waar een computed niet op reageert.
   */
  canRun(): boolean {
    return !!this.selectedTemplateId && (!!this.data.booking || !!this.data.booker);
  }

  rendering = signal(false);
  rendered = signal<EmailRender | null>(null);
  errorText = signal('');
  sending = signal(false);

  // Volledige HTML voor de preview-iframe. Angular registreert iframe[srcdoc] als
  // SecurityContext.HTML en zou de inline styles (tabel-randen e.d.) strippen; we
  // omzeilen dat bewust met bypassSecurityTrustHtml. Dat is veilig omdat de iframe
  // in een sandbox ZONDER scripts draait: scripts worden niet uitgevoerd, styles wel.
  frameSrcdoc = computed<SafeHtml | string>(() => {
    const r = this.rendered();
    return r ? this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewHtml(r.bodyHtml)) : '';
  });

  buildPreviewHtml(bodyHtml: string): string {
    return '<!doctype html><html><head><meta charset="utf-8"><style>'
      + 'html,body{margin:0}'
      + 'body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#000;padding:12px}'
      + 'table{border-collapse:collapse}img{max-width:100%}'
      + '</style></head><body>' + bodyHtml + '</body></html>';
  }

  ngOnInit() {
    this.emailTemplateService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (templates) => {
          this.templates.set(templates);
          this.loadingTemplates.set(false);
        },
        error: () => this.loadingTemplates.set(false),
      });
  }

  render() {
    if (!this.canRun()) return;
    this.rendering.set(true);
    this.errorText.set('');
    const request = this.data.booking
      ? this.emailTemplateService.renderForBooking(this.selectedTemplateId!, this.data.booking.bookingId)
      : this.emailTemplateService.render(this.selectedTemplateId!, this.data.booker!.bookerId);
    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.rendered.set(result);
          this.rendering.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.rendering.set(false);
          // Toon de specifieke servermelding (bv. welke placeholder fout is);
          // val terug op een generieke tekst als die ontbreekt.
          const serverMessage = err?.error?.message;
          this.errorText.set(typeof serverMessage === 'string' && serverMessage
            ? serverMessage
            : this.translate.instant('emailTemplates.renderError'));
        },
      });
  }

  async send() {
    if (!this.canRun() || this.sending()) return;

    const confirmMsg = this.data.booking
      ? this.translate.instant('emailTemplates.sendConfirmBooking', { number: this.data.booking.bookingNumber })
      : this.translate.instant('emailTemplates.sendConfirm', { name: this.data.booker!.name });
    if (!await this.confirmService.confirm(confirmMsg)) return;

    this.sending.set(true);
    this.errorText.set('');
    const request = this.data.booking
      ? this.emailTemplateService.sendForBooking(this.selectedTemplateId!, this.data.booking.bookingId)
      : this.emailTemplateService.send(this.selectedTemplateId!, this.data.booker!.bookerId);
    request
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sending.set(false);
          this.snackBar.open(
            this.translate.instant('emailTemplates.sent', { to: result.to }),
            this.translate.instant('common.close'),
            { duration: 4000 });
        },
        error: (err: HttpErrorResponse) => {
          this.sending.set(false);
          const serverMessage = err?.error?.message;
          this.snackBar.open(
            typeof serverMessage === 'string' && serverMessage
              ? serverMessage
              : this.translate.instant('emailTemplates.sendError'),
            this.translate.instant('common.close'),
            { duration: 6000 });
        },
      });
  }
}
