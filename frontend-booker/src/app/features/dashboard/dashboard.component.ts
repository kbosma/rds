import { ChangeDetectionStrategy, Component, OnInit, effect, inject } from '@angular/core';
import { PortalStore } from '../../core/portal/portal.store';
import { applyTheme } from '../../core/portal/apply-theme';
import { ActivitiesComponent } from './activities.component';
import { MessagesCardComponent } from './messages-card.component';
import { NextUpComponent } from './next-up.component';
import { PaymentAlertComponent } from './payment-alert.component';
import { PaymentsCardComponent } from './payments-card.component';
import { StaysComponent } from './stays.component';
import { TripHeroComponent } from './trip-hero.component';
import { TripTimelineComponent } from './trip-timeline.component';

/**
 * Het dashboard van het boekerportaal: alles van de eigen boeking op één pagina, zonder te hoeven klikken.
 * De indeling hangt af van de breedte van de pagina zelf (container queries):
 *  - telefoon (< 600 px): één kolom, in volgorde van urgentie;
 *  - tablet (600–999 px): twee kolommen;
 *  - desktop (≥ 1000 px): een brede kolom met de planning en een smalle met betalen, eerstvolgende en documenten.
 * De volgorde in de HTML is de volgorde voor schermlezers en voor de telefoon; de rest regelt het raster.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PortalStore],
  imports: [
    TripHeroComponent, PaymentAlertComponent, NextUpComponent, TripTimelineComponent,
    PaymentsCardComponent, StaysComponent, ActivitiesComponent, MessagesCardComponent,
  ],
  template: `
    <div class="grid">
      <app-trip-hero class="hero" />
      <app-payment-alert class="alert" />
      <div class="col main">
        <app-trip-timeline class="timeline" />
        <app-stays class="stays" />
        <app-activities class="activities" />
      </div>
      <div class="col side">
        <app-next-up class="next" />
        <app-payments-card id="payments" class="payments" />
        <app-messages-card class="messages" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; container: page / inline-size; }
    /* Op telefoon en tablet doen de kolommen niet mee (display: contents): de kaarten staan dan als losse cellen in
       het raster en het raster bepaalt de volgorde. Alleen op desktop zijn het echte kolommen. */
    .col { display: contents; }
    .grid {
      display: grid; gap: 12px; font-size: 14px; line-height: 1.45;
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: "hero" "alert" "next" "timeline" "payments" "stays" "activities" "messages";
    }
    .hero { grid-area: hero; }
    .alert { grid-area: alert; }
    .next { grid-area: next; }
    .timeline { grid-area: timeline; }
    .payments { grid-area: payments; scroll-margin-top: 72px; }
    .stays { grid-area: stays; }
    .activities { grid-area: activities; }
    .messages { grid-area: messages; }

    @container page (min-width: 600px) {
      .grid {
        gap: 16px; font-size: 15px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-areas: "hero hero" "next payments" "timeline timeline" "stays activities" "messages messages";
      }
      .alert { display: none; }
    }
    @container page (min-width: 1000px) {
      .grid {
        gap: 20px; font-size: 16px; align-items: start;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        grid-template-areas: "hero hero" "main side";
      }
      .col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
      .main { grid-area: main; }
      .side { grid-area: side; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(PortalStore);

  constructor() {
    // De huisstijl van de organisatie kleurt het hele dashboard; bij weggaan komen de standaardkleuren terug.
    effect((onCleanup) => {
      const undo = applyTheme(this.store.overview.data()?.organization ?? null);
      onCleanup(undo);
    });
  }

  ngOnInit(): void {
    this.store.init();
  }
}
