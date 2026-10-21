import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';
import { startOfDay } from '../../core/portal/date-utils';
import { AgendaKind, stayNights } from '../../core/portal/trip-model';
import { EventTitleComponent } from '../../shared/components/event-title.component';
import { SectionCardComponent } from '../../shared/components/section-card.component';

/**
 * De hele reis in één oogopslag. Op brede schermen een tijdlijn met een balk per verblijf en een genummerd punt
 * per activiteit; op smalle schermen dezelfde gegevens als verticale agenda. Beide weergaven staan in de pagina,
 * een container query kiest welke zichtbaar is (de pagina is de container).
 */
@Component({
  selector: 'app-trip-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule, TranslatePipe, SectionCardComponent, EventTitleComponent],
  template: `
    <app-section-card
      titleKey="dashboard.timeline.title"
      icon="route"
      [status]="store.scheduleStatus()"
      [empty]="store.agenda().length === 0"
      emptyKey="dashboard.timeline.empty"
      (retry)="reload()">
      @if (store.timeline(); as tl) {
        @if (tl.days.length > 0) {
          <div class="lane-view">
            <div class="grid" [class.dense]="tl.days.length > 20" [style.--cols]="tl.days.length">
              @for (day of tl.days; track $index) {
                <div class="dh" [class.today]="isToday(day)" [style.grid-column]="$index + 1" style="grid-row: 1">
                  <span class="wd">{{ day | date: 'EEEEE' : undefined : locale() }}</span>
                  <span class="dn">{{ day | date: 'd' }}</span>
                </div>
              }
              @for (bar of tl.stays; track bar.stay.bookingLineId) {
                <div class="bar" [class]="'bar stay-' + (bar.index % 4)"
                     [style.grid-column]="bar.startCol + ' / ' + bar.endCol" [style.grid-row]="2 + bar.lane"
                     [attr.title]="bar.stay.accommodationName">
                  @let n = nights(bar.stay);
                  {{ bar.stay.accommodationName }} · {{ (n === 1 ? 'dashboard.nightsOne' : 'dashboard.nightsOther') | translate: { count: n } }}
                </div>
              }
              @for (pin of tl.pins; track pin.activity.activityId) {
                <span class="pin" [style.grid-column]="pin.col" [style.grid-row]="2 + tl.lanes + pin.row"
                      [attr.aria-label]="('dashboard.timeline.pinAria' | translate: { number: pin.number, name: pin.activity.name })"
                      [attr.title]="pin.activity.name">{{ pin.number }}</span>
              }
            </div>
            @if (tl.pins.length > 0) {
              <p class="hint">{{ 'dashboard.timeline.pinsHint' | translate }}</p>
            }
          </div>
        }
      }

      <ol class="agenda-view">
        @for (day of store.agenda(); track day.date.getTime()) {
          <li class="ag-day" [class.today]="isToday(day.date)">
            <div class="ag-date">
              <strong>{{ day.date | date: 'd' }}</strong>
              <small>{{ day.date | date: 'MMM' : undefined : locale() }}</small>
            </div>
            <ul class="ag-items">
              @for (item of day.items; track $index) {
                <li [class]="'ag-item rail-' + (item.stayIndex < 0 ? 'none' : item.stayIndex % 4)">
                  <mat-icon aria-hidden="true">{{ icon(item.kind) }}</mat-icon>
                  <div>
                    <div>
                      @if (item.number !== null) { <span class="num">{{ item.number }}</span> }
                      <app-event-title [kind]="item.kind" [label]="item.label" />
                    </div>
                    @if (item.time || item.location) {
                      <div class="sub">
                        @if (item.time) { {{ item.time }} }
                        @if (item.time && item.location) { · }
                        @if (item.location) { {{ item.location }} }
                      </div>
                    }
                  </div>
                </li>
              }
            </ul>
          </li>
        }
      </ol>
    </app-section-card>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      --stay-0: color-mix(in srgb, var(--theme-primary) 82%, black);
      --stay-1: color-mix(in srgb, var(--theme-accent) 62%, black);
      --stay-2: color-mix(in srgb, var(--theme-primary) 55%, #3b2a8f);
      --stay-3: color-mix(in srgb, var(--theme-accent) 55%, #8f2a2a);
    }
    .grid { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 3px; align-items: center; }
    .dh { display: flex; flex-direction: column; align-items: center; font-size: .72em; color: var(--ui-text-muted); border-radius: 6px; padding: 2px 0; }
    .dh .dn { font-weight: 600; color: var(--ui-text); }
    .dh.today { background: var(--theme-primary); color: #fff; }
    .dh.today .dn { color: #fff; }
    .dense .wd { display: none; }
    .bar {
      color: #fff; border-radius: 8px; padding: 6px 9px; font-size: .8em; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 4px;
    }
    .stay-0 { background: var(--stay-0); } .stay-1 { background: var(--stay-1); }
    .stay-2 { background: var(--stay-2); } .stay-3 { background: var(--stay-3); }
    .pin {
      justify-self: center; margin-top: 8px; width: 26px; height: 26px; border-radius: 50%;
      background: var(--ui-primary-soft); color: var(--ui-primary-strong); border: 1.5px solid var(--theme-primary);
      display: flex; align-items: center; justify-content: center; font-size: .78em; font-weight: 600;
    }
    .hint { margin: 10px 0 0; font-size: .78em; color: var(--ui-text-muted); }

    .agenda-view { display: none; list-style: none; margin: 0; padding: 0; }
    .ag-day { display: grid; grid-template-columns: 46px 1fr; gap: 10px; padding: 8px 0; border-top: 1px solid var(--ui-line); }
    .ag-day:first-child { border-top: 0; padding-top: 0; }
    .ag-day.today .ag-date strong { background: var(--theme-primary); color: #fff; }
    .ag-date { text-align: center; line-height: 1.1; }
    .ag-date strong { display: block; font-size: 1.15em; border-radius: 8px; padding: 2px 0; }
    .ag-date small { color: var(--ui-text-muted); font-size: .78em; text-transform: uppercase; }
    .ag-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .ag-item { display: flex; gap: 8px; align-items: flex-start; padding-left: 10px; border-left: 4px solid var(--ui-line); }
    .ag-item mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--ui-text-muted); margin-top: 1px; flex: none; }
    .rail-0 { border-left-color: var(--stay-0); } .rail-1 { border-left-color: var(--stay-1); }
    .rail-2 { border-left-color: var(--stay-2); } .rail-3 { border-left-color: var(--stay-3); }
    .num {
      display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%;
      background: var(--ui-primary-soft); color: var(--ui-primary-strong); font-size: .78em; font-weight: 600; margin-right: 6px;
    }
    .sub { color: var(--ui-text-muted); font-size: .88em; }

    @container page (max-width: 599px) {
      .lane-view { display: none; }
      .agenda-view { display: block; }
    }
  `],
})
export class TripTimelineComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;

  protected reload(): void {
    this.store.reload('overview');
    this.store.reload('stays');
    this.store.reload('activities');
  }

  protected isToday(date: Date): boolean {
    return startOfDay(date).getTime() === this.store.today().getTime();
  }

  protected nights = stayNights;

  protected icon(kind: AgendaKind): string {
    return kind === 'activity' ? 'explore' : kind === 'checkin' ? 'login' : 'logout';
  }
}
