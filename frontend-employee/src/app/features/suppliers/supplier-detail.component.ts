import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { SupplierService } from './supplier.service';
import { SupplierAddressService } from '../accommodations/supplier-address.service';
import { AddressService } from '../accommodations/address.service';
import { AccommodationService } from '../accommodations/accommodation.service';
import { AccommodationSupplierService } from '../accommodations/accommodation-supplier.service';
import { AuthService } from '../../core/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { QuickCreateDialogComponent, QuickCreateResult } from '../../shared/components/quick-create-dialog.component';
import { Accommodation, AccommodationSupplier, Address, Supplier } from '../../shared/models';

/**
 * Een leverancier: gegevens (code + naam), adressen en de accommodaties die er aan gekoppeld zijn.
 * Routes: /suppliers/new, /suppliers/:id en /suppliers/:id?readonly=true (alleen inzien).
 */
@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <a routerLink="/suppliers" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'suppliers.backToSuppliers' | translate }}
    </a>

    <h1 class="page-title">
      @if (isNew()) {
        {{ 'suppliers.newTitle' | translate }}
      } @else {
        {{ (readOnly() ? 'suppliers.viewTitle' : 'suppliers.editTitle') | translate }} — {{ currentName() }}
      }
    </h1>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40"></mat-spinner></div>
    } @else {
      <mat-card class="detail-card">
        <mat-card-header>
          <mat-card-title>{{ 'suppliers.details' | translate }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="supplierForm" (ngSubmit)="onSaveSupplier()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.code' | translate }}</mat-label>
              <input matInput formControlName="key" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'common.name' | translate }}</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <div class="actions">
              <a mat-button routerLink="/suppliers"><mat-icon>close</mat-icon> {{ (readOnly() ? 'common.close' : 'common.cancel') | translate }}</a>
              @if (!readOnly()) {
                <button mat-raised-button color="primary" type="submit" [disabled]="saving() || supplierForm.invalid">
                  @if (saving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                  }
                </button>
              }
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      @if (!isNew()) {
        <!-- Adressen -->
        <mat-card class="detail-card section-card">
          <mat-card-header>
            <mat-card-title>{{ 'suppliers.addresses' | translate }}</mat-card-title>
            @if (canManage() && !showAddressForm()) {
              <button mat-stroked-button color="primary" class="card-header-btn add-address-btn" (click)="startAddAddress()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
          </mat-card-header>
          <mat-card-content>
            @if (showAddressForm()) {
              <form [formGroup]="addressForm" class="address-form">
                <h4>{{ editingAddressId() ? ('suppliers.editAddress' | translate) : ('suppliers.newAddress' | translate) }}</h4>
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
                  <mat-form-field appearance="outline" class="flex-2">
                    <mat-label>{{ 'accommodations.country' | translate }}</mat-label>
                    <input matInput formControlName="country" />
                  </mat-form-field>
                </div>
                <div class="actions">
                  <button mat-button type="button" (click)="cancelAddressForm()">
                    <mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}
                  </button>
                  <button mat-raised-button color="primary" type="button" class="save-address-btn"
                          [disabled]="savingAddress() || addressForm.invalid" (click)="onSaveAddress()">
                    <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
                  </button>
                </div>
              </form>
            }

            @for (address of addresses(); track address.addressId) {
              <div class="list-item address-item">
                <div class="item-info">
                  <span class="role-badge">{{ address.addressrole }}</span>
                  <span>{{ formatAddress(address) }}</span>
                  <span class="muted">{{ address.postalcode }} {{ address.city }}, {{ address.country }}</span>
                </div>
                @if (canManage()) {
                  <div class="item-actions">
                    <button mat-icon-button color="primary" class="edit-address-btn" (click)="startEditAddress(address)"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn" class="delete-address-btn" (click)="deleteAddress(address)"><mat-icon>delete</mat-icon></button>
                  </div>
                }
              </div>
            } @empty {
              <p class="empty-text">{{ 'suppliers.noAddressesLinked' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- Gekoppelde accommodaties -->
        <mat-card class="detail-card section-card">
          <mat-card-header>
            <mat-card-title>{{ 'suppliers.accommodations' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (canLinkAccommodations()) {
              <button mat-stroked-button color="primary" type="button" class="new-accommodation-btn" (click)="createAccommodation()">
                <mat-icon>add</mat-icon> {{ 'suppliers.newAccommodation' | translate }}
              </button>
            }
            @if (canLinkAccommodations() && availableAccommodations().length > 0) {
              <div class="row link-row">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>{{ 'suppliers.selectAccommodation' | translate }}</mat-label>
                  <mat-select [formControl]="accommodationControl">
                    @for (acc of availableAccommodations(); track acc.accommodationId) {
                      <mat-option [value]="acc.accommodationId">{{ acc.name }} ({{ acc.key }})</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button mat-raised-button color="primary" class="link-btn" [disabled]="!accommodationControl.value"
                        (click)="linkAccommodation()">
                  <mat-icon>link</mat-icon> {{ 'suppliers.linkAccommodation' | translate }}
                </button>
              </div>
            }

            @for (acc of linkedAccommodations(); track acc.accommodationId) {
              <div class="list-item accommodation-item">
                <div class="item-info">
                  <span>{{ acc.name }}</span>
                  <span class="muted">{{ acc.key }}</span>
                </div>
                @if (canLinkAccommodations()) {
                  <button mat-icon-button color="warn" class="unlink-btn" (click)="unlinkAccommodation(acc)">
                    <mat-icon>link_off</mat-icon>
                  </button>
                }
              </div>
            } @empty {
              <p class="empty-text">{{ 'suppliers.noAccommodationsLinked' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #1976d2; text-decoration: none; font-size: 14px; margin-bottom: 8px; }
    .back-link:hover { text-decoration: underline; }
    .page-title { font-size: 22px; font-weight: 500; margin: 8px 0 24px; }
    .detail-card { border-radius: 12px; max-width: 700px; }
    .detail-card mat-card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-header-btn { margin-left: auto; }
    .section-card { margin-top: 24px; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 16px; }
    .flex-1 { flex: 1; } .flex-2 { flex: 2; } .flex-3 { flex: 3; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .loading { display: flex; justify-content: center; padding: 40px; }
    .address-form { padding: 8px 0 16px; }
    .address-form h4 { margin: 0 0 12px; font-size: 15px; font-weight: 500; color: #555; }
    .list-item { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 16px; margin-bottom: 10px; }
    .item-info { display: flex; flex-direction: column; gap: 2px; }
    .muted { color: #777; font-size: 13px; }
    .role-badge { display: inline-block; background: #e3f2fd; color: #1565c0; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; width: fit-content; }
    .empty-text { color: #888; font-style: italic; }
    .link-row { align-items: flex-start; }
    .link-btn { margin-top: 4px; height: 56px; }
  `],
})
export class SupplierDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);
  private supplierAddressService = inject(SupplierAddressService);
  private addressService = inject(AddressService);
  private accommodationService = inject(AccommodationService);
  private accommodationSupplierService = inject(AccommodationSupplierService);
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  isNew = signal(true);
  /** Alleen inzien: geopend met ?readonly=true (inzien-icoon in de lijst). */
  readOnly = signal(false);
  loading = signal(false);
  saving = signal(false);
  savingAddress = signal(false);
  currentName = signal('');

  addresses = signal<Address[]>([]);
  showAddressForm = signal(false);
  editingAddressId = signal<string | null>(null);

  linkedAccommodations = signal<Accommodation[]>([]);
  private allAccommodations = signal<Accommodation[]>([]);
  availableAccommodations = computed(() => {
    const linked = new Set(this.linkedAccommodations().map(a => a.accommodationId));
    return this.allAccommodations().filter(a => !linked.has(a.accommodationId));
  });
  accommodationControl = new FormControl<string | null>(null);

  /** Wijzigen van de leverancier zelf en zijn adressen: SUPPLIER_UPDATE, en niet in alleen-inzien. */
  canManage = computed(() => !this.readOnly() && this.authService.hasAuthority('SUPPLIER_UPDATE'));
  /** Een koppeling met een accommodatie leggen/verbreken vraagt ook om de accommodatie-authorities (API). */
  canLinkAccommodations = computed(() =>
    this.canManage()
    && this.authService.hasAuthority('ACCOMMODATION_CREATE')
    && this.authService.hasAuthority('ACCOMMODATION_DELETE'));

  private supplierId: string | null = null;
  private supplier: Supplier | null = null;

  supplierForm = this.fb.group({
    key: ['', [Validators.required, Validators.maxLength(255)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
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
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.supplierId = id;
      this.readOnly.set(this.route.snapshot.queryParamMap.get('readonly') === 'true');
      if (this.readOnly()) {
        this.supplierForm.disable();
      }
      this.loading.set(true);
      this.load(id);
    }
  }

  private load(id: string) {
    forkJoin({
      supplier: this.supplierService.getById(id),
      supAddresses: this.supplierAddressService.getAll(),
      addresses: this.addressService.getAll(),
      accSuppliers: this.accommodationSupplierService.getAll(),
      accommodations: this.accommodationService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ supplier, supAddresses, addresses, accSuppliers, accommodations }) => {
        this.supplier = supplier;
        this.currentName.set(supplier.name);
        this.supplierForm.patchValue({ key: supplier.key, name: supplier.name });
        this.setAddresses(supAddresses, addresses);
        this.allAccommodations.set(accommodations);
        this.setLinkedAccommodations(accSuppliers, accommodations);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open(this.translate.instant('suppliers.notFound'), this.translate.instant('common.close'), { duration: 5000 });
        this.router.navigate(['/suppliers']);
      },
    });
  }

  // ----- leverancier zelf -----

  onSaveSupplier() {
    if (this.readOnly() || this.supplierForm.invalid) return;
    this.saving.set(true);
    const { key, name } = this.supplierForm.getRawValue();
    const payload: Partial<Supplier> = { key: key!, name: name! };

    if (this.isNew()) {
      this.supplierService.create(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.notify('suppliers.created');
            this.router.navigate(['/suppliers', created.supplierId]); // nu kunnen adressen en accommodaties erbij
          },
          error: () => this.fail('suppliers.createError', () => this.saving.set(false)),
        });
    } else {
      this.supplierService.update(this.supplierId!, { ...this.supplier, ...payload })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.supplier = updated;
            this.currentName.set(updated.name);
            this.notify('suppliers.saved');
          },
          error: () => this.fail('suppliers.saveError', () => this.saving.set(false)),
        });
    }
  }

  // ----- adressen -----

  startAddAddress() {
    this.editingAddressId.set(null);
    this.addressForm.reset({ addressrole: 'leverancier' });
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
    if (!this.canManage() || this.addressForm.invalid || !this.supplierId) return;
    this.savingAddress.set(true);

    const v = this.addressForm.getRawValue();
    const payload: Partial<Address> = {
      street: v.street!,
      housenumber: v.housenumber!,
      housenumberAddition: v.housenumberAddition || null,
      postalcode: v.postalcode!,
      city: v.city!,
      country: v.country!,
      addressrole: v.addressrole!,
    };

    if (this.editingAddressId()) {
      this.addressService.update(this.editingAddressId()!, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.savingAddress.set(false);
            this.cancelAddressForm();
            this.notify('suppliers.addressSaved');
            this.reloadAddresses();
          },
          error: () => this.fail('suppliers.addressSaveError', () => this.savingAddress.set(false)),
        });
    } else {
      this.addressService.create(payload).pipe(
        switchMap((address) => this.supplierAddressService.create({ supplierId: this.supplierId!, addressId: address.addressId })),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe({
        next: () => {
          this.savingAddress.set(false);
          this.cancelAddressForm();
          this.notify('suppliers.addressAdded');
          this.reloadAddresses();
        },
        error: () => this.fail('suppliers.addressAddError', () => this.savingAddress.set(false)),
      });
    }
  }

  async deleteAddress(address: Address) {
    if (!this.canManage() || !this.supplierId) return;
    if (!await this.confirmService.confirmDelete(this.translate.instant('suppliers.deleteAddressConfirm'))) return;

    this.supplierAddressService.delete(this.supplierId, address.addressId).pipe(
      switchMap(() => this.addressService.delete(address.addressId)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.notify('suppliers.addressRemoved');
        this.reloadAddresses();
      },
      error: (err) => this.fail(deleteErrorKey(err) === 'common.deleteBlocked' ? 'common.deleteBlocked' : 'suppliers.addressRemoveError'),
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
    forkJoin({
      supAddresses: this.supplierAddressService.getAll(),
      addresses: this.addressService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ supAddresses, addresses }) => this.setAddresses(supAddresses, addresses));
  }

  private setAddresses(links: { supplierId: string; addressId: string }[], all: Address[]) {
    const byId = new Map(all.map(a => [a.addressId, a]));
    this.addresses.set(
      links
        .filter(l => l.supplierId === this.supplierId)
        .map(l => byId.get(l.addressId))
        .filter((a): a is Address => !!a)
    );
  }

  // ----- gekoppelde accommodaties -----

  linkAccommodation() {
    const accommodationId = this.accommodationControl.value;
    if (!this.canLinkAccommodations() || !accommodationId || !this.supplierId) return;

    this.accommodationSupplierService.create({ accommodationId, supplierId: this.supplierId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.accommodationControl.reset();
          this.notify('suppliers.accommodationLinked');
          this.reloadAccommodations();
        },
        error: () => this.fail('suppliers.accommodationLinkError'),
      });
  }

  /** Maakt een nieuwe accommodatie aan en koppelt die meteen aan deze leverancier. */
  createAccommodation() {
    if (!this.canLinkAccommodations() || !this.supplierId) return;
    const supplierId = this.supplierId;
    this.dialog.open(QuickCreateDialogComponent, { width: '420px', data: { titleKey: 'accommodations.newTitle' } })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result?: QuickCreateResult) => {
        if (!result) return;
        this.accommodationService.create(result).pipe(
          switchMap(created => this.accommodationSupplierService.create({ accommodationId: created.accommodationId, supplierId })),
          takeUntilDestroyed(this.destroyRef),
        ).subscribe({
          next: () => {
            this.notify('suppliers.accommodationCreatedAndLinked');
            this.reloadAccommodations();
          },
          error: () => {
            this.fail('suppliers.accommodationLinkError');
            this.reloadAccommodations();
          },
        });
      });
  }

  async unlinkAccommodation(accommodation: Accommodation) {
    if (!this.canLinkAccommodations() || !this.supplierId) return;
    const message = this.translate.instant('suppliers.unlinkAccommodationConfirm', { name: accommodation.name });
    if (!await this.confirmService.confirmDelete(message)) return;

    this.accommodationSupplierService.delete(accommodation.accommodationId, this.supplierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notify('suppliers.accommodationUnlinked');
          this.reloadAccommodations();
        },
        error: () => this.fail('suppliers.accommodationUnlinkError'),
      });
  }

  private reloadAccommodations() {
    forkJoin({
      accSuppliers: this.accommodationSupplierService.getAll(),
      accommodations: this.accommodationService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ accSuppliers, accommodations }) => {
      this.allAccommodations.set(accommodations);
      this.setLinkedAccommodations(accSuppliers, accommodations);
    });
  }

  private setLinkedAccommodations(links: AccommodationSupplier[], all: Accommodation[]) {
    const byId = new Map(all.map(a => [a.accommodationId, a]));
    this.linkedAccommodations.set(
      links
        .filter(l => l.supplierId === this.supplierId)
        .map(l => byId.get(l.accommodationId))
        .filter((a): a is Accommodation => !!a)
    );
  }

  // ----- meldingen -----

  private notify(key: string) {
    this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 3000 });
  }

  private fail(key: string, reset?: () => void) {
    reset?.();
    this.snackBar.open(this.translate.instant(key), this.translate.instant('common.close'), { duration: 5000 });
  }
}
