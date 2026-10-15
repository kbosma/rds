import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AccommodationService } from './accommodation.service';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { AccommodationAddressService } from './accommodation-address.service';
import { AddressService } from './address.service';
import { SupplierAddressService } from './supplier-address.service';
import { SupplierService } from '../suppliers/supplier.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import {
  Accommodation, Supplier, Address,
  AccommodationSupplier, AccommodationAddress, SupplierAddress,
} from '../../shared/models';
import { AccommodationDetailDialogComponent, AccommodationDetailData } from './accommodation-detail-dialog.component';

export interface AccommodationView {
  accommodation: Accommodation;
  supplierName: string | null;
  addressLine: string | null;
  supplier: Supplier | null;
  accommodationAddresses: Address[];
  supplierAddresses: Address[];
}

@Component({
  selector: 'app-accommodation-list',
  standalone: true,
  imports: [
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatSnackBarModule,
    RowActionsComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    TranslatePipe,
  ],
  template: `
    <div class="header">
      <h1>{{ 'accommodations.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" routerLink="/accommodations/new">
          <mat-icon>add</mat-icon> {{ 'accommodations.newAccommodation' | translate }}
        </button>
      }
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (input)="applyFilter($event)" [placeholder]="'accommodations.searchPlaceholder' | translate" />
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="paged()" class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | translate }}</th>
            <td mat-cell *matCellDef="let view">{{ view.accommodation.name }}</td>
          </ng-container>

          <ng-container matColumnDef="key">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.code' | translate }}</th>
            <td mat-cell *matCellDef="let view">{{ view.accommodation.key }}</td>
          </ng-container>

          <ng-container matColumnDef="supplier">
            <th mat-header-cell *matHeaderCellDef>{{ 'accommodations.supplier' | translate }}</th>
            <td mat-cell *matCellDef="let view">{{ view.supplierName || ('accommodations.noSupplier' | translate) }}</td>
          </ng-container>

          <ng-container matColumnDef="address">
            <th mat-header-cell *matHeaderCellDef>{{ 'accommodations.address' | translate }}</th>
            <td mat-cell *matCellDef="let view">{{ view.addressLine || ('accommodations.noAddress' | translate) }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let view" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="openDetails(view)" (edit)="editAccommodation(view)"
                               (remove)="deleteAccommodation(view)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'accommodations.noAccommodationsFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="filtered().length"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>

      <p class="count-text">{{ 'accommodations.countFound' | translate: { count: filtered().length } }}</p>
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
    .full-width { width: 100%; }
    .alt-row { background-color: #fafafa; }
    .actions-header { text-align: right; }
    .actions-cell { width: 1%; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    .count-text {
      margin-top: 16px;
      color: #888;
      font-size: 14px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `],
})
export class AccommodationListComponent implements OnInit {
  private accommodationService = inject(AccommodationService);
  private accommodationSupplierService = inject(AccommodationSupplierService);
  private accommodationAddressService = inject(AccommodationAddressService);
  private supplierService = inject(SupplierService);
  private addressService = inject(AddressService);
  private supplierAddressService = inject(SupplierAddressService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  private snackBar = inject(MatSnackBar);

  canCreate = this.authService.hasAuthority('ACCOMMODATION_CREATE');
  canView = this.authService.hasAuthority('ACCOMMODATION_READ');
  canEdit = this.authService.hasAuthority('ACCOMMODATION_UPDATE');
  canDelete = this.authService.hasAuthority('ACCOMMODATION_DELETE');

  displayedColumns = ['name', 'key', 'supplier', 'address', 'actions'];
  pageIndex = signal(0);
  pageSize = signal(25);

  allViews = signal<AccommodationView[]>([]);
  filtered = signal<AccommodationView[]>([]);
  loading = signal(true);
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    forkJoin({
      accommodations: this.accommodationService.getAll(),
      accSuppliers: this.accommodationSupplierService.getAll(),
      suppliers: this.supplierService.getAll(),
      accAddresses: this.accommodationAddressService.getAll(),
      addresses: this.addressService.getAll(),
      supAddresses: this.supplierAddressService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ accommodations, accSuppliers, suppliers, accAddresses, addresses, supAddresses }) => {
        const supplierMap = new Map(suppliers.map(s => [s.supplierId, s]));
        const addressMap = new Map(addresses.map(a => [a.addressId, a]));

        const views: AccommodationView[] = accommodations.map(acc => {
          // Find supplier via accommodation-supplier koppeltabel
          const accSup = accSuppliers.find(as => as.accommodationId === acc.accommodationId);
          const supplier = accSup ? supplierMap.get(accSup.supplierId) ?? null : null;

          // Find all accommodation addresses via koppeltabel
          const accAddrLinks = accAddresses.filter(aa => aa.accommodationId === acc.accommodationId);
          const accommodationAddrs = accAddrLinks
            .map(link => addressMap.get(link.addressId))
            .filter((a): a is Address => !!a);

          // Find all supplier addresses via koppeltabel
          let supplierAddrs: Address[] = [];
          if (supplier) {
            const supAddrLinks = supAddresses.filter(sa => sa.supplierId === supplier.supplierId);
            supplierAddrs = supAddrLinks
              .map(link => addressMap.get(link.addressId))
              .filter((a): a is Address => !!a);
          }

          // Build address line for card (first address)
          let addressLine: string | null = null;
          if (accommodationAddrs.length > 0) {
            const first = accommodationAddrs[0];
            const parts = [first.street];
            if (first.housenumber) {
              parts.push(String(first.housenumber));
              if (first.housenumberAddition) {
                parts[parts.length - 1] += first.housenumberAddition;
              }
            }
            parts.push(first.city);
            addressLine = parts.join(' ');
            if (accommodationAddrs.length > 1) {
              addressLine += ' ' + this.translate.instant('accommodations.moreAddresses', { count: accommodationAddrs.length - 1 });
            }
          }

          return {
            accommodation: acc,
            supplierName: supplier?.name ?? null,
            addressLine,
            supplier,
            accommodationAddresses: accommodationAddrs,
            supplierAddresses: supplierAddrs,
          };
        });

        this.allViews.set(views);
        this.filtered.set(views);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.pageIndex.set(0);
    if (!value) {
      this.filtered.set(this.allViews());
    } else {
      this.filtered.set(
        this.allViews().filter(v =>
          v.accommodation.name.toLowerCase().includes(value)
          || v.accommodation.key.toLowerCase().includes(value)
          || (v.supplierName?.toLowerCase().includes(value) ?? false)
        )
      );
    }
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  editAccommodation(view: AccommodationView) {
    this.router.navigate(['/accommodations', view.accommodation.accommodationId]);
  }

  async deleteAccommodation(view: AccommodationView) {
    const message = this.translate.instant('common.deleteConfirmItem', { name: view.accommodation.name })
      + ' ' + this.translate.instant('accommodations.deleteCascadeWarning');
    if (!await this.confirmService.confirmDelete(message)) return;
    this.accommodationService.delete(view.accommodation.accommodationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const id = view.accommodation.accommodationId;
          this.allViews.set(this.allViews().filter(v => v.accommodation.accommodationId !== id));
          this.filtered.set(this.filtered().filter(v => v.accommodation.accommodationId !== id));
          this.snackBar.open(this.translate.instant('common.deleted'), this.translate.instant('common.close'), { duration: 3000 });
        },
        error: (err) => this.snackBar.open(this.translate.instant(deleteErrorKey(err)), this.translate.instant('common.close'), { duration: 6000 }),
      });
  }

  openDetails(view: AccommodationView) {
    const data: AccommodationDetailData = {
      accommodation: view.accommodation,
      supplier: view.supplier,
      accommodationAddresses: view.accommodationAddresses,
      supplierAddresses: view.supplierAddresses,
    };
    this.dialog.open(AccommodationDetailDialogComponent, {
      data,
      width: '600px',
    });
  }
}
