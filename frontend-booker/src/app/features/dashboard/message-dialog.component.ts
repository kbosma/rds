import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { LoadStatus } from '../../core/portal/loadable';
import { PortalService } from '../../core/portal/portal.service';
import { PortalMessage, PortalMessageContent } from '../../shared/models/portal.models';

/**
 * Een verzonden e-mail zoals de klant hem ontving. De inhoud wordt pas opgehaald als de klant de mail opent (de
 * lijst bevat alleen onderwerp en datum) en getoond in een iframe zonder scripts en zonder eigen herkomst
 * (`sandbox=""`): wat in de mail staat kan dus niets uitvoeren of bij de portal komen.
 */
@Component({
  selector: 'app-message-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ message.subject }}</h2>
    <mat-dialog-content>
      <dl class="meta">
        <dt>{{ 'dashboard.messages.from' | translate }}</dt><dd>{{ message.fromAddress }}</dd>
        <dt>{{ 'dashboard.messages.sentOn' | translate }}</dt>
        <dd>{{ message.createdAt | date: 'd MMMM y, HH:mm' : undefined : locale() }}</dd>
      </dl>
      @switch (status()) {
        @case ('loading') { <div class="state"><mat-spinner diameter="32"></mat-spinner></div> }
        @case ('error') {
          <div class="state" role="alert">
            <p>{{ 'dashboard.messages.loadError' | translate }}</p>
            <button mat-stroked-button type="button" (click)="load()">{{ 'dashboard.retry' | translate }}</button>
          </div>
        }
        @default {
          <iframe class="body" sandbox="" referrerpolicy="no-referrer"
                  [title]="message.subject" [srcdoc]="body()"></iframe>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .meta { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0 0 12px; }
    .meta dt { color: var(--ui-text-muted); }
    .meta dd { margin: 0; overflow-wrap: anywhere; }
    .body { width: 100%; height: 360px; border: 1px solid var(--ui-line); border-radius: 8px; background: #fff; }
    .state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; color: var(--ui-text-muted); }
    .state p { margin: 0; }
  `],
})
export class MessageDialogComponent implements OnInit {
  protected readonly message: PortalMessage = inject<PortalMessage>(MAT_DIALOG_DATA);
  private readonly api = inject(PortalService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly locale = inject(LanguageService).currentLang;

  protected readonly status = signal<LoadStatus>('loading');
  private readonly content = signal<PortalMessageContent | null>(null);

  /** De bewaarde HTML gaat bewust ongewijzigd in de iframe; de sandbox is de bescherming. */
  protected readonly body = computed<SafeHtml | string>(() => {
    const html = this.content()?.bodyHtml;
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : '';
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.api.getMessage(this.message.messageId).subscribe({
      next: (content) => {
        this.content.set(content);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }
}
