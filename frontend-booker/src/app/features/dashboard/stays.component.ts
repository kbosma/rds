import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';
import { stayNights } from '../../core/portal/trip-model';
import { SectionCardComponent } from '../../shared/components/section-card.component';

/** De verblijven. Op de telefoon een rij kaarten om langs te zwiepen, anders een raster. */
@Component({
  selector: 'app-stays',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule, TranslatePipe, SectionCardComponent],
  template: `
    <app-section-card
      titleKey="dashboard.stays.title"
      icon="hotel"
      [status]="store.stays.status()"
      [empty]="store.staysList().length === 0"
      emptyKey="dashboard.stays.empty"
      (retry)="store.reload('stays')">
      <ul class="stays">
        @for (stay of store.staysList(); track stay.bookingLineId; let i = $index) {
          <li class="stay">
            <div [class]="'cover stay-' + (i % 4)" aria-hidden="true"><mat-icon>{{ i % 2 === 0 ? 'home' : 'apartment' }}</mat-icon></div>
            <div class="body">
              <strong>{{ stay.accommodationName }}</strong>
              <div class="sub">{{ stay.supplierName }}</div>
              <div class="sub">
                {{ stay.fromDate | date: 'd MMM' : undefined : locale() }} – {{ stay.untilDate | date: 'd MMM' : undefined : locale() }}
                @let n = nights(stay);
                <span class="tag">{{ (n === 1 ? 'dashboard.nightsOne' : 'dashboard.nightsOther') | translate: { count: n } }}</span>
              </div>
            </div>
          </li>
        }
      </ul>
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
    .stays { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .stay { border: 1px solid var(--ui-line); border-radius: 12px; overflow: hidden; background: #fff; }
    .cover { height: 64px; display: flex; align-items: center; justify-content: center; color: #fff; }
    .cover mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .stay-0 { background: var(--stay-0); } .stay-1 { background: var(--stay-1); }
    .stay-2 { background: var(--stay-2); } .stay-3 { background: var(--stay-3); }
    .body { padding: 10px 12px 12px; }
    .sub { color: var(--ui-text-muted); font-size: .88em; margin-top: 2px; }
    .tag { display: inline-block; margin-left: 6px; padding: 0 8px; border-radius: 99px; background: var(--ui-primary-soft); color: var(--ui-primary-strong); font-size: .85em; font-weight: 500; }
    @container page (max-width: 599px) {
      .stays {
        grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 82%;
        overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 4px; margin: 0 -4px; padding-inline: 4px;
      }
      .stay { scroll-snap-align: start; }
    }
  `],
})
export class StaysComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;
  protected nights = stayNights;
}
