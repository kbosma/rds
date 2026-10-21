import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { MESSAGE_FILTERS, MessageItem } from '../../core/portal/message-model';
import { PortalStore } from '../../core/portal/portal.store';
import { SectionCardComponent } from '../../shared/components/section-card.component';
import { MessageDialogComponent } from './message-dialog.component';

/**
 * Alles wat de organisatie de klant heeft gestuurd: de verzonden e-mails en de documenten in één lijst, nieuwste
 * bovenaan. E-mails kunnen worden gelezen (zoals ontvangen), documenten worden gedownload. Betalingen staan hier
 * niet in; die hebben een eigen kaart.
 */
@Component({
  selector: 'app-messages-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe, SectionCardComponent],
  template: `
    <app-section-card
      titleKey="dashboard.messages.title"
      icon="forum"
      [status]="store.messagesStatus()"
      [empty]="store.messageItems().length === 0 && !store.messagesPartialError()"
      emptyKey="dashboard.messages.empty"
      (retry)="store.reloadMessages()">
      @if (store.messagesPartialError()) {
        <p class="partial" role="alert">
          {{ 'dashboard.messages.partialError' | translate }}
          <button mat-button type="button" (click)="store.reloadMessages()">{{ 'dashboard.retry' | translate }}</button>
        </p>
      }

      @if (store.messageCounts().email > 0 && store.messageCounts().document > 0) {
        <div class="filters" role="group" [attr.aria-label]="'dashboard.messages.filterAria' | translate">
          @for (filter of filters; track filter) {
            <button type="button" class="chip" [class.on]="store.messageFilter() === filter"
                    [attr.aria-pressed]="store.messageFilter() === filter" (click)="store.setMessageFilter(filter)">
              {{ 'dashboard.messages.filter.' + filter | translate }}
              <span class="n">{{ store.messageCounts()[filter] }}</span>
            </button>
          }
        </div>
      }

      <ul class="list zebra-rows">
        @for (item of store.visibleMessageItems(); track item.kind + item.id) {
          <li class="row" [attr.data-kind]="item.kind">
            <mat-icon class="kind" aria-hidden="true">{{ icon(item) }}</mat-icon>
            <div class="g">
              <div class="name">{{ item.title }}</div>
              <div class="sub">
                {{ item.date | date: 'd MMM y' : undefined : locale() }}
                @if (item.kind === 'email') {
                  · {{ item.message.fromAddress }}
                  @if (item.message.resent) { <span class="tag">{{ 'dashboard.messages.resent' | translate }}</span> }
                } @else if (item.document.size > 0) {
                  · {{ size(item.document.size) }}
                }
              </div>
            </div>
            @if (item.kind === 'email') {
              <button mat-icon-button type="button" class="act view act-info" (click)="open(item)"
                      [attr.aria-label]="'dashboard.messages.view' | translate: { name: item.title }">
                <mat-icon>visibility</mat-icon>
              </button>
            } @else {
              <button mat-icon-button type="button" class="act download act-info" (click)="store.download(item.document)"
                      [attr.aria-label]="'dashboard.messages.download' | translate: { name: item.title }">
                @if (store.downloadingId() === item.document.documentId) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>download</mat-icon>
                }
              </button>
            }
          </li>
        }
      </ul>

      @if (store.hiddenMessageCount() > 0) {
        <button mat-button type="button" class="more" (click)="store.showAllMessages.set(true)">
          {{ 'dashboard.messages.showAll' | translate: { count: store.hiddenMessageCount() } }}
        </button>
      } @else if (store.canCollapseMessages()) {
        <button mat-button type="button" class="more" (click)="store.showAllMessages.set(false)">
          {{ 'dashboard.messages.showLess' | translate }}
        </button>
      }

      @if (store.downloadError()) {
        <p class="err" role="alert">{{ 'dashboard.messages.downloadError' | translate }}</p>
      }
    </app-section-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; min-height: 32px; border-radius: 99px;
      border: 1px solid var(--ui-line); background: #fff; color: var(--ui-text); font: inherit; font-size: .9em; cursor: pointer;
    }
    .chip.on { background: var(--ui-primary-soft); border-color: var(--theme-primary); color: var(--ui-primary-strong); font-weight: 600; }
    .chip .n { font-size: .85em; color: var(--ui-text-muted); }
    .chip.on .n { color: var(--ui-primary-strong); }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-top: 1px solid var(--ui-line); }
    .row:first-child { border-top: 0; }
    .kind { flex: none; color: var(--ui-text-muted); }
    .row[data-kind='document'] .kind { color: #c0392b; }
    .row[data-kind='email'] .kind { color: var(--theme-primary); }
    .g { flex: 1; min-width: 0; }
    .name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub { color: var(--ui-text-muted); font-size: .84em; overflow-wrap: anywhere; }
    .tag { margin-left: 6px; padding: 0 8px; border-radius: 99px; background: #f1f5f6; border: 1px solid var(--ui-line); font-size: .9em; }
    .more { margin-top: 6px; }
    .partial { margin: 0 0 10px; color: var(--ui-text-muted); font-size: .88em; }
    .err { margin: 8px 0 0; color: #a12622; font-size: .88em; }
  `],
})
export class MessagesCardComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;
  private readonly dialog = inject(MatDialog);
  protected readonly filters = MESSAGE_FILTERS;

  protected icon(item: MessageItem): string {
    if (item.kind === 'email') return 'mail';
    return item.document.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'description';
  }

  protected open(item: MessageItem): void {
    if (item.kind !== 'email') return;
    this.dialog.open(MessageDialogComponent, { data: item.message, width: '760px', maxWidth: '95vw', autoFocus: 'dialog' });
  }

  protected size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
