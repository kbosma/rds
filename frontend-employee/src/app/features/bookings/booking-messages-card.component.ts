import { Component, computed, input, output, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { PaymentStatusBadgeComponent } from '../../shared/components/payment-status-badge.component';
import { Document, MolliePayment, SentEmail } from '../../shared/models';
import { TimelineItem, TimelineKind, buildTimeline, documentFormat } from './booking-timeline';

type Filter = 'all' | TimelineKind;

/**
 * Eén tijdlijn met de e-mails aan de hoofdboeker, de documenten en de betalingen van een boeking. Het pictogram
 * links toont de soort, de gekleurde vlakjes rechts de eigenschappen. De kaart doet zelf geen API-calls: de
 * aanroeper levert de gegevens en handelt de acties af. Betalingen blijven daarnaast hun eigen beheerkaart houden.
 */
@Component({
  selector: 'app-booking-messages-card',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatButtonToggleModule, MatCardModule, MatIconModule, MatMenuModule,
    RowActionsComponent, PaymentStatusBadgeComponent, TranslatePipe],
  template: `
    <mat-card class="messages-card">
      <mat-card-header>
        <mat-card-title>{{ 'messages.title' | translate }}</mat-card-title>
        @if (canSendEmail() || canAddDocument()) {
          <button mat-stroked-button color="primary" class="card-header-btn new-btn" [matMenuTriggerFor]="newMenu">
            <mat-icon>add</mat-icon> {{ 'messages.new' | translate }}
          </button>
          <mat-menu #newMenu="matMenu">
            @if (canSendEmail()) {
              <button mat-menu-item class="new-email" (click)="newEmail.emit()">
                <mat-icon>mail</mat-icon> {{ 'messages.newEmail' | translate }}
              </button>
            }
            @if (canAddDocument()) {
              <button mat-menu-item class="new-document" (click)="newDocument.emit()">
                <mat-icon>description</mat-icon> {{ 'messages.newDocument' | translate }}
              </button>
            }
          </mat-menu>
        }
      </mat-card-header>
      <mat-card-content>
        <mat-button-toggle-group class="filters" [value]="filter()" (change)="filter.set($event.value)"
                                 [attr.aria-label]="'messages.filter' | translate" hideSingleSelectionIndicator>
          <mat-button-toggle value="all">{{ 'messages.filterAll' | translate }}</mat-button-toggle>
          <mat-button-toggle value="email">{{ 'messages.filterEmail' | translate }}</mat-button-toggle>
          <mat-button-toggle value="document">{{ 'messages.filterDocument' | translate }}</mat-button-toggle>
          <mat-button-toggle value="payment">{{ 'messages.filterPayment' | translate }}</mat-button-toggle>
        </mat-button-toggle-group>

        @if (visible().length > 0) {
          <ul class="timeline">
            @for (item of visible(); track item.kind + item.id) {
              <li class="timeline-row" [attr.data-kind]="item.kind">
                <span class="kind-icon" [attr.data-kind]="item.kind">
                  <mat-icon>{{ icon(item) }}</mat-icon>
                </span>
                <div class="what">
                  @switch (item.kind) {
                    @case ('email') {
                      <div class="title">{{ item.source.subject }}</div>
                      <div class="sub">{{ item.at | date:'dd-MM-yyyy HH:mm' }} · {{ 'messages.to' | translate }} {{ item.source.toAddress }}
                        @if (item.source.createdByName) { · {{ item.source.createdByName }} }</div>
                    }
                    @case ('document') {
                      <div class="title">{{ item.source.displayname }}</div>
                      <div class="sub">{{ item.at | date:'dd-MM-yyyy' }}</div>
                    }
                    @case ('payment') {
                      <div class="title">&euro; {{ item.source.amount | number:'1.2-2' }} — {{ item.source.description }}</div>
                      <div class="sub">{{ item.at | date:'dd-MM-yyyy' }}</div>
                    }
                  }
                </div>
                <div class="pills">
                  @switch (item.kind) {
                    @case ('email') {
                      <span class="pill pill-ok">{{ (item.source.resentFromId ? 'messages.resent' : 'messages.sent') | translate }}</span>
                    }
                    @case ('document') {
                      <span class="pill pill-ok">{{ 'messages.portal' | translate }}</span>
                      @if (format(item.source.mimeType); as fmt) { <span class="pill pill-neutral">{{ fmt }}</span> }
                    }
                    @case ('payment') {
                      <app-payment-status-badge [status]="paymentStatus()[item.id] ?? ''" />
                      @if (item.source.method) { <span class="pill pill-neutral">{{ item.source.method }}</span> }
                    }
                  }
                </div>
                <app-row-actions class="row-actions"
                                 [canView]="canView(item)" [canDelete]="item.kind === 'document' && canDeleteDocument()"
                                 (view)="view.emit(item)" (remove)="removeDocument.emit(asDocument(item))" />
              </li>
            }
          </ul>
        } @else {
          <p class="empty-text">{{ 'messages.empty' | translate }}</p>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .messages-card { border-radius: 12px; }
    .messages-card mat-card-header { display: flex; justify-content: space-between; align-items: center; }
    .filters { margin-bottom: 8px; }
    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--ui-line); }
    .kind-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex: none;
      background: var(--ui-primary-soft); color: var(--ui-primary-strong); }
    .kind-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .what { flex: 1; min-width: 0; }
    .title { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub { font-size: 12px; color: var(--ui-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pills { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-start; flex: 0 0 190px; }
    .row-actions { display: flex; justify-content: flex-end; flex: 0 0 96px; }
    .pill { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; white-space: nowrap; }
    .pill-ok { background: #e8f5e9; color: #2e7d32; }
    .pill-neutral { background: var(--ui-canvas); color: var(--ui-text-muted); }
    .empty-text { color: var(--ui-text-muted); margin: 8px 0 0; }
  `],
})
export class BookingMessagesCardComponent {
  readonly emails = input<SentEmail[]>([]);
  readonly documents = input<Document[]>([]);
  readonly payments = input<MolliePayment[]>([]);
  /** Laatste status per betaling (id → lowercase status). */
  readonly paymentStatus = input<Record<string, string>>({});
  readonly canSendEmail = input(false);
  readonly canAddDocument = input(false);
  readonly canReadEmail = input(false);
  readonly canReadDocument = input(false);
  readonly canReadPayment = input(false);
  readonly canDeleteDocument = input(false);

  readonly newEmail = output<void>();
  readonly newDocument = output<void>();
  readonly view = output<TimelineItem>();
  readonly removeDocument = output<Document>();

  readonly filter = signal<Filter>('all');
  private readonly all = computed(() => buildTimeline(this.emails(), this.documents(), this.payments()));
  readonly visible = computed(() => this.all().filter((i) => this.filter() === 'all' || i.kind === this.filter()));

  icon(item: TimelineItem): string {
    return item.kind === 'email' ? 'mail' : item.kind === 'document' ? 'description' : 'credit_card';
  }

  format(mimeType: string | null | undefined): string {
    return documentFormat(mimeType);
  }

  canView(item: TimelineItem): boolean {
    return item.kind === 'email' ? this.canReadEmail() : item.kind === 'document' ? this.canReadDocument() : this.canReadPayment();
  }

  asDocument(item: TimelineItem): Document {
    return item.source as Document;
  }
}
