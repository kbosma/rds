import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * De vaste actie-iconen op elke regel van een lijst: inzien (alleen lezen), bewerken en verwijderen.
 * Een icoon verschijnt alleen als de aanroeper het toestaat; de aanroeper baseert dat op de authorities
 * van de resource (`*_READ`, `*_UPDATE`, `*_DELETE`), nooit op rollen. Extra, lijstspecifieke acties
 * (bv. downloaden) kunnen als inhoud worden meegegeven.
 *
 * De klik wordt niet doorgegeven aan de regel (er is geen regelklik meer, maar zo blijft het veilig).
 */
@Component({
  selector: 'app-row-actions',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, TranslatePipe],
  template: `
    <div class="row-actions">
      <ng-content></ng-content>
      @if (canView()) {
        <button type="button" mat-icon-button class="action-view"
                [matTooltip]="'common.view' | translate" [attr.aria-label]="'common.view' | translate"
                (click)="$event.stopPropagation(); view.emit()">
          <mat-icon>visibility</mat-icon>
        </button>
      }
      @if (canEdit()) {
        <button type="button" mat-icon-button color="primary" class="action-edit"
                [matTooltip]="'common.edit' | translate" [attr.aria-label]="'common.edit' | translate"
                (click)="$event.stopPropagation(); edit.emit()">
          <mat-icon>edit</mat-icon>
        </button>
      }
      @if (canDelete()) {
        <button type="button" mat-icon-button color="warn" class="action-delete"
                [matTooltip]="'common.delete' | translate" [attr.aria-label]="'common.delete' | translate"
                (click)="$event.stopPropagation(); remove.emit()">
          <mat-icon>delete</mat-icon>
        </button>
      }
    </div>
  `,
  styles: [`
    .row-actions { display: flex; justify-content: flex-end; align-items: center; white-space: nowrap; }
  `],
})
export class RowActionsComponent {
  readonly canView = input(false);
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();
}
