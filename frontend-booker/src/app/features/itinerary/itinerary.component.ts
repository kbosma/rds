import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

interface ItineraryItem {
  itineraryItemId: string;
  type: 'ACCOMMODATION' | 'ACTIVITY';
  description: string;
  startDate: string;
  endDate: string;
  location: string;
}

interface GanttRow {
  item: ItineraryItem;
  lane: number;
  leftPct: number;
  widthPct: number;
  startDay: number;
  endDay: number;
}

@Component({
  selector: 'app-itinerary',
  standalone: true,
  imports: [DatePipe, MatProgressSpinnerModule, MatIconModule, MatCardModule, MatTooltipModule, TranslatePipe],
  template: `
    <h1>{{ 'itinerary.title' | translate }}</h1>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (items().length === 0) {
      <mat-card class="empty-card">
        <mat-card-content class="empty-content">
          <mat-icon>map</mat-icon>
          <p>{{ 'itinerary.noItems' | translate }}</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <!-- Legend -->
      <div class="legend">
        <span class="legend-item">
          <span class="legend-dot accommodation"></span>
          {{ 'itinerary.accommodation' | translate }}
        </span>
        <span class="legend-item">
          <span class="legend-dot activity"></span>
          {{ 'itinerary.activity' | translate }}
        </span>
      </div>

      <!-- Gantt chart -->
      <div class="gantt-wrapper">
        <!-- Day header -->
        <div class="gantt-header">
          @for (day of dayHeaders(); track day.date) {
            <div class="day-col" [class.weekend]="day.isWeekend" [style.width.%]="100 / dayHeaders().length">
              <div class="day-name">{{ day.date | date:'EEE' }}</div>
              <div class="day-num">{{ day.date | date:'d' }}</div>
              <div class="month-label">{{ day.showMonth ? (day.date | date:'MMM') : '' }}</div>
            </div>
          }
        </div>

        <!-- Grid + bars -->
        <div class="gantt-body" [style.height.px]="ganttHeight()">
          <!-- Vertical day lines -->
          @for (day of dayHeaders(); track day.date; let i = $index) {
            <div class="day-line" [class.weekend-bg]="day.isWeekend"
                 [style.left.%]="(i / dayHeaders().length) * 100"
                 [style.width.%]="100 / dayHeaders().length"></div>
          }

          <!-- Today line -->
          @if (todayPct() >= 0 && todayPct() <= 100) {
            <div class="today-line" [style.left.%]="todayPct()"></div>
          }

          <!-- Bars -->
          @for (row of ganttRows(); track row.item.itineraryItemId) {
            <div class="gantt-bar"
                 [class.accommodation]="row.item.type === 'ACCOMMODATION'"
                 [class.activity]="row.item.type === 'ACTIVITY'"
                 [style.left.%]="row.leftPct"
                 [style.width.%]="row.widthPct"
                 [style.top.px]="row.lane * 52 + 8"
                 [matTooltip]="tooltipText(row.item)"
                 matTooltipPosition="above">
              <mat-icon class="bar-icon">{{ row.item.type === 'ACCOMMODATION' ? 'hotel' : 'directions_run' }}</mat-icon>
              <span class="bar-label">{{ row.item.description }}</span>
              @if (row.item.type === 'ACTIVITY') {
                <span class="bar-time">{{ row.item.startDate | date:'HH:mm' }}–{{ row.item.endDate | date:'HH:mm' }}</span>
              }
              @if (row.item.location) {
                <span class="bar-location">· {{ row.item.location }}</span>
              }
            </div>
          }
        </div>
      </div>

      <!-- Item list below chart -->
      <div class="item-list">
        @for (item of items(); track item.itineraryItemId) {
          <div class="list-item" [class.accommodation]="item.type === 'ACCOMMODATION'" [class.activity]="item.type === 'ACTIVITY'">
            <mat-icon>{{ item.type === 'ACCOMMODATION' ? 'hotel' : 'directions_run' }}</mat-icon>
            <div class="list-details">
              <div class="list-description">{{ item.description }}</div>
              <div class="list-meta">
                @if (item.location) { <span>{{ item.location }}</span> }
                @if (item.type === 'ACTIVITY') {
                  <span>{{ item.startDate | date:'dd-MM-yyyy HH:mm' }} – {{ item.endDate | date:'HH:mm' }}</span>
                } @else {
                  <span>{{ item.startDate | date:'dd-MM-yyyy' }} – {{ item.endDate | date:'dd-MM-yyyy' }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    h1 { font-size: 22px; font-weight: 500; margin-bottom: 16px; }
    .loading { display: flex; justify-content: center; padding: 40px; }

    /* Legend */
    .legend { display: flex; gap: 20px; margin-bottom: 16px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
    .legend-dot.accommodation { background: #1976d2; }
    .legend-dot.activity { background: #2e7d32; }

    /* Gantt wrapper */
    .gantt-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      overflow-x: auto;
      margin-bottom: 24px;
    }

    /* Header */
    .gantt-header {
      display: flex;
      border-bottom: 2px solid #e0e0e0;
      min-width: 600px;
    }
    .day-col {
      flex: 1;
      text-align: center;
      padding: 6px 2px 4px;
      border-right: 1px solid #f0f0f0;
      min-width: 32px;
    }
    .day-col.weekend { background: #fafafa; }
    .day-name { font-size: 10px; color: #999; text-transform: uppercase; }
    .day-num { font-size: 14px; font-weight: 600; color: #333; line-height: 1.2; }
    .month-label { font-size: 9px; color: #aaa; height: 12px; }

    /* Body */
    .gantt-body {
      position: relative;
      min-width: 600px;
    }
    .day-line {
      position: absolute;
      top: 0;
      bottom: 0;
      border-right: 1px solid #f0f0f0;
      box-sizing: border-box;
    }
    .day-line.weekend-bg { background: #fafafa; }
    .today-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e53935;
      z-index: 3;
      opacity: 0.7;
    }
    .today-line::before {
      content: 'Vandaag';
      position: absolute;
      top: 2px;
      left: 4px;
      font-size: 9px;
      color: #e53935;
      white-space: nowrap;
    }

    /* Bars */
    .gantt-bar {
      position: absolute;
      height: 36px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      box-sizing: border-box;
      cursor: default;
      overflow: hidden;
      z-index: 2;
      transition: filter 0.15s;
      min-width: 36px;
    }
    .gantt-bar:hover { filter: brightness(1.1); }
    .gantt-bar.accommodation {
      background: #1976d2;
      color: white;
    }
    .gantt-bar.activity {
      background: #2e7d32;
      color: white;
    }
    .bar-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    .bar-label { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-time { font-size: 11px; opacity: 0.85; white-space: nowrap; flex-shrink: 0; font-weight: 500; }
    .bar-location { font-size: 11px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Item list */
    .item-list { display: flex; flex-direction: column; gap: 8px; }
    .list-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border-left: 4px solid;
    }
    .list-item.accommodation { border-color: #1976d2; }
    .list-item.accommodation mat-icon { color: #1976d2; }
    .list-item.activity { border-color: #2e7d32; }
    .list-item.activity mat-icon { color: #2e7d32; }
    .list-description { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
    .list-meta { font-size: 12px; color: #888; display: flex; gap: 12px; }

    /* Empty */
    .empty-card { border-radius: 12px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; padding: 32px; color: #888; }
    .empty-content mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
  `],
})
export class ItineraryComponent implements OnInit {
  private api = inject(ApiService);

  items = signal<ItineraryItem[]>([]);
  loading = signal(true);

  private rangeStart = computed(() => {
    if (!this.items().length) return new Date();
    return new Date(Math.min(...this.items().map(i => new Date(i.startDate).getTime())));
  });

  private rangeEnd = computed(() => {
    if (!this.items().length) return new Date();
    return new Date(Math.max(...this.items().map(i => new Date(i.endDate).getTime())));
  });

  private totalDays = computed(() => {
    const diff = this.rangeEnd().getTime() - this.rangeStart().getTime();
    return Math.max(1, Math.ceil(diff / 86400000) + 1);
  });

  dayHeaders = computed(() => {
    const days: { date: Date; isWeekend: boolean; showMonth: boolean }[] = [];
    const start = new Date(this.rangeStart());
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < this.totalDays(); i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      days.push({
        date: d,
        isWeekend: dow === 0 || dow === 6,
        showMonth: i === 0 || d.getDate() === 1,
      });
    }
    return days;
  });

  todayPct = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(this.rangeStart());
    start.setHours(0, 0, 0, 0);
    const dayIndex = (today.getTime() - start.getTime()) / 86400000;
    return (dayIndex / this.totalDays()) * 100;
  });

  ganttRows = computed((): GanttRow[] => {
    const rangeStart = new Date(this.rangeStart());
    rangeStart.setHours(0, 0, 0, 0);
    const total = this.totalDays();
    const lanes: { endFrac: number }[] = [];

    return this.items().map(item => {
      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);

      let startFrac: number;
      let endFrac: number;

      if (item.type === 'ACCOMMODATION') {
        // Day-based: snap to midnight
        const s = new Date(itemStart); s.setHours(0, 0, 0, 0);
        const e = new Date(itemEnd); e.setHours(0, 0, 0, 0);
        startFrac = (s.getTime() - rangeStart.getTime()) / 86400000;
        endFrac = (e.getTime() - rangeStart.getTime()) / 86400000 + 1;
      } else {
        // Activity: use exact datetime for fractional positioning
        startFrac = (itemStart.getTime() - rangeStart.getTime()) / 86400000;
        endFrac = (itemEnd.getTime() - rangeStart.getTime()) / 86400000;
      }

      // Find a free lane (no overlap)
      let lane = lanes.findIndex(l => l.endFrac <= startFrac);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push({ endFrac });
      } else {
        lanes[lane].endFrac = endFrac;
      }

      const startDay = Math.floor(startFrac);
      const endDay = Math.ceil(endFrac) - 1;
      const leftPct = (startFrac / total) * 100;
      const widthPct = Math.max(((endFrac - startFrac) / total) * 100, 1);

      return { item, lane, leftPct, widthPct, startDay, endDay };
    });
  });

  ganttHeight = computed(() => {
    const lanes = this.ganttRows().reduce((max, r) => Math.max(max, r.lane), 0) + 1;
    return lanes * 52 + 16;
  });

  tooltipText(item: ItineraryItem): string {
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const name = `${item.description}${item.location ? ' · ' + item.location : ''}`;
    if (item.type === 'ACTIVITY') {
      const day = start.toLocaleDateString('nl-NL', dateOpts);
      const t1 = start.toLocaleTimeString('nl-NL', timeOpts);
      const t2 = end.toLocaleTimeString('nl-NL', timeOpts);
      return `${name}\n${day}  ${t1} – ${t2}`;
    }
    return `${name}\n${start.toLocaleDateString('nl-NL', dateOpts)} – ${end.toLocaleDateString('nl-NL', dateOpts)}`;
  }

  ngOnInit() {
    this.api.getAll<ItineraryItem>('booker-portal/itinerary').subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
