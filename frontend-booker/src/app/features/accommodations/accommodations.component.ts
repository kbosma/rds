import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

interface Accommodation {
  bookingLineId: string;
  accommodationName: string;
  supplierName: string;
  fromDate: string;
  untilDate: string;
}

@Component({
  selector: 'app-accommodations',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe],
  template: `
    <h1>{{ 'accommodations.title' | translate }}</h1>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (accommodations().length === 0) {
      <mat-card class="empty-card">
        <mat-card-content class="empty-content">
          <mat-icon>hotel</mat-icon>
          <p>{{ 'accommodations.noAccommodations' | translate }}</p>
        </mat-card-content>
      </mat-card>
    } @else {
      <div class="accommodation-list">
        @for (acc of accommodations(); track acc.bookingLineId) {
          <mat-card class="acc-card">
            <mat-card-content class="acc-content">
              <div class="acc-icon-col">
                <mat-icon class="acc-icon">hotel</mat-icon>
                <div class="nights-badge">{{ nights(acc) }} {{ 'accommodations.nights' | translate }}</div>
              </div>
              <div class="acc-details">
                <div class="acc-name">{{ acc.accommodationName }}</div>
                <div class="acc-supplier">
                  <mat-icon inline>business</mat-icon> {{ acc.supplierName }}
                </div>
                <div class="acc-dates">
                  <span class="date-block">
                    <span class="date-label">{{ 'accommodations.checkIn' | translate }}</span>
                    <span class="date-value">{{ acc.fromDate | date:'dd-MM-yyyy' }}</span>
                  </span>
                  <mat-icon class="arrow-icon">arrow_forward</mat-icon>
                  <span class="date-block">
                    <span class="date-label">{{ 'accommodations.checkOut' | translate }}</span>
                    <span class="date-value">{{ acc.untilDate | date:'dd-MM-yyyy' }}</span>
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    }
  `,
  styles: [`
    h1 { font-size: 22px; font-weight: 500; margin-bottom: 20px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .accommodation-list { display: grid; gap: 12px; }

    .acc-card { border-radius: 12px; border-left: 4px solid #1976d2; }
    .acc-content { display: flex; align-items: flex-start; gap: 16px; padding: 8px 0; }

    .acc-icon-col { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
    .acc-icon { font-size: 32px; width: 32px; height: 32px; color: #1976d2; }
    .nights-badge {
      background: #e3f2fd;
      color: #1565c0;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      white-space: nowrap;
    }

    .acc-details { flex: 1; min-width: 0; }
    .acc-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: #1a1a1a; }
    .acc-supplier {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 13px;
      color: #666;
      margin-bottom: 10px;
    }
    .acc-supplier mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .acc-dates { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .date-block { display: flex; flex-direction: column; }
    .date-label { font-size: 10px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
    .date-value { font-size: 14px; font-weight: 500; color: #333; }
    .arrow-icon { color: #bbb; font-size: 18px; width: 18px; height: 18px; }

    .empty-card { border-radius: 12px; }
    .empty-content { display: flex; flex-direction: column; align-items: center; padding: 32px; color: #888; }
    .empty-content mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 8px; }
  `],
})
export class AccommodationsComponent implements OnInit {
  private api = inject(ApiService);

  accommodations = signal<Accommodation[]>([]);
  loading = signal(true);

  nights(acc: Accommodation): number {
    const from = new Date(acc.fromDate);
    const until = new Date(acc.untilDate);
    return Math.round((until.getTime() - from.getTime()) / 86400000);
  }

  ngOnInit() {
    this.api.getAll<Accommodation>('booker-portal/accommodations').subscribe({
      next: (data) => {
        this.accommodations.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
