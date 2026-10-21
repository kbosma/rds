import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LoadStatus } from '../../core/portal/loadable';

let nextId = 0;

/**
 * De schil van elke kaart op het dashboard: titel, en daaronder per toestand een skeleton, een foutmelding met
 * "Opnieuw proberen", een lege-toestand of de eigenlijke inhoud. Zo breekt een kaart die faalt de rest niet.
 */
@Component({
  selector: 'app-section-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <section class="card" [attr.aria-labelledby]="headingId" [attr.aria-busy]="status() === 'loading'">
      <h2 class="card-title" [id]="headingId">
        <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
        <span>{{ titleKey() | translate }}</span>
      </h2>
      @switch (status()) {
        @case ('loading') {
          <div class="skeleton" aria-hidden="true">
            <span class="sk w80"></span><span class="sk w60"></span><span class="sk w70"></span>
          </div>
        }
        @case ('error') {
          <div class="error" role="alert">
            <p>{{ 'dashboard.cardError' | translate }}</p>
            <button mat-stroked-button type="button" (click)="retry.emit()">{{ 'dashboard.retry' | translate }}</button>
          </div>
        }
        @default {
          @if (empty()) {
            <p class="empty">{{ emptyKey() | translate }}</p>
          } @else {
            <ng-content />
          }
        }
      }
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; height: 100%; }
    .card {
      background: #fff;
      border: 1px solid var(--ui-line);
      border-radius: 14px;
      padding: 16px;
      height: 100%;
      box-sizing: border-box;
    }
    .card-title {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 12px; font-size: 1.05em; font-weight: 600; color: var(--theme-card-title);
    }
    .card-title mat-icon { color: var(--theme-primary); font-size: 22px; width: 22px; height: 22px; }
    .empty { margin: 0; color: var(--ui-text-muted); }
    .error p { margin: 0 0 8px; color: var(--ui-text-muted); }
    .skeleton { display: grid; gap: 10px; }
    .sk { display: block; height: 14px; border-radius: 7px; background: var(--ui-line); animation: pulse 1.4s ease-in-out infinite; }
    .w80 { width: 80%; } .w70 { width: 70%; } .w60 { width: 60%; }
    @keyframes pulse { 50% { opacity: .45; } }
    @media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
  `],
})
export class SectionCardComponent {
  readonly titleKey = input.required<string>();
  readonly icon = input.required<string>();
  readonly status = input<LoadStatus>('ready');
  readonly empty = input(false);
  readonly emptyKey = input('');
  readonly retry = output<void>();

  protected readonly headingId = `section-title-${nextId++}`;
}
