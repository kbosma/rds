import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { SupplierService } from './supplier.service';
import { SupplierAddressService } from '../accommodations/supplier-address.service';
import { AddressService } from '../accommodations/address.service';
import { AuthService } from '../../core/auth/auth.service';
import { Supplier, Address } from '../../shared/models';

export interface SupplierView {
  supplier: Supplier;
  addressLine: string | null;
}

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    RowActionsComponent,
    TranslatePipe,
  ],
  template: `
    <div class="header">
      <h1>{{ 'suppliers.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" class="new-btn" (click)="newSupplier()">
          <mat-icon>add</mat-icon> {{ 'suppliers.newSupplier' | translate }}
        </button>
      }
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (input)="applyFilter($event)" [placeholder]="'suppliers.searchPlaceholder' | translate" />
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
            <td mat-cell *matCellDef="let view">{{ view.supplier.name }}</td>
          </ng-container>

          <ng-container matColumnDef="key">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.code' | translate }}</th>
            <td mat-cell *matCellDef="let view">{{ view.supplier.key }}</td>
          </ng-container>

          <ng-container matColumnDef="address">
            <th mat-header-cell *matHeaderCellDef>{{ 'suppliers.address' | translate }}</th>
            <td mat-cell *matCellDef="let view">{{ view.addressLine || ('suppliers.noAddress' | translate) }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let view" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewSupplier(view.supplier)" (edit)="editSupplier(view.supplier)"
                               (remove)="deleteSupplier(view.supplier)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'suppliers.noSuppliersFound' | translate }}
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

      <p class="count-text">{{ 'suppliers.countFound' | translate: { count: filtered().length } }}</p>
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
      text-align: center;
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
export class SupplierListComponent implements OnInit {
  private supplierService = inject(SupplierService);
  private supplierAddressService = inject(SupplierAddressService);
  private addressService = inject(AddressService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  canCreate = this.authService.hasAuthority('SUPPLIER_CREATE');
  canView = this.authService.hasAuthority('SUPPLIER_READ');
  canEdit = this.authService.hasAuthority('SUPPLIER_UPDATE');
  canDelete = this.authService.hasAuthority('SUPPLIER_DELETE');

  displayedColumns = ['name', 'key', 'address', 'actions'];
  allViews = signal<SupplierView[]>([]);
  filtered = signal<SupplierView[]>([]);
  loading = signal(true);
  pageIndex = signal(0);
  pageSize = signal(25);
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.loadSuppliers();
  }

  private loadSuppliers() {
    forkJoin({
      suppliers: this.supplierService.getAll(),
      supAddresses: this.supplierAddressService.getAll(),
      addresses: this.addressService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ suppliers, supAddresses, addresses }) => {
        const addressMap = new Map(addresses.map(a => [a.addressId, a]));

        const views: SupplierView[] = suppliers.map(sup => {
          const supAddrLinks = supAddresses.filter(sa => sa.supplierId === sup.supplierId);
          const supplierAddrs = supAddrLinks
            .map(link => addressMap.get(link.addressId))
            .filter((a): a is Address => !!a);

          let addressLine: string | null = null;
          if (supplierAddrs.length > 0) {
            const first = supplierAddrs[0];
            const parts = [first.street];
            if (first.housenumber) {
              parts.push(String(first.housenumber));
              if (first.housenumberAddition) {
                parts[parts.length - 1] += first.housenumberAddition;
              }
            }
            parts.push(first.city);
            addressLine = parts.join(' ');
          }

          return { supplier: sup, addressLine };
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
          v.supplier.name.toLowerCase().includes(value)
          || v.supplier.key.toLowerCase().includes(value)
        )
      );
    }
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  newSupplier() {
    this.router.navigate(['/suppliers', 'new']);
  }

  /** Inzien: de detailpagina alleen-lezen. */
  viewSupplier(supplier: Supplier) {
    this.router.navigate(['/suppliers', supplier.supplierId], { queryParams: { readonly: 'true' } });
  }

  editSupplier(supplier: Supplier) {
    this.router.navigate(['/suppliers', supplier.supplierId]);
  }

  async deleteSupplier(supplier: Supplier) {
    const message = this.translate.instant('suppliers.deleteConfirm', { name: supplier.name })
      + ' ' + this.translate.instant('suppliers.deleteCascadeWarning');
    if (!await this.confirmService.confirmDelete(message)) return;

    this.supplierService.delete(supplier.supplierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('suppliers.removed'), this.translate.instant('common.close'), { duration: 3000 });
          this.loadSuppliers();
        },
        error: (err) => {
          const key = deleteErrorKey(err) === 'common.deleteBlocked' ? 'common.deleteBlocked' : 'suppliers.removeError';
          this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 6000 });
        },
      });
  }
}
