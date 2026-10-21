import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Address } from '../models';

/**
 * Lijst met adressen plus een formulier om er een toe te voegen of te wijzigen. Het component doet zelf
 * geen API-calls: het meldt wat de gebruiker wil (`create`, `update`, `remove`) en de aanroeper voert dat uit
 * (adres aanmaken én aan de eigenaar koppelen, enz.) en sluit daarna het formulier met {@link close}.
 * Alleen-lezen: zonder `canManage` zijn er geen knoppen.
 */
@Component({
  selector: 'app-address-editor',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, TranslatePipe],
  template: `
    <div class="header">
      <h3>{{ 'addressEditor.title' | translate }}</h3>
      @if (canManage() && !showForm()) {
        <button mat-stroked-button type="button" class="act-create add-address-btn" (click)="startAdd()">
          <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
        </button>
      }
    </div>

    @if (showForm()) {
      <form [formGroup]="form" class="address-form">
        <h4>{{ editingId() ? ('addressEditor.edit' | translate) : ('addressEditor.new' | translate) }}</h4>
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
          <button mat-button type="button" class="cancel-address-btn" (click)="close()">
            <mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}
          </button>
          <button mat-raised-button color="primary" type="button" class="save-address-btn"
                  [disabled]="form.invalid" (click)="save()">
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
            <button mat-icon-button type="button" class="edit-address-btn act-update" (click)="startEdit(address)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button type="button" class="delete-address-btn act-delete" (click)="remove.emit(address)"><mat-icon>delete</mat-icon></button>
          </div>
        }
      </div>
    } @empty {
      <p class="empty-text">{{ 'addressEditor.empty' | translate }}</p>
    }
  `,
  styles: [`
    .header { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; }
    .header h3 { margin: 0; font-size: 16px; font-weight: 500; }
    .full-width { width: 100%; }
    .row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; } .flex-2 { flex: 2; } .flex-3 { flex: 3; }
    .address-form { padding: 4px 0 12px; }
    .address-form h4 { margin: 0 0 8px; font-size: 14px; font-weight: 500; color: #555; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .list-item { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
    .item-info { display: flex; flex-direction: column; gap: 2px; }
    .muted { color: #777; font-size: 13px; }
    .role-badge { display: inline-block; background: #e3f2fd; color: #1565c0; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; width: fit-content; }
    .empty-text { color: #888; font-style: italic; margin: 4px 0; }
  `],
})
export class AddressEditorComponent {
  private fb = inject(FormBuilder);

  readonly addresses = input<Address[]>([]);
  readonly canManage = input(false);
  /** De rol die een nieuw adres standaard krijgt (woon, factuur, accommodatie, leverancier). */
  readonly defaultRole = input('woon');

  readonly create = output<Partial<Address>>();
  readonly update = output<{ addressId: string; payload: Partial<Address> }>();
  readonly remove = output<Address>();

  showForm = signal(false);
  editingId = signal<string | null>(null);

  form = this.fb.group({
    addressrole: ['', Validators.required],
    street: ['', Validators.required],
    housenumber: [null as number | null, Validators.required],
    housenumberAddition: [''],
    postalcode: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
  });

  startAdd() {
    this.editingId.set(null);
    this.form.reset({ addressrole: this.defaultRole() });
    this.showForm.set(true);
  }

  startEdit(address: Address) {
    this.editingId.set(address.addressId);
    this.form.reset({
      addressrole: address.addressrole,
      street: address.street,
      housenumber: address.housenumber,
      housenumberAddition: address.housenumberAddition ?? '',
      postalcode: address.postalcode,
      city: address.city,
      country: address.country,
    });
    this.showForm.set(true);
  }

  /** Sluit het formulier; de aanroeper doet dit nadat het opslaan gelukt is. */
  close() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset();
  }

  save() {
    if (!this.canManage() || this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload: Partial<Address> = {
      street: v.street!,
      housenumber: v.housenumber!,
      housenumberAddition: v.housenumberAddition || null,
      postalcode: v.postalcode!,
      city: v.city!,
      country: v.country!,
      addressrole: v.addressrole!,
    };
    const id = this.editingId();
    if (id) {
      this.update.emit({ addressId: id, payload });
    } else {
      this.create.emit(payload);
    }
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
}
