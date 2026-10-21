import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { PortalStore } from '../../core/portal/portal.store';
import { BOOKING_STATUSES } from '../../core/portal/trip-model';

/** De kop van het dashboard: aanhef, periode, reizigers, aftelling of dag van de reis, en de voortgang van de boeking. */
@Component({
  selector: 'app-trip-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <section class="hero" aria-labelledby="hero-title" [attr.aria-busy]="store.overview.status() === 'loading'">
      @switch (store.overview.status()) {
        @case ('loading') {
          <h1 id="hero-title" class="sr-only">{{ 'dashboard.loading' | translate }}</h1>
          <div class="loading" aria-hidden="true">
            <span class="sk s1"></span><span class="sk s2"></span><span class="sk s3"></span>
          </div>
        }
        @case ('error') {
          <h1 id="hero-title" class="sr-only">{{ 'dashboard.heroError' | translate }}</h1>
          <div role="alert" class="error">
            <p>{{ 'dashboard.heroError' | translate }}</p>
            <button mat-flat-button type="button" (click)="store.reload('overview')">{{ 'dashboard.retry' | translate }}</button>
          </div>
        }
        @default {
          @if (store.overview.data(); as data) {
            <div class="top">
              <div class="who">
                <div class="org">
                  @if (data.organization?.logoUrl; as logo) { <img class="logo" [src]="logo" alt="" /> }
                  <span>{{ data.organization?.name }} · {{ 'app.subtitle' | translate }}</span>
                </div>
                <h1 id="hero-title">
                  @if (data.booker?.firstname; as name) { {{ 'dashboard.greeting' | translate: { name: name } }} }
                  @else { {{ 'dashboard.greetingAnonymous' | translate }} }
                </h1>
                @if (store.tripStart(); as start) {
                  <p class="period">
                    {{ start | date: 'd MMMM' : undefined : locale() }} – {{ store.tripEnd() | date: 'd MMMM y' : undefined : locale() }}
                    @if (store.nights(); as n) {
                      · {{ (n === 1 ? 'dashboard.nightsOne' : 'dashboard.nightsOther') | translate: { count: n } }}
                    }
                  </p>
                } @else {
                  <p class="period">{{ 'dashboard.noDates' | translate }}</p>
                }
                <div class="chips">
                  <span class="chip"><mat-icon aria-hidden="true">confirmation_number</mat-icon> {{ data.booking.bookingNumber }}</span>
                  @if (data.travelers.length > 0) {
                    <span class="chip">
                      <mat-icon aria-hidden="true">group</mat-icon>
                      {{ (data.travelers.length === 1 ? 'dashboard.travelersOne' : 'dashboard.travelersOther') | translate: { count: data.travelers.length } }}
                    </span>
                    <span class="chip names">{{ travelerNames() }}</span>
                  }
                </div>
              </div>

              <div class="countdown" aria-live="polite">
                @switch (store.phase()) {
                  @case ('before') {
                    <strong>{{ store.daysUntilDeparture() }}</strong>
                    <span>{{ (store.daysUntilDeparture() === 1 ? 'dashboard.countdown.dayOne' : 'dashboard.countdown.dayOther') | translate }}</span>
                  }
                  @case ('during') {
                    <strong>{{ 'dashboard.countdown.day' | translate: { day: store.tripDay() } }}</strong>
                    <span>
                      {{ 'dashboard.countdown.of' | translate: { total: store.tripLengthDays() } }}
                      @if (store.nightsLeft() === 0) { · {{ 'dashboard.countdown.lastDay' | translate }} }
                      @else { · {{ (store.nightsLeft() === 1 ? 'dashboard.countdown.nightsLeftOne' : 'dashboard.countdown.nightsLeftOther') | translate: { count: store.nightsLeft() } }} }
                    </span>
                  }
                  @case ('after') {
                    <strong class="small">{{ 'dashboard.countdown.after' | translate }}</strong>
                  }
                }
              </div>
            </div>

            <div class="status">
              <div class="steps" role="img"
                   [attr.aria-label]="'dashboard.statusAria' | translate: { status: ('dashboard.status.' + data.booking.status) | translate }">
                @for (step of steps; track step; let i = $index) {
                  <i [class.done]="i < store.statusStep()" [class.current]="i === store.statusStep()"></i>
                }
              </div>
              <div class="step-labels" aria-hidden="true">
                <span>@if (store.statusStep() !== 0) { {{ 'dashboard.status.aanvraag' | translate }} }</span>
                <strong>{{ ('dashboard.status.' + data.booking.status) | translate }}</strong>
                <span>@if (store.statusStep() !== steps.length - 1) { {{ 'dashboard.status.afgerond' | translate }} }</span>
              </div>
            </div>
          }
        }
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .hero {
      color: #fff;
      border-radius: 16px;
      padding: 18px 20px;
      display: grid;
      gap: 16px;
      background: linear-gradient(135deg, var(--ui-primary-strong), color-mix(in srgb, var(--theme-primary) 85%, black));
    }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
    .who { min-width: 0; flex: 1 1 260px; }
    .org { display: flex; align-items: center; gap: 8px; font-size: .82em; opacity: .9; }
    .logo { height: 24px; max-width: 120px; object-fit: contain; background: #fff; border-radius: 6px; padding: 2px 4px; }
    h1 { color: #fff; margin: 4px 0 2px; font-size: 1.7em; font-weight: 600; line-height: 1.2; }
    .period { margin: 0; font-size: 1.02em; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: 99px;
      background: rgba(255, 255, 255, .18); font-size: .82em;
    }
    .chip mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .names { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .countdown { text-align: right; flex: none; }
    .countdown strong { display: block; font-size: 2.6em; font-weight: 600; line-height: 1; }
    .countdown strong.small { font-size: 1.2em; }
    .countdown span { font-size: .88em; opacity: .92; }
    .steps { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
    .steps i { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, .3); }
    .steps i.done { background: #fff; }
    .steps i.current { background: #f6c453; }
    .step-labels { display: flex; justify-content: space-between; gap: 8px; margin-top: 6px; font-size: .78em; opacity: .95; }
    .step-labels strong { font-weight: 600; }
    .loading { display: grid; gap: 12px; padding: 6px 0; }
    .sk { display: block; height: 16px; border-radius: 8px; background: rgba(255, 255, 255, .25); animation: pulse 1.4s ease-in-out infinite; }
    .s1 { width: 30%; } .s2 { width: 55%; height: 28px; } .s3 { width: 40%; }
    .error p { margin: 0 0 8px; }
    @keyframes pulse { 50% { opacity: .5; } }
    @media (prefers-reduced-motion: reduce) { .sk { animation: none; } }
    @container page (max-width: 599px) {
      .hero { padding: 16px; }
      h1 { font-size: 1.45em; }
      .countdown strong { font-size: 2.1em; }
      .countdown { text-align: left; }
    }
  `],
})
export class TripHeroComponent {
  protected readonly store = inject(PortalStore);
  protected readonly locale = inject(LanguageService).currentLang;
  protected readonly steps = BOOKING_STATUSES;

  protected travelerNames(): string {
    return (this.store.overview.data()?.travelers ?? []).map((t) => t.firstname).join(', ');
  }
}
