import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { AccommodationService } from '../accommodations/accommodation.service';
import { AccommodationSupplierService } from '../accommodations/accommodation-supplier.service';
import { SupplierService } from '../suppliers/supplier.service';
import { BookingLineService } from './booking-line.service';
import { Accommodation, Supplier, AccommodationSupplier, BookingLine } from '../../shared/models';

export interface BookingLineDialogData {
  bookingId: string;
  bookingLine?: BookingLine;
}

@Component({
  selector: 'app-booking-line-dialog',
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
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? ('bookingLine.editTitle' | translate) : ('bookingLine.addTitle' | translate) }}</h2>
    <mat-dialog-content>
      @if (loadingData()) {
        <div class="loading">
          <mat-spinner diameter="30"></mat-spinner>
        </div>
      } @else {
        <form [formGroup]="form">
          @if (!isEdit) {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ 'bookingLine.accommodation' | translate }}</mat-label>
              <mat-select formControlName="accommodationId" (selectionChange)="onAccommodationChange()">
                @for (acc of accommodations(); track acc.accommodationId) {
                  <mat-option [value]="acc.accommodationId">{{ acc.name }} ({{ acc.key }})</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!-- Supplier: auto-resolved, only show select when multiple -->
            @if (resolvedSuppliers().length > 1) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'bookingLine.supplier' | translate }}</mat-label>
                <mat-select formControlName="supplierId">
                  @for (sup of resolvedSuppliers(); track sup.supplierId) {
                    <mat-option [value]="sup.supplierId">{{ sup.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else if (resolvedSupplierName()) {
              <div class="resolved-field">
                <span class="resolved-label">{{ 'bookingLine.supplier' | translate }}</span>
                <span class="resolved-value">{{ resolvedSupplierName() }}</span>
              </div>
            }
          } @else {
            <div class="resolved-field">
              <span class="resolved-label">{{ 'bookingLine.accommodation' | translate }}</span>
              <span class="resolved-value">{{ editAccommodationName }}</span>
            </div>
            <div class="resolved-field">
              <span class="resolved-label">{{ 'bookingLine.supplier' | translate }}</span>
              <span class="resolved-value">{{ editSupplierName }}</span>
            </div>
          }

          <div class="row">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>{{ 'bookingLine.fromDate' | translate }}</mat-label>
              <input matInput formControlName="fromDate" type="date" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>{{ 'bookingLine.untilDate' | translate }}</mat-label>
              <input matInput formControlName="untilDate" type="date" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'common.price' | translate }}</mat-label>
            <span matTextPrefix>&euro;&nbsp;</span>
            <input matInput type="number" formControlName="price" />
          </mat-form-field>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary"
              (click)="onSubmit()"
              [disabled]="saving() || form.invalid || loadingData()">
        @if (saving()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          @if (isEdit) {
            <mat-icon>save</mat-icon> {{ 'common.save' | translate }}
          } @else {
            <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
          }
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .row {
      display: flex;
      gap: 16px;
    }
    .flex-1 { flex: 1; }
    .loading {
      display: flex;
      justify-content: center;
      padding: 24px;
    }
    .resolved-field {
      display: flex;
      flex-direction: column;
      margin-bottom: 16px;
    }
    .resolved-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .resolved-value {
      font-size: 15px;
      font-weight: 500;
      margin-top: 2px;
    }
  `],
})
export class BookingLineDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<BookingLineDialogComponent>);
  private data: BookingLineDialogData = inject(MAT_DIALOG_DATA);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private accommodationService = inject(AccommodationService);
  private supplierService = inject(SupplierService);
  private accommodationSupplierService = inject(AccommodationSupplierService);
  private bookingLineService = inject(BookingLineService);
  private translate = inject(TranslateService);

  isEdit = !!this.data.bookingLine;
  editAccommodationName = this.data.bookingLine?.accommodationName ?? '';
  editSupplierName = this.data.bookingLine?.supplierName ?? '';

  accommodations = signal<Accommodation[]>([]);
  private allSuppliers = signal<Supplier[]>([]);
  private accSupplierLinks = signal<AccommodationSupplier[]>([]);
  resolvedSuppliers = signal<Supplier[]>([]);
  resolvedSupplierName = signal<string | null>(null);
  loadingData = signal(true);
  saving = signal(false);

  form = this.fb.group({
    accommodationId: [this.data.bookingLine?.accommodationId ?? '', Validators.required],
    supplierId: [this.data.bookingLine?.supplierId ?? '', Validators.required],
    fromDate: [this.data.bookingLine?.fromDate ?? '', Validators.required],
    untilDate: [this.data.bookingLine?.untilDate ?? '', Validators.required],
    price: [this.data.bookingLine?.price ?? null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    if (this.isEdit) {
      this.loadingData.set(false);
    } else {
      this.loadReferenceData();
    }
  }

  private loadReferenceData() {
    forkJoin({
      accommodations: this.accommodationService.getAll(),
      suppliers: this.supplierService.getAll(),
      links: this.accommodationSupplierService.getAll(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ accommodations, suppliers, links }) => {
        this.accommodations.set(accommodations);
        this.allSuppliers.set(suppliers);
        this.accSupplierLinks.set(links);
        this.loadingData.set(false);
      },
    });
  }

  onAccommodationChange() {
    const accId = this.form.get('accommodationId')!.value;
    this.form.get('supplierId')!.setValue('');
    this.resolvedSuppliers.set([]);
    this.resolvedSupplierName.set(null);

    if (!accId) return;

    const linkedSupplierIds = this.accSupplierLinks()
      .filter(link => link.accommodationId === accId)
      .map(link => link.supplierId);

    const matched = this.allSuppliers().filter(s => linkedSupplierIds.includes(s.supplierId));

    if (matched.length === 1) {
      this.form.get('supplierId')!.setValue(matched[0].supplierId);
      this.resolvedSupplierName.set(matched[0].name);
      this.resolvedSuppliers.set([]);
    } else if (matched.length > 1) {
      this.resolvedSuppliers.set(matched);
      this.resolvedSupplierName.set(null);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const raw = this.form.getRawValue();

    if (this.isEdit) {
      const bl = this.data.bookingLine!;
      this.bookingLineService.update(bl.bookingId, bl.accommodationId, bl.supplierId, {
        bookingId: bl.bookingId,
        accommodationId: bl.accommodationId,
        supplierId: bl.supplierId,
        fromDate: raw.fromDate!,
        untilDate: raw.untilDate!,
        price: raw.price!,
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookingLine.saveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
    } else {
      this.bookingLineService.create({
        bookingId: this.data.bookingId,
        accommodationId: raw.accommodationId!,
        supplierId: raw.supplierId!,
        fromDate: raw.fromDate!,
        untilDate: raw.untilDate!,
        price: raw.price!,
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.saving.set(false);
          this.dialogRef.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open(this.translate.instant('bookingLine.addError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
    }
  }
}
