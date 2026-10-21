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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BookerService } from './booker.service';
import { BookerDialogComponent, BookerDialogData } from './booker-dialog.component';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
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
    MatTooltipModule,
    MatSnackBarModule,
    RowActionsComponent,
    TranslatePipe,
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

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewBooker(row)" (edit)="editBooker(row)" (remove)="deleteBooker(row)">
                @if (canCreateBooking) {
                  <button type="button" mat-icon-button class="action-new-booking act-create"
                          [matTooltip]="'bookers.newBookingForBooker' | translate"
                          [attr.aria-label]="'bookers.newBookingForBooker' | translate"
                          (click)="createBookingForBooker(row)">
                    <mat-icon>post_add</mat-icon>
                  </button>
                }
              </app-row-actions>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

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
      color: var(--theme-primary);
    }
    .actions-header { text-align: right; }
    .actions-cell { width: 1%; }
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
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  canCreateBooking = this.authService.hasAuthority('BOOKING_CREATE');
  canView = this.authService.hasAuthority('BOOKING_READ');
  canEdit = this.authService.hasAuthority('BOOKING_UPDATE');
  canDelete = this.authService.hasAuthority('BOOKING_DELETE');

  displayedColumns = ['name', 'emailaddress', 'telephone', 'birthdate', 'actions'];
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
        // Prospects horen in de prospects-lijst, niet onder de boekers.
        this.dataSource.data = bookers.filter(b => b.status !== 'prospect');
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

  /**
   * Start een nieuwe boeking voor deze booker: opent het concept-scherm met de
   * booker als voorgevulde hoofdboeker. De echte boeking wordt pas aangemaakt bij
   * de eerste actie daar. Waarschuwt eerst als de booker al een lopende boeking heeft.
   */
  async createBookingForBooker(booker: Booker) {
    const hasOngoing = this.allBookings.some(
      b => b.bookerId === booker.bookerId && b.bookingStatus !== 'afgerond');
    if (hasOngoing && !await this.confirmService.confirm(this.translate.instant('bookings.ongoingBookingWarning'))) return;
    this.router.navigate(['/bookings', 'new'], { queryParams: { bookerId: booker.bookerId } });
  }

  viewBooker(booker: Booker) {
    const data: BookerDialogData = { booker, readOnly: true };
    this.dialog.open(BookerDialogComponent, { data, width: '760px', maxWidth: '95vw' });
  }

  editBooker(booker: Booker) {
    const data: BookerDialogData = { booker, readOnly: false };
    this.dialog.open(BookerDialogComponent, { data, width: '760px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) this.reloadBookers();
      });
  }

  async deleteBooker(booker: Booker) {
    const name = `${booker.firstname} ${booker.prefix ?? ''} ${booker.lastname}`.replace(/\s+/g, ' ').trim();
    if (!await this.confirmService.confirmDelete(this.translate.instant('common.deleteConfirmItem', { name }))) return;
    this.bookerService.delete(booker.bookerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dataSource.data = this.dataSource.data.filter(b => b.bookerId !== booker.bookerId);
          this.notify('common.deleted');
        },
        error: (err) => this.notify(deleteErrorKey(err)),
      });
  }

  private reloadBookers() {
    this.bookerService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((bookers) => {
        this.dataSource.data = bookers.filter(b => b.status !== 'prospect');
      });
  }

  private notify(messageKey: string) {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), { duration: 3000 });
  }
}
