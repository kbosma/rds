import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, switchMap } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BookerService } from './booker.service';
import { BookerAddressService } from './booker-address.service';
import { AddressService } from '../accommodations/address.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { AddressEditorComponent } from '../../shared/components/address-editor.component';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { Address, Booker } from '../../shared/models';

export interface BookerDialogData {
  /** Ontbreekt bij een nieuwe booker (aanmaken, status ACTIVE); het dialoog sluit dan met de aangemaakte booker. */
  booker?: Booker;
  readOnly: boolean;
}

@Component({
  selector: 'app-booker-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    AddressEditorComponent,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.readOnly ? 'bookers.viewTitle' : (data.booker ? 'bookers.editTitle' : 'bookers.newTitle')) | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <div class="row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.firstname' | translate }}</mat-label>
            <input matInput formControlName="firstname" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.prefix' | translate }}</mat-label>
            <input matInput formControlName="prefix" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'bookers.lastname' | translate }}</mat-label>
          <input matInput formControlName="lastname" />
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.callsign' | translate }}</mat-label>
            <input matInput formControlName="callsign" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.initials' | translate }}</mat-label>
            <input matInput formControlName="initials" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.telephone' | translate }}</mat-label>
          <input matInput formControlName="telephone" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'common.email' | translate }}</mat-label>
          <input matInput formControlName="emailaddress" type="email" />
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'bookers.gender' | translate }}</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="man">{{ 'bookers.genderMale' | translate }}</mat-option>
              <mat-option value="vrouw">{{ 'bookers.genderFemale' | translate }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>{{ 'common.birthdate' | translate }}</mat-label>
            <input matInput formControlName="birthdate" type="date" />
          </mat-form-field>
        </div>
      </form>

      <!-- Adressen: pas als de booker bestaat (een nieuwe booker krijgt ze na het opslaan). -->
      @if (data.booker) {
        <app-address-editor [addresses]="addresses()" [canManage]="canManageAddresses()" defaultRole="woon"
                            (create)="createAddress($event)" (update)="updateAddress($event.addressId, $event.payload)"
                            (remove)="removeAddress($event)" />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>
        <mat-icon>close</mat-icon> {{ (data.readOnly ? 'common.close' : 'common.cancel') | translate }}
      </button>
      @if (!data.readOnly) {
        @if (data.booker?.status === 'prospect') {
          <button mat-raised-button color="accent"
                  (click)="makeBooker()"
                  [disabled]="saving() || form.invalid">
            <mat-icon>how_to_reg</mat-icon> {{ 'prospects.makeBooker' | translate }}
          </button>
        }
        <button mat-raised-button color="primary"
                (click)="onSubmit()"
                [disabled]="saving() || form.invalid">
          @if (saving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row {
      display: flex;
      gap: 16px;
    }
    .flex-1 { flex: 1; }
  `],
})
export class BookerDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<BookerDialogComponent>);
  data: BookerDialogData = inject(MAT_DIALOG_DATA);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private bookerService = inject(BookerService);
  private translate = inject(TranslateService);
  private bookerAddressService = inject(BookerAddressService);
  private addressService = inject(AddressService);
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmService);

  @ViewChild(AddressEditorComponent) private addressEditor?: AddressEditorComponent;

  saving = signal(false);
  addresses = signal<Address[]>([]);
  /** Adressen beheren: alleen buiten alleen-inzien en met de authority om boekingsgegevens te wijzigen. */
  canManageAddresses = signal(!this.data.readOnly && this.authService.hasAuthority('BOOKING_UPDATE'));

  form = this.fb.group({
    firstname: [this.data.booker?.firstname ?? '', Validators.required],
    prefix: [this.data.booker?.prefix ?? ''],
    lastname: [this.data.booker?.lastname ?? '', Validators.required],
    callsign: [this.data.booker?.callsign ?? ''],
    initials: [this.data.booker?.initials ?? ''],
    telephone: [this.data.booker?.telephone ?? ''],
    emailaddress: [this.data.booker?.emailaddress ?? '', [Validators.required, Validators.email]],
    gender: [this.data.booker?.gender ?? ''],
    birthdate: [this.data.booker?.birthdate ?? ''],
  });

  ngOnInit() {
    if (this.data.readOnly) {
      this.form.disable();
    }
    if (this.data.booker) {
      this.loadAddresses();
    }
  }

  onSubmit() {
    this.persist({}, 'bookers.saved');
  }

  /** Promoveert een prospect tot boeker: slaat het formulier op én zet status ACTIVE. */
  makeBooker() {
    this.persist({ status: 'active' }, 'prospects.promoted');
  }

  private persist(extra: Partial<Booker>, successKey: string) {
    if (this.data.readOnly || this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();
    const payload: Partial<Booker> = {
      firstname: raw.firstname ?? undefined,
      prefix: raw.prefix ?? undefined,
      lastname: raw.lastname ?? undefined,
      callsign: raw.callsign ?? undefined,
      initials: raw.initials ?? undefined,
      telephone: raw.telephone ?? undefined,
      emailaddress: raw.emailaddress ?? undefined,
      gender: raw.gender ?? undefined,
      birthdate: raw.birthdate ?? undefined,
      ...extra,
    };

    const request$ = this.data.booker
      ? this.bookerService.update(this.data.booker.bookerId, payload)
      : this.bookerService.create({ ...payload, status: 'active' });

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant(successKey), this.translate.instant('common.close'), { duration: 3000 });
          // bij een nieuwe booker krijgt de aanroeper de aangemaakte booker terug, anders alleen "opgeslagen"
          this.dialogRef.close(this.data.booker ? true : saved);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookers.saveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  // ----- adressen -----

  private loadAddresses() {
    const bookerId = this.data.booker!.bookerId;
    forkJoin({
      links: this.bookerAddressService.getAll(),
      addresses: this.addressService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ links, addresses }) => {
      const byId = new Map(addresses.map(a => [a.addressId, a]));
      this.addresses.set(
        links
          .filter(l => l.bookerId === bookerId)
          .map(l => byId.get(l.addressId))
          .filter((a): a is Address => !!a)
      );
    });
  }

  createAddress(payload: Partial<Address>) {
    const bookerId = this.data.booker!.bookerId;
    this.addressService.create(payload).pipe(
      switchMap((address) => this.bookerAddressService.create({ bookerId, addressId: address.addressId })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.addressDone('addressEditor.added'),
      error: () => this.addressFailed('addressEditor.addError'),
    });
  }

  updateAddress(addressId: string, payload: Partial<Address>) {
    this.addressService.update(addressId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.addressDone('addressEditor.saved'),
        error: () => this.addressFailed('addressEditor.saveError'),
      });
  }

  async removeAddress(address: Address) {
    if (!await this.confirmService.confirmDelete(this.translate.instant('addressEditor.deleteConfirm'))) return;
    const bookerId = this.data.booker!.bookerId;
    this.bookerAddressService.delete(bookerId, address.addressId).pipe(
      switchMap(() => this.addressService.delete(address.addressId)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.addressDone('addressEditor.removed'),
      error: (err) => this.addressFailed(deleteErrorKey(err) === 'common.deleteBlocked' ? 'common.deleteBlocked' : 'addressEditor.removeError'),
    });
  }

  private addressDone(messageKey: string) {
    this.addressEditor?.close();
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), { duration: 3000 });
    this.loadAddresses();
  }

  private addressFailed(messageKey: string) {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), { duration: 5000 });
  }
}
