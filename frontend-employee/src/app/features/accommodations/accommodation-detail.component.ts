import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, switchMap } from 'rxjs';
import { AccommodationService } from './accommodation.service';
import { AddressService } from './address.service';
import { AccommodationAddressService } from './accommodation-address.service';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { SupplierService } from '../suppliers/supplier.service';
import { AuthService } from '../../core/auth/auth.service';
import { Accommodation, Address, Supplier, AccommodationSupplier } from '../../shared/models';

@Component({
  selector: 'app-accommodation-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatSelectModule,
    TranslateModule,
  ],
  template: `
    <a routerLink="/accommodations" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'accommodations.backToAccommodations' | translate }}
    </a>

    <h1 class="page-title">
      {{ isNew() ? ('accommodations.newTitle' | translate) : ('accommodations.editTitle' | translate) + ' — ' + currentName() }}
    </h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <!-- Accommodation form -->
      <mat-card class="detail-card">
        <mat-card-header>
          <mat-card-title>{{ 'accommodations.details' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="accommodationForm" (ngSubmit)="onSaveAccommodation()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.code' | translate }}</mat-label>
              <input matInput formControlName="key" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.name' | translate }}</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>

            <div class="actions">
              <a mat-button routerLink="/accommodations"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</a>
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="savingAccommodation() || accommodationForm.invalid">
                @if (savingAccommodation()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Suppliers section (only for existing accommodations) -->
      @if (!isNew()) {
        <mat-card class="detail-card section-card">
          <mat-card-header>
            <mat-card-title>{{ 'accommodations.suppliers' | translate }}</mat-card-title>
            @if (canEditAddresses && !showSupplierSelect()) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="startAddSupplier()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
          </mat-card-header>
          <mat-card-content>
            @if (showSupplierSelect()) {
              <div class="address-form-container">
                <h4 class="form-subtitle">{{ 'accommodations.addSupplier' | translate }}</h4>
                <div class="row">
                  <mat-form-field appearance="outline" class="flex-3">
                    <mat-label>{{ 'accommodations.selectSupplier' | translate }}</mat-label>
                    <mat-select [formControl]="supplierSelectControl">
                      @for (sup of availableSuppliers(); track sup.supplierId) {
                        <mat-option [value]="sup.supplierId">{{ sup.name }} ({{ sup.key }})</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                </div>
                <div class="actions">
                  <button mat-button type="button" (click)="cancelSupplierSelect()"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
                  <button mat-raised-button color="primary" type="button"
                          (click)="onLinkSupplier()"
                          [disabled]="!supplierSelectControl.value">
                    <mat-icon>link</mat-icon> {{ 'accommodations.linkSupplier' | translate }}
                  </button>
                </div>
              </div>
              <mat-divider class="form-divider"></mat-divider>
            }

            @if (linkedSuppliers().length > 0) {
              @for (sup of linkedSuppliers(); track sup.supplierId) {
                <div class="address-card">
                  <div class="address-card-header">
                    <div class="address-info">
                      <span class="role-badge supplier-badge">{{ sup.key }}</span>
                      <div class="address-line">{{ sup.name }}</div>
                    </div>
                    @if (canEditAddresses) {
                      <div class="address-actions">
                        <a mat-icon-button color="primary" [routerLink]="'/suppliers/' + sup.supplierId">
                          <mat-icon>open_in_new</mat-icon>
                        </a>
                        <button mat-icon-button color="warn" (click)="unlinkSupplier(sup)">
                          <mat-icon>link_off</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else if (!showSupplierSelect()) {
              <p class="empty-text">{{ 'accommodations.noSuppliersLinked' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Addresses section (only for existing accommodations) -->
      @if (!isNew()) {
        <mat-card class="detail-card section-card">
          <mat-card-header>
            <mat-card-title>{{ 'accommodations.addresses' | translate }}</mat-card-title>
            @if (canEditAddresses && !showAddressForm()) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="startAddAddress()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
          </mat-card-header>
          <mat-card-content>
            <!-- Add/edit address form -->
            @if (showAddressForm()) {
              <div class="address-form-container">
                <h4 class="form-subtitle">{{ editingAddressId() ? ('accommodations.editAddress' | translate) : ('accommodations.newAddress' | translate) }}</h4>
                <form [formGroup]="addressForm">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>{{ 'accommodations.addressRole' | translate }}</mat-label>
                    <mat-select formControlName="addressrole">
                      <mat-option value="woon">{{ 'accommodations.roleWoon' | translate }}</mat-option>
                      <mat-option value="factuur">{{ 'accommodations.roleFactuur' | translate }}</mat-option>
                      <mat-option value="accommodatie">{{ 'accommodations.roleAccommodatie' | translate }}</mat-option>
                      <mat-option value="leverancier">{{ 'accommodations.roleLeverancier' | translate }}</mat-option>
                    </mat-select>
                  </mat-form-field>

                  <div class="row">
                    <mat-form-field appearance="outline" class="flex-3">
                      <mat-label>{{ 'accommodations.street' | translate }}</mat-label>
                      <input matInput formControlName="street" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>{{ 'accommodations.houseNumber' | translate }}</mat-label>
                      <input matInput type="number" formControlName="housenumber" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>{{ 'accommodations.addition' | translate }}</mat-label>
                      <input matInput formControlName="housenumberAddition" />
                    </mat-form-field>
                  </div>

                  <div class="row">
                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>{{ 'accommodations.postalCode' | translate }}</mat-label>
                      <input matInput formControlName="postalcode" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="flex-2">
                      <mat-label>{{ 'accommodations.city' | translate }}</mat-label>
                      <input matInput formControlName="city" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="flex-1">
                      <mat-label>{{ 'accommodations.country' | translate }}</mat-label>
                      <input matInput formControlName="country" />
                    </mat-form-field>
                  </div>

                  <div class="actions">
                    <button mat-button type="button" (click)="cancelAddressForm()"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
                    <button mat-raised-button color="primary" type="button"
                            (click)="onSaveAddress()"
                            [disabled]="savingAddress() || addressForm.invalid">
                      @if (savingAddress()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        @if (editingAddressId()) {
                          <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                        } @else {
                          <ng-container><mat-icon>add</mat-icon> {{ 'common.add' | translate }}</ng-container>
                        }
                      }
                    </button>
                  </div>
                </form>
              </div>
              <mat-divider class="form-divider"></mat-divider>
            }

            <!-- Address list -->
            @if (addresses().length > 0) {
              @for (addr of addresses(); track addr.addressId) {
                <div class="address-card">
                  <div class="address-card-header">
                    <div class="address-info">
                      <span class="role-badge">{{ addr.addressrole }}</span>
                      <div class="address-line">{{ formatAddress(addr) }}</div>
                      <div class="address-line secondary">{{ addr.postalcode }} {{ addr.city }}, {{ addr.country }}</div>
                    </div>
                    @if (canEditAddresses) {
                      <div class="address-actions">
                        <button mat-icon-button color="primary" (click)="startEditAddress(addr)">
                          <mat-icon>edit</mat-icon>
                        </button>
                        <button mat-icon-button color="warn" (click)="deleteAddress(addr)">
                          <mat-icon>delete</mat-icon>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            } @else if (!showAddressForm()) {
              <p class="empty-text">{{ 'accommodations.noAddressesLinked' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
      font-size: 22px;
      font-weight: 500;
      margin: 8px 0 24px;
    }
    .detail-card {
      border-radius: 12px;
      max-width: 700px;
    }
    .detail-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header-btn {
      margin-left: auto;
    }
    .section-card {
      margin-top: 24px;
    }
    .full-width { width: 100%; }
    .row {
      display: flex;
      gap: 16px;
    }
    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .flex-3 { flex: 3; }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .address-form-container {
      padding: 8px 0 16px;
    }
    .form-subtitle {
      font-size: 15px;
      font-weight: 500;
      margin: 0 0 12px;
      color: #555;
    }
    .form-divider {
      margin-bottom: 16px;
    }
    .address-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }
    .address-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .address-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
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
      width: fit-content;
    }
    .supplier-badge {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .address-line {
      font-size: 14px;
      color: #333;
    }
    .address-line.secondary {
      color: #666;
      font-size: 13px;
    }
    .address-actions {
      display: flex;
      gap: 4px;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
  `],
})
export class AccommodationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private accommodationService = inject(AccommodationService);
  private addressService = inject(AddressService);
  private accommodationAddressService = inject(AccommodationAddressService);
  private accommodationSupplierService = inject(AccommodationSupplierService);
  private supplierService = inject(SupplierService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  canEditAddresses = this.authService.hasAuthority('ACCOMMODATION_UPDATE');

  isNew = signal(true);
  loading = signal(false);
  savingAccommodation = signal(false);
  savingAddress = signal(false);
  currentName = signal('');

  addresses = signal<Address[]>([]);
  showAddressForm = signal(false);
  editingAddressId = signal<string | null>(null);

  // Supplier linking
  linkedSuppliers = signal<Supplier[]>([]);
  allSuppliers = signal<Supplier[]>([]);
  availableSuppliers = signal<Supplier[]>([]);
  showSupplierSelect = signal(false);
  supplierSelectControl = new FormControl<string | null>(null);

  private accommodationId: string | null = null;
  private accSupplierLinks: AccommodationSupplier[] = [];

  accommodationForm = this.fb.group({
    key: ['', Validators.required],
    name: ['', Validators.required],
  });

  addressForm = this.fb.group({
    addressrole: ['', Validators.required],
    street: ['', Validators.required],
    housenumber: [null as number | null, Validators.required],
    housenumberAddition: [''],
    postalcode: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.accommodationId = id;
      this.loading.set(true);
      this.loadAccommodation(id);
    }
  }

  private loadAccommodation(id: string) {
    forkJoin({
      accommodation: this.accommodationService.getById(id),
      accAddresses: this.accommodationAddressService.getAll(),
      allAddresses: this.addressService.getAll(),
      accSuppliers: this.accommodationSupplierService.getAll(),
      allSuppliers: this.supplierService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ accommodation, accAddresses, allAddresses, accSuppliers, allSuppliers }) => {
        this.currentName.set(accommodation.name);
        this.accommodationForm.patchValue({
          key: accommodation.key,
          name: accommodation.name,
        });

        // Addresses
        const linkedAddressIds = accAddresses
          .filter(aa => aa.accommodationId === id)
          .map(aa => aa.addressId);

        const addressMap = new Map(allAddresses.map(a => [a.addressId, a]));
        this.addresses.set(
          linkedAddressIds
            .map(aid => addressMap.get(aid))
            .filter((a): a is Address => !!a)
        );

        // Suppliers
        this.allSuppliers.set(allSuppliers);
        this.accSupplierLinks = accSuppliers;
        this.updateLinkedSuppliers(accSuppliers, allSuppliers, id);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('accommodations.notFound'), this.translate.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/accommodations']);
      },
    });
  }

  private updateLinkedSuppliers(accSuppliers: AccommodationSupplier[], allSuppliers: Supplier[], accommodationId: string) {
    const linkedSupplierIds = new Set(
      accSuppliers
        .filter(as => as.accommodationId === accommodationId)
        .map(as => as.supplierId)
    );

    const supplierMap = new Map(allSuppliers.map(s => [s.supplierId, s]));
    this.linkedSuppliers.set(
      [...linkedSupplierIds]
        .map(sid => supplierMap.get(sid))
        .filter((s): s is Supplier => !!s)
    );
    this.availableSuppliers.set(
      allSuppliers.filter(s => !linkedSupplierIds.has(s.supplierId))
    );
  }

  onSaveAccommodation() {
    if (this.accommodationForm.invalid) return;
    this.savingAccommodation.set(true);

    const { key, name } = this.accommodationForm.value;
    const payload: Partial<Accommodation> = { key: key!, name: name! };

    if (this.isNew()) {
      this.accommodationService.create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (acc) => {
            this.savingAccommodation.set(false);
            this.snackBar.open(this.translate.instant('accommodations.created'), this.translate.instant('common.close'), { duration: 3000 });
            this.router.navigate(['/accommodations', acc.accommodationId]);
          },
          error: () => {
            this.savingAccommodation.set(false);
            this.snackBar.open(this.translate.instant('accommodations.createError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    } else {
      this.accommodationService.update(this.accommodationId!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingAccommodation.set(false);
            this.currentName.set(name!);
            this.snackBar.open(this.translate.instant('accommodations.saved'), this.translate.instant('common.close'), { duration: 3000 });
          },
          error: () => {
            this.savingAccommodation.set(false);
            this.snackBar.open(this.translate.instant('accommodations.saveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    }
  }

  // --- Supplier linking ---

  startAddSupplier() {
    this.supplierSelectControl.reset();
    this.showSupplierSelect.set(true);
  }

  cancelSupplierSelect() {
    this.showSupplierSelect.set(false);
    this.supplierSelectControl.reset();
  }

  onLinkSupplier() {
    const supplierId = this.supplierSelectControl.value;
    if (!supplierId || !this.accommodationId) return;

    this.accommodationSupplierService.create({
      accommodationId: this.accommodationId,
      supplierId,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.cancelSupplierSelect();
        this.snackBar.open(this.translate.instant('accommodations.supplierLinked'), this.translate.instant('common.close'), { duration: 3000 });
        this.reloadSuppliers();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('accommodations.supplierLinkError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  unlinkSupplier(supplier: Supplier) {
    if (!this.accommodationId) return;
    if (!confirm(this.translate.instant('accommodations.unlinkSupplierConfirm', { name: supplier.name }))) return;

    this.accommodationSupplierService.delete(this.accommodationId, supplier.supplierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('accommodations.supplierUnlinked'), this.translate.instant('common.close'), { duration: 3000 });
          this.reloadSuppliers();
        },
        error: () => {
          this.snackBar.open(this.translate.instant('accommodations.supplierUnlinkError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  private reloadSuppliers() {
    if (!this.accommodationId) return;

    forkJoin({
      accSuppliers: this.accommodationSupplierService.getAll(),
      allSuppliers: this.supplierService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ accSuppliers, allSuppliers }) => {
        this.allSuppliers.set(allSuppliers);
        this.accSupplierLinks = accSuppliers;
        this.updateLinkedSuppliers(accSuppliers, allSuppliers, this.accommodationId!);
      },
    });
  }

  // --- Address management ---

  startAddAddress() {
    this.editingAddressId.set(null);
    this.addressForm.reset();
    this.showAddressForm.set(true);
  }

  startEditAddress(address: Address) {
    this.editingAddressId.set(address.addressId);
    this.addressForm.patchValue({
      addressrole: address.addressrole,
      street: address.street,
      housenumber: address.housenumber,
      housenumberAddition: address.housenumberAddition ?? '',
      postalcode: address.postalcode,
      city: address.city,
      country: address.country,
    });
    this.showAddressForm.set(true);
  }

  cancelAddressForm() {
    this.showAddressForm.set(false);
    this.editingAddressId.set(null);
    this.addressForm.reset();
  }

  onSaveAddress() {
    if (this.addressForm.invalid || !this.accommodationId) return;
    this.savingAddress.set(true);

    const { addressrole, street, housenumber, housenumberAddition, postalcode, city, country } = this.addressForm.value;
    const payload: Partial<Address> = {
      street: street!,
      housenumber: housenumber!,
      housenumberAddition: housenumberAddition || null,
      postalcode: postalcode!,
      city: city!,
      country: country!,
      addressrole: addressrole!,
    };

    if (this.editingAddressId()) {
      this.addressService.update(this.editingAddressId()!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingAddress.set(false);
            this.cancelAddressForm();
            this.snackBar.open(this.translate.instant('accommodations.addressSaved'), this.translate.instant('common.close'), { duration: 3000 });
            this.reloadAddresses();
          },
          error: () => {
            this.savingAddress.set(false);
            this.snackBar.open(this.translate.instant('accommodations.addressSaveError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
    } else {
      this.addressService.create(payload).pipe(
        switchMap((addr) =>
          this.accommodationAddressService.create({
            accommodationId: this.accommodationId!,
            addressId: addr.addressId,
          })
        ),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: () => {
          this.savingAddress.set(false);
          this.cancelAddressForm();
          this.snackBar.open(this.translate.instant('accommodations.addressAdded'), this.translate.instant('common.close'), { duration: 3000 });
          this.reloadAddresses();
        },
        error: () => {
          this.savingAddress.set(false);
          this.snackBar.open(this.translate.instant('accommodations.addressAddError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
    }
  }

  deleteAddress(address: Address) {
    if (!this.accommodationId) return;
    if (!confirm(this.translate.instant('accommodations.deleteAddressConfirm'))) return;

    this.accommodationAddressService.delete(this.accommodationId, address.addressId).pipe(
      switchMap(() => this.addressService.delete(address.addressId)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('accommodations.addressRemoved'), this.translate.instant('common.close'), { duration: 3000 });
        this.reloadAddresses();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('accommodations.addressRemoveError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

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

  private reloadAddresses() {
    if (!this.accommodationId) return;

    forkJoin({
      accAddresses: this.accommodationAddressService.getAll(),
      allAddresses: this.addressService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ accAddresses, allAddresses }) => {
        const linkedAddressIds = accAddresses
          .filter(aa => aa.accommodationId === this.accommodationId)
          .map(aa => aa.addressId);

        const addressMap = new Map(allAddresses.map(a => [a.addressId, a]));
        this.addresses.set(
          linkedAddressIds
            .map(aid => addressMap.get(aid))
            .filter((a): a is Address => !!a)
        );
      },
    });
  }
}
