import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AgendaKind } from '../../core/portal/trip-model';

/** De titel van een onderdeel van de reis: "Check-in {naam}", "Check-out {naam}" of de naam van de activiteit. */
@Component({
  selector: 'app-event-title',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @switch (kind()) {
      @case ('checkin') { {{ 'dashboard.event.checkin' | translate: { name: label() } }} }
      @case ('checkout') { {{ 'dashboard.event.checkout' | translate: { name: label() } }} }
      @default { {{ label() }} }
    }
  `,
})
export class EventTitleComponent {
  readonly kind = input.required<AgendaKind>();
  readonly label = input.required<string>();
}
