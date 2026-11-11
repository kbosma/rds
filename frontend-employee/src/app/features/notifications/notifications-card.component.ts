import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { BookingNotification } from '../../shared/models';
import { NotificationService } from './notification.service';

const KIND_ICONS: Record<string, string> = {
  alles_betaald: 'task_alt',
  op_reis: 'flight_takeoff',
  weer_thuis: 'flight_land',
  terugboeking: 'undo',
};

/**
 * Notificaties: iets dat een medewerker moet oppakken (alles betaald, op reis, weer thuis, terugboeking). Op het
 * dashboard de openstaande van de organisatie (met link naar de boeking); bij een boeking ({@link bookingId}) alle
 * notificaties van die boeking, open bovenaan. Afhandelen met NOTIFICATION_UPDATE.
 */
@Component({
  selector: 'app-notifications-card',
  standalone: true,
  imports: [DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatSnackBarModule, TranslatePipe],
  template: `
    @if (!bookingId() || items().length > 0) {
      <mat-card class="notifications-card">
        <mat-card-header>
          <mat-card-title>
            {{ 'notifications.title' | translate }}
            @if (openCount() > 0) { <span class="count">{{ openCount() }}</span> }
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (items().length === 0) {
            <p class="empty">{{ 'notifications.empty' | translate }}</p>
          } @else {
            <ul class="list zebra-rows">
              @for (n of items(); track n.notificationId) {
                <li class="item" [class.handled]="n.handled" [attr.data-kind]="n.kind">
                  <mat-icon class="kind-icon">{{ icon(n.kind) }}</mat-icon>
                  <div class="what">
                    <div class="title">{{ n.title }}</div>
                    <div class="sub">
                      {{ n.notifiedAt | date:'dd-MM-yyyy HH:mm' }}
                      @if (!bookingId()) {
                        · <a [routerLink]="['/bookings', n.bookingId]" class="booking-link">{{ n.bookingNumber }}</a>
                      }
                      @if (n.handled) {
                        · {{ 'notifications.handledBy' | translate: { name: n.handledByName ?? '', date: (n.handledAt | date:'dd-MM-yyyy HH:mm') } }}
                      }
                    </div>
                  </div>
                  @if (!n.handled && canHandle()) {
                    <button mat-stroked-button class="act-update handle-btn" [disabled]="busy() === n.notificationId" (click)="handle(n)">
                      <mat-icon>check</mat-icon> {{ 'notifications.handle' | translate }}
                    </button>
                  }
                </li>
              }
            </ul>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .notifications-card { margin-bottom: 16px; }
    .count { display: inline-block; margin-left: 8px; padding: 0 8px; border-radius: 10px; font-size: 12px;
      background: var(--theme-accent, #ff9800); color: #fff; vertical-align: middle; }
    .empty { color: var(--ui-text-secondary, #666); margin: 0; }
    .list { list-style: none; margin: 0; padding: 0; }
    .item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 6px; }
    .item.handled { opacity: 0.6; }
    .kind-icon { color: var(--theme-primary); flex: none; }
    .item[data-kind="terugboeking"] .kind-icon { color: var(--act-delete, #c62828); }
    .what { flex: 1; min-width: 0; }
    .title { font-weight: 500; }
    .sub { font-size: 12px; color: var(--ui-text-secondary, #666); }
    .handle-btn { flex: none; }
  `],
})
export class NotificationsCardComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  /** Bij een boeking: alleen die notificaties; leeg = de openstaande van de organisatie (dashboard). */
  readonly bookingId = input<string | null>(null);
  /** Na afhandelen: de boeking kan daardoor zijn afgerond (weer thuis en geen open meldingen meer). */
  readonly handled = output<BookingNotification>();

  items = signal<BookingNotification[]>([]);
  busy = signal<string | null>(null);
  openCount = computed(() => this.items().filter((n) => !n.handled).length);
  canHandle = computed(() => !!this.authService.currentUser() && this.authService.hasAuthority('NOTIFICATION_UPDATE'));

  ngOnInit() {
    this.load();
  }

  load() {
    const bookingId = this.bookingId();
    const source = bookingId ? this.notificationService.getByBooking(bookingId) : this.notificationService.getOpen();
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      // open bovenaan, daarna nieuwste eerst (zo levert de server ze)
      next: (list) => this.items.set([...list].sort((a, b) => Number(a.handled) - Number(b.handled))),
      error: () => this.items.set([]),
    });
  }

  icon(kind: string): string {
    return KIND_ICONS[kind] ?? 'notifications';
  }

  handle(n: BookingNotification) {
    this.busy.set(n.notificationId);
    this.notificationService.handle(n.notificationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (handled) => {
        this.busy.set(null);
        this.handled.emit(handled);
        this.items.update((list) => this.bookingId()
          ? list.map((x) => (x.notificationId === handled.notificationId ? handled : x))
          : list.filter((x) => x.notificationId !== handled.notificationId));
      },
      error: () => {
        this.busy.set(null);
        this.snackBar.open(this.translate.instant('notifications.handleError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }
}
