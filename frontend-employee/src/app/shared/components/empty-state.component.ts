import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Lege toestand van een lijst (in `*matNoDataRow`, of los in een kaart). Twee gevallen:
 *  - de lijst is echt leeg: icoon, één zin wat hier komt en (via ng-content) de knop om iets aan te maken;
 *  - de lijst heeft wel gegevens, maar zoeken/filters laten niets over (`filtered`): zeg dat en hoe je verder kunt.
 * Opmaak komt van `.empty-state` in styles.scss.
 *
 *   <app-empty-state icon="hotel" [filtered]="allViews().length > 0" [message]="'accommodations.emptyState' | translate">
 *     <button mat-stroked-button class="act-create" ...>Nieuwe accommodatie</button>
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  host: { class: 'empty-state' },
  template: `
    @if (filtered()) {
      <mat-icon>search_off</mat-icon>
      <p class="empty-message">{{ 'common.noResults' | translate }}</p>
    } @else {
      <mat-icon>{{ icon() }}</mat-icon>
      <p class="empty-message">{{ message() }}</p>
      <ng-content />
    }
  `,
  styles: [`:host { display: block; }`],
})
export class EmptyStateComponent {
  /** Material-icoon voor een echt lege lijst (bv. het icoon uit het menu). */
  readonly icon = input('inbox');
  /** Zin voor een echt lege lijst: wat hier komt te staan. */
  readonly message = input('');
  /** Er zijn wel gegevens, maar zoeken of filters laten niets over. */
  readonly filtered = input(false);
}
