import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { DocumentService } from './document.service';
import { BookingService } from '../bookings/booking.service';
import { Document } from '../../shared/models';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSortModule,
    MatPaginatorModule,
    TranslateModule,
  ],
  template: `
    <h1>{{ 'documents.title' | translate }}</h1>

    <mat-form-field class="search-field" appearance="outline">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <input matInput [ngModel]="searchTerm()" (ngModelChange)="searchTerm.set($event)" [placeholder]="'documents.searchPlaceholder' | translate">
      <mat-icon matSuffix>search</mat-icon>
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="pagedDocuments()" matSort (matSortChange)="onSort($event)" class="full-width">
          <ng-container matColumnDef="displayname">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'documents.displayname' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <div class="document-name">
                <mat-icon class="doc-icon">description</mat-icon>
                {{ row.displayname }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="bookingNumber">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'bookings.bookingNumber' | translate }}</th>
            <td mat-cell *matCellDef="let row">
              <span class="booking-number">{{ bookingNumberMap().get(row.bookingId) ?? '—' }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.date' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.createdAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="modifiedAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'documents.modifiedAt' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.modifiedAt | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'documents.noDocumentsFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="filteredDocuments().length"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>
    }
  `,
  styles: [`
    h1 {
      margin: 0 0 20px;
      font-size: 24px;
      font-weight: 500;
    }
    .search-field {
      width: 100%;
      margin-bottom: 16px;
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
    .document-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .doc-icon {
      color: #1976d2;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .booking-number {
      color: #1976d2;
      font-weight: 500;
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
export class DocumentListComponent implements OnInit {
  private documentService = inject(DocumentService);
  private bookingService = inject(BookingService);
  private destroyRef = inject(DestroyRef);

  documents = signal<Document[]>([]);
  bookingNumberMap = signal<Map<string, string>>(new Map());
  loading = signal(true);
  searchTerm = signal('');
  pageIndex = signal(0);
  pageSize = signal(25);
  sortActive = signal('createdAt');
  sortDirection = signal<'asc' | 'desc' | ''>('desc');

  displayedColumns = ['displayname', 'bookingNumber', 'createdAt', 'modifiedAt'];

  filteredDocuments = computed(() => {
    const term = this.searchTerm().toLowerCase();
    let result = this.documents();
    if (term) {
      const bnMap = this.bookingNumberMap();
      result = result.filter((d) =>
        (d.displayname ?? '').toLowerCase().includes(term) ||
        (bnMap.get(d.bookingId) ?? '').toLowerCase().includes(term)
      );
    }

    const active = this.sortActive();
    const direction = this.sortDirection();
    if (active && direction) {
      result = [...result].sort((a, b) => {
        let aVal: string;
        let bVal: string;
        if (active === 'bookingNumber') {
          const bnMap = this.bookingNumberMap();
          aVal = bnMap.get(a.bookingId) ?? '';
          bVal = bnMap.get(b.bookingId) ?? '';
        } else {
          aVal = String((a as unknown as Record<string, unknown>)[active] ?? '');
          bVal = String((b as unknown as Record<string, unknown>)[active] ?? '');
        }
        const compare = aVal.localeCompare(bVal, undefined, { numeric: true });
        return direction === 'asc' ? compare : -compare;
      });
    }

    return result;
  });

  pagedDocuments = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredDocuments().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    forkJoin({
      documents: this.documentService.getAll(),
      bookings: this.bookingService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ documents, bookings }) => {
        this.documents.set(documents);
        const bnMap = new Map(bookings.map(b => [b.bookingId, b.bookingNumber]));
        this.bookingNumberMap.set(bnMap);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSort(sort: Sort) {
    this.sortActive.set(sort.active);
    this.sortDirection.set(sort.direction);
    this.pageIndex.set(0);
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
