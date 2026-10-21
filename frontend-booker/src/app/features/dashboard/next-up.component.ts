import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';
import { dayDiff } from '../../core/portal/date-utils';
import { TripEvent } from '../../core/portal/trip-model';
import { EventTitleComponent } from '../../shared/components/event-title.component';
import { SectionCardComponent } from '../../shared/components/section-card.component';

/** Wat er nu is of als eerste komt. Na de reis staat hier een bedankje. */
@Component({
  selector: 'app-next-up',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule, TranslatePipe, SectionCardComponent, EventTitleComponent],
  template: `
    <app-section-card
      [titleKey]="store.phase() === 'during' ? 'dashboard.nextUp.titleDuring' : 'dashboard.nextUp.title'"
      icon="bolt"
      [status]="store.scheduleStatus()"
      [empty]="store.phase() !== 'after' && !store.nextUp().current && !store.nextUp().next"
      emptyKey="dashboard.nextUp.empty"
      (retry)="reloadSchedule()">
      @if (store.phase() === 'after') {
        <p class="thanks">{{ 'dashboard.nextUp.afterText' | translate }}</p>
      } @else {
        @if (store.nextUp(); as up) {
          @if (up.current; as current) {
            <span class="lbl now">{{ 'dashboard.nextUp.now' | translate }}</span>
            <div class="t"><app-event-title [kind]="current.kind" [label]="current.label" /></div>
            <div class="sub">{{ when(current) }}</div>
            @if (current.location) {
              <div class="sub"><mat-icon aria-hidden="true">place</mat-icon> {{ current.location }}</div>
            }
          }
          @if (up.next; as next) {
            <span class="lbl">{{ (store.phase() === 'during' ? 'dashboard.nextUp.then' : 'dashboard.nextUp.first') | translate }}</span>
            <div class="t"><app-event-title [kind]="next.kind" [label]="next.label" /></div>
            <div class="sub">
              <mat-icon aria-hidden="true">event</mat-icon>
              {{ next.start | date: 'EEEE d MMMM' : undefined : locale() }}
              @if (next.hasTime) { · {{ next.start | date: 'HH:mm' }} }
            </div>
            @if (next.location) {
              <div class="sub"><mat-icon aria-hidden="true">place</mat-icon> {{ next.location }}</div>
            }
            @if (store.phase() === 'before' && daysAway(next) > 0) {
              <div class="sub accent">
                {{ (daysAway(next) === 1 ? 'dashboard.nextUp.inDayOne' : 'dashboard.nextUp.inDaysOther') | translate: { count: daysAway(next) } }}
              </div>
            }
          }
          @if (up.following; as following) {
            <div class="following">
              {{ 'dashboard.nextUp.following' | translate }}:
              <app-event-title [kind]="following.kind" [label]="following.label" />
              · {{ following.start | date: 'd MMM' : undefined : locale() }}
            </div>
          }
        }
      }
    </app-section-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .lbl {
      display: inline-block; font-size: .74em; font-weight: 600; padding: 1px 9px; border-radius: 99px;
      background: var(--ui-primary-soft); color: var(--ui-primary-strong); margin: 0 0 4px;
    }
    .lbl.now { background: var(--theme-primary); color: #fff; }
    .t { font-size: 1.12em; font-weight: 600; margin-bottom: 2px; }
    .sub { color: var(--ui-text-muted); font-size: .9em; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .sub mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .sub.accent { color: var(--ui-primary-strong); font-weight: 500; }
    .t + .sub { margin-bottom: 2px; }
    .lbl + .t { margin-top: 2px; }
    .sub + .lbl { margin-top: 14px; }
    .following { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--ui-line); font-size: .86em; color: var(--ui-text-muted); }
    .thanks { margin: 0; }
  `],
})
export class NextUpComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;

  protected reloadSchedule(): void {
    this.store.reload('overview');
    this.store.reload('stays');
    this.store.reload('activities');
  }

  protected when(event: TripEvent): string {
    const start = event.start;
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
    if (!event.end) return from;
    return `${from} – ${pad(event.end.getHours())}:${pad(event.end.getMinutes())}`;
  }

  protected daysAway(event: TripEvent): number {
    return dayDiff(this.store.today(), event.start);
  }
}
