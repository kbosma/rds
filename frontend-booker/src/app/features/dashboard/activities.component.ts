import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';
import { SectionCardComponent } from '../../shared/components/section-card.component';

/** De geplande activiteiten, genummerd zoals de punten in de tijdlijn. */
@Component({
  selector: 'app-activities',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIconModule, TranslatePipe, SectionCardComponent],
  template: `
    <app-section-card
      titleKey="dashboard.activities.title"
      icon="local_activity"
      [status]="store.activities.status()"
      [empty]="store.activitiesList().length === 0"
      emptyKey="dashboard.activities.empty"
      (retry)="store.reload('activities')">
      <ol class="list">
        @for (activity of store.activitiesList(); track activity.activityId; let i = $index) {
          <li class="row">
            <span class="num" aria-hidden="true">{{ i + 1 }}</span>
            <div class="g">
              <div class="name">{{ activity.name }}</div>
              <div class="sub">
                {{ activity.fromDate | date: 'EEE d MMM' : undefined : locale() }} · {{ activity.fromDate | date: 'HH:mm' }}
                @if (activity.location) { · {{ activity.location }} }
              </div>
            </div>
            <span class="tag">{{ typeKey(activity.activityType) | translate }}</span>
          </li>
        }
      </ol>
    </app-section-card>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--ui-line); }
    .row:first-child { border-top: 0; padding-top: 0; }
    .num {
      flex: none; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: var(--ui-primary-soft); color: var(--ui-primary-strong); border: 1.5px solid var(--theme-primary);
      font-size: .78em; font-weight: 600;
    }
    .g { flex: 1; min-width: 0; }
    .name { font-weight: 500; }
    .sub { color: var(--ui-text-muted); font-size: .88em; }
    .tag { flex: none; font-size: .74em; padding: 1px 9px; border-radius: 99px; background: #f1f5f6; color: var(--ui-text-muted); border: 1px solid var(--ui-line); }
  `],
})
export class ActivitiesComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;

  /** De server stuurt het type in hoofdletters (TOUR); de vertalingen staan in lowercase. */
  protected typeKey(type: string): string {
    return `dashboard.activityType.${type.toLowerCase()}`;
  }
}
