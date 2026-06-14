import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { BookerService } from './booker.service';
import { BookingSelectDialogComponent, BookingSelectDialogData } from './booking-select-dialog.component';
import { BookingService } from '../bookings/booking.service';
import { Booker, Booking } from '../../shared/models';

@Component({
  selector: 'app-booker-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'bookers.title' | translate }}</h1>
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (keyup)="applyFilter($event)" [placeholder]="'bookers.searchPlaceholder' | translate" />
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.name' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.firstname }} {{ row.prefix }} {{ row.lastname }}</td>
          </ng-container>

          <ng-container matColumnDef="emailaddress">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.email' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="email-link">{{ row.emailaddress }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="telephone">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.telephone' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.telephone }}</td>
          </ng-container>

          <ng-container matColumnDef="birthdate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.birthdate' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.birthdate | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"
              class="clickable-row"
              (click)="onBookerClick(row)"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'bookers.noBookersFound' | translate }}
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
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width {
      width: 100%;
    }
    .alt-row {
      background-color: #fafafa;
    }
    .email-link {
      color: #1976d2;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover {
      background-color: #e3f2fd;
    }
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
export class BookerListComponent implements OnInit {
  private bookerService = inject(BookerService);
  private bookingService = inject(BookingService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  displayedColumns = ['name', 'emailaddress', 'telephone', 'birthdate'];
  dataSource = new MatTableDataSource<Booker>();
  loading = signal(true);
  private allBookings: Booking[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    forkJoin({
      bookers: this.bookerService.getAll(),
      bookings: this.bookingService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ bookers, bookings }) => {
        this.allBookings = bookings;
        this.dataSource.data = bookers;
        this.dataSource.sortingDataAccessor = (item, property) => {
          if (property === 'name') {
            return `${item.firstname} ${item.prefix} ${item.lastname}`.trim();
          }
          return (item as unknown as Record<string, string>)[property] ?? '';
        };
        this.dataSource.filterPredicate = (data, filter) => {
          const searchStr = `${data.firstname} ${data.prefix} ${data.lastname} ${data.emailaddress} ${data.telephone}`.toLowerCase();
          return searchStr.includes(filter);
        };
        this.loading.set(false);
        setTimeout(() => {
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        });
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  onBookerClick(booker: Booker) {
    const bookings = this.allBookings.filter(b => b.bookerId === booker.bookerId);

    if (bookings.length === 0) {
      return;
    }

    if (bookings.length === 1) {
      this.router.navigate(['/bookings', bookings[0].bookingId]);
      return;
    }

    const bookerName = `${booker.firstname} ${booker.prefix ?? ''} ${booker.lastname}`.replace(/\s+/g, ' ').trim();
    const data: BookingSelectDialogData = { bookerName, bookings };
    this.dialog.open(BookingSelectDialogComponent, { data, width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bookingId: string | undefined) => {
        if (bookingId) {
          this.router.navigate(['/bookings', bookingId]);
        }
      });
  }
}
