import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { Booking, BookingService } from './booking.service';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
  ],
  template: `
    <div class="header">
      <h1>Boekingen</h1>
      <a mat-raised-button color="primary" routerLink="new">
        <mat-icon>add</mat-icon> NIEUWE BOEKING
      </a>
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>Zoeken</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (keyup)="applyFilters()" #searchInput placeholder="Zoek op boekingnummer, booker..." />
    </mat-form-field>

    <div class="filter-row">
      <mat-form-field appearance="outline" class="date-field">
        <mat-label>Periode van</mat-label>
        <input matInput [matDatepicker]="filterFromPicker"
               [(ngModel)]="filterFromDate" (dateChange)="applyFilters()" />
        <mat-datepicker-toggle matSuffix [for]="filterFromPicker"></mat-datepicker-toggle>
        <mat-datepicker #filterFromPicker></mat-datepicker>
      </mat-form-field>

      <mat-form-field appearance="outline" class="date-field">
        <mat-label>Periode tot</mat-label>
        <input matInput [matDatepicker]="filterUntilPicker"
               [(ngModel)]="filterUntilDate" (dateChange)="applyFilters()" />
        <mat-datepicker-toggle matSuffix [for]="filterUntilPicker"></mat-datepicker-toggle>
        <mat-datepicker #filterUntilPicker></mat-datepicker>
      </mat-form-field>

      <mat-form-field appearance="outline" class="status-field">
        <mat-label>Status</mat-label>
        <mat-select multiple [(ngModel)]="selectedStatuses" (selectionChange)="applyFilters()">
          @for (status of availableStatuses; track status) {
            <mat-option [value]="status">{{ status }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <button mat-stroked-button class="clear-btn" (click)="clearFilters()">
        <mat-icon>clear</mat-icon> Wissen
      </button>
    </div>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="full-width booking-table">
          <ng-container matColumnDef="bookingNumber">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Boekingnummer</th>
            <td mat-cell *matCellDef="let row">
              <a [routerLink]="row.bookingId" class="booking-link">{{ row.bookingNumber }}</a>
            </td>
          </ng-container>

          <ng-container matColumnDef="fromDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Van</th>
            <td mat-cell *matCellDef="let row">{{ row.fromDate | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="untilDate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Tot</th>
            <td mat-cell *matCellDef="let row">{{ row.untilDate | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="statusName">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-badge" [class]="'status-' + row.bookingStatus">
                {{ row.bookingStatus }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="totalSum">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Bedrag</th>
            <td mat-cell *matCellDef="let row">&euro; {{ row.totalSum | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acties</th>
            <td mat-cell *matCellDef="let row">
              <a mat-icon-button [routerLink]="row.bookingId" color="primary">
                <mat-icon>edit</mat-icon>
              </a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              Geen boekingen gevonden.
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    }
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .filter-field {
      width: 100%;
    }
    .filter-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .date-field {
      flex: 1;
    }
    .status-field {
      flex: 1.5;
    }
    .clear-btn {
      margin-top: 4px;
      height: 56px;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width {
      width: 100%;
    }
    .booking-table th {
      font-weight: 600;
      color: #555;
      font-size: 13px;
    }
    .alt-row {
      background-color: #fafafa;
    }
    .booking-link {
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
    }
    .booking-link:hover {
      text-decoration: underline;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }
    .status-aanvraag { background: #fff3e0; color: #e65100; }
    .status-offerte { background: #e8f5e9; color: #2e7d32; }
    .status-boeking { background: #e3f2fd; color: #1565c0; }
    .status-voorschot { background: #e0f2f1; color: #00695c; }
    .status-betaald { background: #e0f2f1; color: #00695c; }
    .status-afgerond { background: #f3e5f5; color: #6a1b9a; }
    .no-data {
      text-align: center;
      padding: 24px;
      color: #888;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `],
})
export class BookingListComponent implements OnInit {
  private bookingService = inject(BookingService);
  private destroyRef = inject(DestroyRef);

  displayedColumns = ['bookingNumber', 'fromDate', 'untilDate', 'statusName', 'totalSum', 'actions'];
  dataSource = new MatTableDataSource<Booking>();
  loading = signal(true);

  availableStatuses = ['aanvraag', 'offerte', 'boeking', 'voorschot', 'betaald', 'afgerond'];

  allBookings: Booking[] = [];
  filterFromDate: Date | null = null;
  filterUntilDate: Date | null = null;
  selectedStatuses: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('searchInput') searchInput!: { nativeElement: HTMLInputElement };

  ngOnInit() {
    this.bookingService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (bookings) => {
        this.allBookings = bookings;
        this.dataSource.data = bookings;
        this.loading.set(false);
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
          this.dataSource.sortingDataAccessor = (item, property) => {
            if (property === 'statusName') {
              return item.bookingStatus;
            }
            return (item as unknown as Record<string, string>)[property] ?? '';
          };
        });
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilters() {
    const searchValue = this.searchInput?.nativeElement?.value?.trim().toLowerCase() ?? '';

    let filtered = this.allBookings;

    // Text search filter
    if (searchValue) {
      filtered = filtered.filter(b =>
        b.bookingNumber.toLowerCase().includes(searchValue)
        || String(b.totalSum).includes(searchValue)
      );
    }

    // Period overlap filter: booking overlaps [filterFrom, filterUntil]
    // Overlap condition: booking.fromDate <= filterUntil AND booking.untilDate >= filterFrom
    if (this.filterFromDate || this.filterUntilDate) {
      const filterFrom = this.filterFromDate ? this.toDateString(this.filterFromDate) : null;
      const filterUntil = this.filterUntilDate ? this.toDateString(this.filterUntilDate) : null;

      filtered = filtered.filter(b => {
        if (filterFrom && b.untilDate < filterFrom) return false;
        if (filterUntil && b.fromDate > filterUntil) return false;
        return true;
      });
    }

    // Status filter
    if (this.selectedStatuses.length > 0) {
      filtered = filtered.filter(b => this.selectedStatuses.includes(b.bookingStatus));
    }

    this.dataSource.data = filtered;
  }

  clearFilters() {
    this.filterFromDate = null;
    this.filterUntilDate = null;
    this.selectedStatuses = [];
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }
    this.dataSource.data = this.allBookings;
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
