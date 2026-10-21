import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, take, takeWhile, timer } from 'rxjs';
import { PortalDocument, PortalPayment, PortalActivity, PortalStay } from '../../shared/models/portal.models';
import { INITIAL_MESSAGES_VISIBLE, MessageFilter, buildMessageItems, filterMessageItems } from './message-model';
import { PortalService } from './portal.service';
import { LoadStatus, Loadable } from './loadable';
import { PORTAL_NOW, PORTAL_REDIRECT, PORTAL_SAVE_FILE } from './portal.tokens';
import { dayDiff, parseLocal, startOfDay } from './date-utils';
import {
  buildAgenda, buildEvents, buildTimeline, findNextUp, isPayable, isSettled, latestStatusDate,
  sortActivities, sortStays, statusStepIndex, summarizePayments, tripPhase,
} from './trip-model';

const PAY_STARTED_KEY = 'rds_booker_pay_started';
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 13; // ±30 seconden

/**
 * De toestand van het dashboard: de gegevens van de eigen boeking en alles wat daaruit volgt (fase van de reis,
 * tijdlijn, eerstvolgende stap, betaaltotalen). Wordt per dashboard aangemaakt (`providers` op de pagina), dus
 * na uitloggen begint een volgende klant met een lege toestand.
 */
@Injectable()
export class PortalStore {
  private readonly api = inject(PortalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = inject(PORTAL_NOW);
  private readonly redirect = inject(PORTAL_REDIRECT);
  private readonly saveFile = inject(PORTAL_SAVE_FILE);

  readonly overview = new Loadable(() => this.api.getOverview(), this.destroyRef);
  readonly stays = new Loadable(() => this.api.getStays(), this.destroyRef);
  readonly activities = new Loadable(() => this.api.getActivities(), this.destroyRef);
  readonly payments = new Loadable(() => this.api.getPayments(), this.destroyRef);
  readonly paymentStatuses = new Loadable(() => this.api.getPaymentStatuses(), this.destroyRef);
  readonly documents = new Loadable(() => this.api.getDocuments(), this.destroyRef);
  readonly messages = new Loadable(() => this.api.getMessages(), this.destroyRef);

  readonly today = signal(startOfDay(this.now()));
  readonly payingId = signal<string | null>(null);
  readonly payError = signal(false);
  readonly downloadingId = signal<string | null>(null);
  readonly downloadError = signal(false);
  readonly messageFilter = signal<MessageFilter>('all');
  readonly showAllMessages = signal(false);

  private polling = false;

  // ---- de reis ----

  readonly staysList = computed<PortalStay[]>(() => sortStays(this.stays.data() ?? []));
  readonly activitiesList = computed<PortalActivity[]>(() => sortActivities(this.activities.data() ?? []));

  readonly tripStart = computed<Date | null>(() => {
    const iso = this.overview.data()?.booking.fromDate ?? this.staysList()[0]?.fromDate;
    return iso ? parseLocal(iso) : null;
  });
  readonly tripEnd = computed<Date | null>(() => {
    const iso = this.overview.data()?.booking.untilDate
      ?? this.staysList().map((s) => s.untilDate).sort().at(-1);
    return iso ? parseLocal(iso) : null;
  });

  readonly phase = computed(() => tripPhase(this.tripStart(), this.tripEnd(), this.today()));
  readonly daysUntilDeparture = computed(() => {
    const start = this.tripStart();
    return start ? Math.max(0, dayDiff(this.today(), start)) : null;
  });
  readonly tripLengthDays = computed(() => {
    const start = this.tripStart();
    const end = this.tripEnd();
    return start && end ? dayDiff(start, end) + 1 : null;
  });
  readonly nights = computed(() => {
    const days = this.tripLengthDays();
    return days === null ? null : Math.max(0, days - 1);
  });
  readonly tripDay = computed(() => {
    const start = this.tripStart();
    return this.phase() === 'during' && start ? dayDiff(start, this.today()) + 1 : null;
  });
  readonly nightsLeft = computed(() => {
    const end = this.tripEnd();
    return this.phase() === 'during' && end ? dayDiff(this.today(), end) : null;
  });
  readonly statusStep = computed(() => statusStepIndex(this.overview.data()?.booking.status));

  readonly timeline = computed(() => buildTimeline(this.staysList(), this.activitiesList(), this.tripStart(), this.tripEnd()));
  readonly agenda = computed(() => buildAgenda(this.staysList(), this.activitiesList()));
  readonly nextUp = computed(() => {
    if (this.phase() === 'after') return { current: null, next: null, following: null };
    return findNextUp(buildEvents(this.staysList(), this.activitiesList()), this.now());
  });

  /** Laadtoestand van alles wat de planning (tijdlijn, eerstvolgende) nodig heeft. */
  readonly scheduleStatus = computed<LoadStatus>(() =>
    combineStatus([this.overview.status(), this.stays.status(), this.activities.status()]));

  // ---- betalingen ----

  readonly paymentList = computed<PortalPayment[]>(() => this.payments.data() ?? []);
  readonly paymentSummary = computed(() => summarizePayments(this.paymentList()));
  readonly payable = computed(() => this.paymentList().filter(isPayable));
  readonly openPayable = computed(() => this.payable().reduce((sum, p) => sum + p.amount, 0));

  statusDate(paymentId: string): string | null {
    return latestStatusDate(paymentId, this.paymentStatuses.data() ?? []);
  }

  // ---- berichten en documenten ----

  readonly documentList = computed<PortalDocument[]>(() =>
    [...(this.documents.data() ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  /** Verzonden e-mails en documenten in één lijst, nieuwste eerst. */
  readonly messageItems = computed(() => buildMessageItems(this.messages.data() ?? [], this.documents.data() ?? []));
  readonly messageCounts = computed(() => {
    const items = this.messageItems();
    const emails = items.filter((i) => i.kind === 'email').length;
    return { all: items.length, email: emails, document: items.length - emails };
  });
  private readonly filteredMessageItems = computed(() => filterMessageItems(this.messageItems(), this.messageFilter()));
  readonly visibleMessageItems = computed(() =>
    this.showAllMessages() ? this.filteredMessageItems() : this.filteredMessageItems().slice(0, INITIAL_MESSAGES_VISIBLE));
  readonly hiddenMessageCount = computed(() => this.filteredMessageItems().length - this.visibleMessageItems().length);
  readonly canCollapseMessages = computed(() => this.showAllMessages() && this.filteredMessageItems().length > INITIAL_MESSAGES_VISIBLE);

  /** Laadtoestand van de kaart: pas een fout als beide bronnen falen; is er één klaar, dan toont de kaart wat er is. */
  readonly messagesStatus = computed<LoadStatus>(() => {
    const statuses = [this.messages.status(), this.documents.status()];
    if (statuses.every((s) => s === 'error')) return 'error';
    if (statuses.includes('loading')) return statuses.includes('ready') ? 'ready' : 'loading';
    return 'ready';
  });
  /** Eén van de twee bronnen is mislukt terwijl de andere wel klaar is. */
  readonly messagesPartialError = computed(() => {
    const statuses = [this.messages.status(), this.documents.status()];
    return statuses.includes('error') && statuses.includes('ready');
  });

  setMessageFilter(filter: MessageFilter): void {
    this.messageFilter.set(filter);
    this.showAllMessages.set(false);
  }

  reloadMessages(): void {
    if (this.messages.status() !== 'ready') this.messages.load();
    if (this.documents.status() !== 'ready') this.documents.load();
  }

  // ---- laden ----

  init(): void {
    this.overview.load();
    this.stays.load();
    this.activities.load();
    this.documents.load();
    this.messages.load();
    this.paymentStatuses.load();
    this.payments.load({ onLoaded: () => this.startPollingIfNeeded() });
  }

  reload(slice: 'overview' | 'stays' | 'activities' | 'payments' | 'documents' | 'messages'): void {
    this[slice].load();
  }

  // ---- acties ----

  /** Start de betaling bij Mollie en stuurt de klant naar de betaalpagina. */
  pay(payment: PortalPayment): void {
    if (this.payingId()) return;
    this.payingId.set(payment.molliePaymentId);
    this.payError.set(false);
    this.api.initiatePayment(payment.molliePaymentId).subscribe({
      next: (response) => {
        const href = response._links?.checkout?.href;
        if (!href) {
          this.payingId.set(null);
          this.payError.set(true);
          return;
        }
        // Bij terugkeer van Mollie ververst het dashboard even, tot de webhook de nieuwe status heeft gezet.
        this.markPayStarted();
        this.redirect(href);
      },
      error: () => {
        this.payingId.set(null);
        this.payError.set(true);
      },
    });
  }

  download(document: PortalDocument): void {
    if (this.downloadingId()) return;
    this.downloadingId.set(document.documentId);
    this.downloadError.set(false);
    this.api.downloadDocument(document.documentId).subscribe({
      next: (blob) => {
        this.saveFile(blob, document.displayname);
        this.downloadingId.set(null);
      },
      error: () => {
        this.downloadingId.set(null);
        this.downloadError.set(true);
      },
    });
  }

  // ---- ververs de betaalstatus ----

  /**
   * Ververst de betalingen kort op de achtergrond zodat een statuswijziging die via de (asynchrone)
   * Mollie-webhook binnenkomt vanzelf verschijnt. Dat gebeurt na terugkeer van de betaalpagina, of zolang een
   * betaling in behandeling is. Stopt als alles een eindstatus heeft, na `MAX_POLLS` pogingen, of bij verlaten.
   */
  private startPollingIfNeeded(): void {
    if (this.polling) return;
    const inFlight = this.paymentList().some((p) => p.currentStatus === 'pending' || p.currentStatus === 'authorized');
    if (!this.consumePayStarted() && !inFlight) return;
    if (this.paymentList().length === 0 || this.paymentList().every(isSettled)) return;

    this.polling = true;
    timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)
      .pipe(
        take(MAX_POLLS),
        takeWhile(() => !this.paymentList().every(isSettled)),
        finalize(() => (this.polling = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.payments.load({ silent: true });
        this.paymentStatuses.load({ silent: true });
      });
  }

  private markPayStarted(): void {
    try { sessionStorage.setItem(PAY_STARTED_KEY, '1'); } catch { /* geen opslag beschikbaar: dan geen extra verversing */ }
  }

  private consumePayStarted(): boolean {
    try {
      const started = sessionStorage.getItem(PAY_STARTED_KEY) === '1';
      sessionStorage.removeItem(PAY_STARTED_KEY);
      return started;
    } catch {
      return false;
    }
  }
}

/** Eén fout maakt het geheel een fout; anders geldt "laden" zolang er nog iets laadt. */
function combineStatus(statuses: LoadStatus[]): LoadStatus {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('loading')) return 'loading';
  return 'ready';
}
