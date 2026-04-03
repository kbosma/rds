import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { Accommodation, Supplier, Address } from '../../shared/models';

export interface AccommodationDetailData {
  accommodation: Accommodation;
  supplier: Supplier | null;
  accommodationAddresses: Address[];
  supplierAddresses: Address[];
}

@Component({
  selector: 'app-accommodation-detail-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">hotel</mat-icon>
      {{ data.accommodation.name }}
    </h2>
    <mat-dialog-content>
      <div class="section-label">{{ 'common.code' | translate }}</div>
      <div class="section-value">{{ data.accommodation.key }}</div>

      <!-- Accommodation addresses -->
      <mat-divider></mat-divider>
      <h3 class="section-title">
        <mat-icon>location_on</mat-icon> {{ 'accommodations.addresses' | translate }}
      </h3>
      @if (data.accommodationAddresses.length > 0) {
        @for (addr of data.accommodationAddresses; track addr.addressId) {
          <div class="address-block">
            <span class="role-badge">{{ addr.addressrole }}</span>
            <div class="address-line">{{ formatAddress(addr) }}</div>
            <div class="address-line">{{ addr.postalcode }} {{ addr.city }}</div>
            <div class="address-line">{{ addr.country }}</div>
          </div>
        }
      } @else {
        <p class="empty-text">{{ 'accommodations.noAddresses' | translate }}</p>
      }

      <!-- Supplier -->
      <mat-divider></mat-divider>
      @if (data.supplier) {
        <h3 class="section-title">
          <mat-icon>business</mat-icon> {{ 'accommodations.supplierLabel' | translate }}
        </h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ 'common.name' | translate }}</span>
            <span class="info-value">{{ data.supplier.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ 'common.code' | translate }}</span>
            <span class="info-value">{{ data.supplier.key }}</span>
          </div>
        </div>

        @if (data.supplierAddresses.length > 0) {
          <h4 class="sub-title">{{ 'accommodations.supplierAddresses' | translate }}</h4>
          @for (addr of data.supplierAddresses; track addr.addressId) {
            <div class="address-block">
              <span class="role-badge">{{ addr.addressrole }}</span>
              <div class="address-line">{{ formatAddress(addr) }}</div>
              <div class="address-line">{{ addr.postalcode }} {{ addr.city }}</div>
              <div class="address-line">{{ addr.country }}</div>
            </div>
          }
        }
      } @else {
        <p class="empty-text">{{ 'accommodations.noSupplierLinked' | translate }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close><mat-icon>close</mat-icon> {{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
    }
    .title-icon {
      color: #1976d2;
    }
    .section-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-value {
      font-size: 15px;
      margin-bottom: 12px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 500;
      margin: 16px 0 8px;
      color: #333;
    }
    .section-title mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #1976d2;
    }
    .sub-title {
      font-size: 14px;
      font-weight: 500;
      margin: 12px 0 6px;
      color: #555;
    }
    .role-badge {
      display: inline-block;
      background: #e3f2fd;
      color: #1565c0;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 15px;
      margin-top: 2px;
    }
    .address-block {
      padding-left: 28px;
      margin-bottom: 12px;
    }
    .address-line {
      font-size: 14px;
      color: #444;
      line-height: 1.6;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
    mat-divider {
      margin: 8px 0;
    }
  `],
})
export class AccommodationDetailDialogComponent {
  data: AccommodationDetailData = inject(MAT_DIALOG_DATA);

  formatAddress(address: Address): string {
    let line = address.street;
    if (address.housenumber) {
      line += ' ' + address.housenumber;
      if (address.housenumberAddition) {
        line += address.housenumberAddition;
      }
    }
    return line;
  }
}
