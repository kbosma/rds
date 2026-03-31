import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Accommodation, Supplier, Address } from '../../shared/models';

export interface AccommodationDetailData {
  accommodation: Accommodation;
  supplier: Supplier | null;
  accommodationAddress: Address | null;
  accommodationAddressRole: string | null;
  supplierAddress: Address | null;
  supplierAddressRole: string | null;
}

@Component({
  selector: 'app-accommodation-detail-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">hotel</mat-icon>
      {{ data.accommodation.name }}
    </h2>
    <mat-dialog-content>
      <div class="section-label">Code</div>
      <div class="section-value">{{ data.accommodation.key }}</div>

      @if (data.accommodationAddress) {
        <mat-divider></mat-divider>
        <h3 class="section-title">
          <mat-icon>location_on</mat-icon> Accommodatie-adres
          @if (data.accommodationAddressRole) {
            <span class="role-badge">{{ data.accommodationAddressRole }}</span>
          }
        </h3>
        <div class="address-block">
          <div class="address-line">{{ formatAddress(data.accommodationAddress) }}</div>
          <div class="address-line">{{ data.accommodationAddress.postalcode }} {{ data.accommodationAddress.city }}</div>
          <div class="address-line">{{ data.accommodationAddress.country }}</div>
        </div>
      }

      @if (data.supplier) {
        <mat-divider></mat-divider>
        <h3 class="section-title">
          <mat-icon>business</mat-icon> Leverancier
        </h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Naam</span>
            <span class="info-value">{{ data.supplier.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Code</span>
            <span class="info-value">{{ data.supplier.key }}</span>
          </div>
        </div>

        @if (data.supplierAddress) {
          <h4 class="sub-title">
            Adres leverancier
            @if (data.supplierAddressRole) {
              <span class="role-badge">{{ data.supplierAddressRole }}</span>
            }
          </h4>
          <div class="address-block">
            <div class="address-line">{{ formatAddress(data.supplierAddress) }}</div>
            <div class="address-line">{{ data.supplierAddress.postalcode }} {{ data.supplierAddress.city }}</div>
            <div class="address-line">{{ data.supplierAddress.country }}</div>
          </div>
        }
      } @else {
        <mat-divider></mat-divider>
        <p class="empty-text">Geen leverancier gekoppeld.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>SLUITEN</button>
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
      display: flex;
      align-items: center;
      gap: 8px;
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
      margin-bottom: 8px;
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
