import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SupplierService } from './supplier.service';
import { SupplierAddressService } from '../accommodations/supplier-address.service';
import { AddressService } from '../accommodations/address.service';
import { AuthService } from '../../core/auth/auth.service';
import { Supplier, Address, SupplierAddress } from '../../shared/models';

export interface SupplierView {
  supplier: Supplier;
  addressLine: string | null;
}

const ACCENT_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#00838f'];

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'suppliers.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" routerLink="/suppliers/new">
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
      <div class="card-grid">
        @for (view of filtered(); track view.supplier.supplierId; let i = $index) {
          <mat-card class="supplier-card">
            <div class="accent-bar" [style.background-color]="getAccentColor(i)"></div>
            <mat-card-content>
              <h3 class="sup-name">{{ view.supplier.name }}</h3>
              <span class="sup-code">{{ view.supplier.key }}</span>
              <mat-divider></mat-divider>
              <div class="sup-detail">
                <mat-icon>location_on</mat-icon>
                <span>{{ view.addressLine || ('suppliers.noAddress' | translate) }}</span>
              </div>
            </mat-card-content>
            <mat-card-actions align="end">
              <a mat-button color="primary" [routerLink]="'/suppliers/' + view.supplier.supplierId"><mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}</a>
              @if (canDelete) {
                <button mat-button color="warn" (click)="deleteSupplier(view.supplier)"><mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}</button>
              }
            </mat-card-actions>
          </mat-card>
        }
      </div>

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
    .card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .supplier-card {
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }
    .accent-bar {
      height: 6px;
      width: 100%;
    }
    .sup-name {
      font-size: 18px;
      font-weight: 500;
      margin: 8px 0 4px;
    }
    .sup-code {
      font-size: 13px;
      color: #888;
      display: block;
      margin-bottom: 12px;
    }
    .sup-detail {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      color: #666;
      font-size: 14px;
    }
    .sup-detail mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #888;
    }
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
    @media (max-width: 1200px) {
      .card-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 800px) {
      .card-grid {
        grid-template-columns: 1fr;
      }
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
  private destroyRef = inject(DestroyRef);

  canCreate = this.authService.hasAuthority('SUPPLIER_CREATE');
  canDelete = this.authService.hasAuthority('SUPPLIER_DELETE');

  allViews = signal<SupplierView[]>([]);
  filtered = signal<SupplierView[]>([]);
  loading = signal(true);

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

  getAccentColor(index: number): string {
    return ACCENT_COLORS[index % ACCENT_COLORS.length];
  }

  deleteSupplier(supplier: Supplier) {
    if (!confirm(this.translate.instant('suppliers.deleteConfirm', { name: supplier.name }))) return;

    this.supplierService.delete(supplier.supplierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('suppliers.removed'), this.translate.instant('common.close'), { duration: 3000 });
          this.loadSuppliers();
        },
        error: () => {
          this.snackBar.open(this.translate.instant('suppliers.removeError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }
}
