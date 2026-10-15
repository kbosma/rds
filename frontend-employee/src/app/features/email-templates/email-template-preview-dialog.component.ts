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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { EmailTemplateService } from './email-template.service';
import { BookerService } from '../bookers/booker.service';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { EmailTemplate, EmailRender, Booker, Booking } from '../../shared/models';

export interface EmailTemplatePreviewDialogData {
  /** Vast: de template (geopend vanuit de templatelijst). Ontbreekt: de gebruiker kiest er een. */
  template?: EmailTemplate;
  /** Vast: de boeking (geopend vanuit het boekingdetail). Ontbreekt: de gebruiker kiest prospect of boeking. */
  booking?: { bookingId: string; bookingNumber: string };
}

/**
 * Voorbeeld en verzending van een e-mailtemplate: laat de backend subject + HTML-body mergen voor een
 * prospect/boeker of voor een boeking (dan gaat de mail naar de hoofdboeker) en toont het resultaat. Het
 * resultaat wordt in een sandbox-iframe zonder scripts getoond.
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
    MatButtonToggleModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      @if (data.template) {
        {{ 'emailTemplates.previewTitle' | translate }}: {{ data.template.name }}
      } @else {
        {{ 'emailTemplates.sendEmailTitle' | translate }}
      }
      @if (data.booking) { — {{ data.booking.bookingNumber }} }
    </h2>
    <mat-dialog-content>
      @if (loadingTargets()) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        @if (!data.template) {
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
        }

        @if (!data.booking) {
          <mat-button-toggle-group class="mode-toggle" [value]="mode()" (change)="setMode($event.value)"
                                   [attr.aria-label]="'emailTemplates.selectProspect' | translate">
            <mat-button-toggle value="prospect">{{ 'emailTemplates.forProspect' | translate }}</mat-button-toggle>
            <mat-button-toggle value="booking">{{ 'emailTemplates.forBooking' | translate }}</mat-button-toggle>
          </mat-button-toggle-group>
        }

        <div class="controls">
          @if (data.booking) {
            <span class="fixed-target">{{ 'emailTemplates.forBooking' | translate }}: {{ data.booking.bookingNumber }}</span>
          } @else if (mode() === 'prospect') {
            @if (prospects().length === 0) {
              <p class="no-data">{{ 'prospects.noProspectsFound' | translate }}</p>
            } @else {
              <mat-form-field appearance="outline" class="prospect-select">
                <mat-label>{{ 'emailTemplates.selectProspect' | translate }}</mat-label>
                <mat-select [(ngModel)]="selectedBookerId" (ngModelChange)="rendered.set(null)">
                  @for (p of prospects(); track p.bookerId) {
                    <mat-option [value]="p.bookerId">
                      {{ p.firstname }} {{ p.prefix }} {{ p.lastname }} &lt;{{ p.emailaddress }}&gt;
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          } @else {
            @if (bookings().length === 0) {
              <p class="no-data">{{ 'emailTemplates.noBookingsFound' | translate }}</p>
            } @else {
              <mat-form-field appearance="outline" class="prospect-select">
                <mat-label>{{ 'emailTemplates.selectBooking' | translate }}</mat-label>
                <mat-select [(ngModel)]="selectedBookingId" (ngModelChange)="rendered.set(null)">
                  @for (b of bookings(); track b.bookingId) {
                    <mat-option [value]="b.bookingId">{{ b.bookingNumber }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
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
    .prospect-select { flex: 1; }
    .wide-field { width: 100%; }
    .mode-toggle { margin-bottom: 12px; }
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
  private bookerService = inject(BookerService);
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);

  canSend = this.authService.hasAuthority('EMAIL_SEND');

  prospects = signal<Booker[]>([]);
  loadingProspects = signal(true);
  selectedBookerId: string | null = null;

  /** Voor een prospect/boeker, of voor een boeking (dan is de ontvanger de hoofdboeker). */
  mode = signal<'prospect' | 'booking'>(this.data.booking ? 'booking' : 'prospect');
  templates = signal<EmailTemplate[]>([]);
  loadingTemplates = signal(!this.data.template);
  selectedTemplateId: string | null = this.data.template?.emailTemplateId ?? null;
  bookings = signal<Booking[]>([]);
  loadingBookings = signal(false);
  selectedBookingId: string | null = this.data.booking?.bookingId ?? null;

  loadingTargets = computed(() => this.loadingProspects() || this.loadingTemplates() || this.loadingBookings());

  /**
   * Is alles gekozen wat nodig is om te kunnen mergen/versturen? Bewust een methode en geen computed: de
   * keuzes zijn gewone velden (ngModel), waar een computed niet op reageert.
   */
  canRun(): boolean {
    if (!this.selectedTemplateId) return false;
    return this.mode() === 'booking' ? !!this.selectedBookingId : !!this.selectedBookerId;
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
    if (!this.data.template) {
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

    if (this.data.booking) {
      this.loadingProspects.set(false); // vast doel: geen lijst nodig
      return;
    }
    this.bookerService.getByStatus('prospect')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (prospects) => {
          this.prospects.set(prospects);
          this.loadingProspects.set(false);
        },
        error: () => this.loadingProspects.set(false),
      });
  }

  setMode(mode: 'prospect' | 'booking') {
    this.mode.set(mode);
    this.rendered.set(null);
    this.errorText.set('');
    if (mode === 'booking' && this.bookings().length === 0 && !this.loadingBookings()) {
      this.loadingBookings.set(true);
      this.bookingService.getAll()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (bookings) => {
            this.bookings.set(bookings);
            this.loadingBookings.set(false);
          },
          error: () => this.loadingBookings.set(false),
        });
    }
  }

  render() {
    if (!this.canRun()) return;
    this.rendering.set(true);
    this.errorText.set('');
    const request = this.mode() === 'booking'
      ? this.emailTemplateService.renderForBooking(this.selectedTemplateId!, this.selectedBookingId!)
      : this.emailTemplateService.render(this.selectedTemplateId!, this.selectedBookerId!);
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

    const confirmMsg = this.mode() === 'booking' ? this.confirmTextForBooking() : this.confirmTextForProspect();
    if (!await this.confirmService.confirm(confirmMsg)) return;

    this.sending.set(true);
    this.errorText.set('');
    const request = this.mode() === 'booking'
      ? this.emailTemplateService.sendForBooking(this.selectedTemplateId!, this.selectedBookingId!)
      : this.emailTemplateService.send(this.selectedTemplateId!, this.selectedBookerId!);
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

  private confirmTextForProspect(): string {
    const prospect = this.prospects().find(p => p.bookerId === this.selectedBookerId);
    const name = prospect ? `${prospect.firstname} ${prospect.lastname}`.trim() : '';
    return this.translate.instant('emailTemplates.sendConfirm', { name });
  }

  private confirmTextForBooking(): string {
    const number = this.data.booking?.bookingNumber
      ?? this.bookings().find(b => b.bookingId === this.selectedBookingId)?.bookingNumber
      ?? '';
    return this.translate.instant('emailTemplates.sendConfirmBooking', { number });
  }
}
