import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AccommodationService } from './accommodation.service';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { AccommodationAddressService } from './accommodation-address.service';
import { AddressService } from './address.service';
import { SupplierAddressService } from './supplier-address.service';
import { SupplierService } from '../suppliers/supplier.service';
import {
  Accommodation, Supplier, Address,
  AccommodationSupplier, AccommodationAddress, SupplierAddress,
} from '../../shared/models';
import { AccommodationDetailDialogComponent, AccommodationDetailData } from './accommodation-detail-dialog.component';

export interface AccommodationView {
  accommodation: Accommodation;
  supplierName: string | null;
  addressLine: string | null;
  // For detail dialog
  supplier: Supplier | null;
  accommodationAddress: Address | null;
  accommodationAddressRole: string | null;
  supplierAddress: Address | null;
  supplierAddressRole: string | null;
}

const ACCENT_COLORS = ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#00838f'];

@Component({
  selector: 'app-accommodation-list',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
  ],
  template: `
    <div class="header">
      <h1>Accommodaties</h1>
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon> NIEUWE ACCOMMODATIE
      </button>
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>Zoeken</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (input)="applyFilter($event)" placeholder="Zoek op naam, code of leverancier..." />
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="card-grid">
        @for (view of filtered(); track view.accommodation.accommodationId; let i = $index) {
          <mat-card class="accommodation-card">
            <div class="accent-bar" [style.background-color]="getAccentColor(i)"></div>
            <mat-card-content>
              <h3 class="acc-name">{{ view.accommodation.name }}</h3>
              <span class="acc-code">{{ view.accommodation.key }}</span>
              <mat-divider></mat-divider>
              <div class="acc-detail">
                <mat-icon>business</mat-icon>
                <span>{{ view.supplierName || 'Geen leverancier' }}</span>
              </div>
              <div class="acc-detail">
                <mat-icon>location_on</mat-icon>
                <span>{{ view.addressLine || 'Geen adres' }}</span>
              </div>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button color="primary" (click)="openDetails(view)">DETAILS</button>
              <button mat-button color="primary">BEWERKEN</button>
            </mat-card-actions>
          </mat-card>
        }
      </div>

      <p class="count-text">{{ filtered().length }} accommodaties gevonden</p>
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
    .accommodation-card {
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }
    .accent-bar {
      height: 6px;
      width: 100%;
    }
    .acc-name {
      font-size: 18px;
      font-weight: 500;
      margin: 8px 0 4px;
    }
    .acc-code {
      font-size: 13px;
      color: #888;
      display: block;
      margin-bottom: 12px;
    }
    .acc-detail {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      color: #666;
      font-size: 14px;
    }
    .acc-detail mat-icon {
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
export class AccommodationListComponent implements OnInit {
  private accommodationService = inject(AccommodationService);
  private accommodationSupplierService = inject(AccommodationSupplierService);
  private accommodationAddressService = inject(AccommodationAddressService);
  private supplierService = inject(SupplierService);
  private addressService = inject(AddressService);
  private supplierAddressService = inject(SupplierAddressService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  allViews = signal<AccommodationView[]>([]);
  filtered = signal<AccommodationView[]>([]);
  loading = signal(true);

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

          // Find accommodation address via accommodation-address koppeltabel
          const accAddr = accAddresses.find(aa => aa.accommodationId === acc.accommodationId);
          const accommodationAddress = accAddr ? addressMap.get(accAddr.addressId) ?? null : null;
          const accommodationAddressRole = accommodationAddress?.addressrole ?? null;

          // Find supplier address via supplier-address koppeltabel
          let supplierAddress: Address | null = null;
          let supplierAddressRole: string | null = null;
          if (supplier) {
            const supAddr = supAddresses.find(sa => sa.supplierId === supplier.supplierId);
            supplierAddress = supAddr ? addressMap.get(supAddr.addressId) ?? null : null;
            supplierAddressRole = supplierAddress?.addressrole ?? null;
          }

          // Build address line for card
          let addressLine: string | null = null;
          if (accommodationAddress) {
            const parts = [accommodationAddress.street];
            if (accommodationAddress.housenumber) {
              parts.push(String(accommodationAddress.housenumber));
              if (accommodationAddress.housenumberAddition) {
                parts[parts.length - 1] += accommodationAddress.housenumberAddition;
              }
            }
            parts.push(accommodationAddress.city);
            addressLine = parts.join(' ');
          }

          return {
            accommodation: acc,
            supplierName: supplier?.name ?? null,
            addressLine,
            supplier,
            accommodationAddress,
            accommodationAddressRole,
            supplierAddress,
            supplierAddressRole,
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

  getAccentColor(index: number): string {
    return ACCENT_COLORS[index % ACCENT_COLORS.length];
  }

  openDetails(view: AccommodationView) {
    const data: AccommodationDetailData = {
      accommodation: view.accommodation,
      supplier: view.supplier,
      accommodationAddress: view.accommodationAddress,
      accommodationAddressRole: view.accommodationAddressRole,
      supplierAddress: view.supplierAddress,
      supplierAddressRole: view.supplierAddressRole,
    };
    this.dialog.open(AccommodationDetailDialogComponent, {
      data,
      width: '600px',
    });
  }
}
