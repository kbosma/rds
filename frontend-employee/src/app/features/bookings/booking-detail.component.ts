import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { Booking, BookingService } from './booking.service';
import { BookingLineService } from './booking-line.service';
import { BookerService } from '../bookers/booker.service';
import { TravelerService } from '../travelers/traveler.service';
import { Booker, Traveler, BookingLine } from '../../shared/models';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatTableModule,
    MatDividerModule,
    CurrencyPipe,
    DatePipe,
  ],
  template: `
    <a routerLink="/bookings" class="back-link">
      <mat-icon>arrow_back</mat-icon> Terug naar boekingen
    </a>

    <h1 class="page-title">
      {{ isNew() ? 'Nieuwe boeking' : 'Boeking bewerken — ' + currentBookingNumber() }}
    </h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="detail-grid">
        <!-- LEFT TOP: Booking details -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>Boekinggegevens</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="bookingForm" (ngSubmit)="onSave()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Boekingnummer</mat-label>
                <input matInput formControlName="bookingNumber" />
              </mat-form-field>

              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Van datum</mat-label>
                  <input matInput [matDatepicker]="fromPicker" formControlName="fromDate" />
                  <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
                  <mat-datepicker #fromPicker></mat-datepicker>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Tot datum</mat-label>
                  <input matInput [matDatepicker]="untilPicker" formControlName="untilDate" />
                  <mat-datepicker-toggle matSuffix [for]="untilPicker"></mat-datepicker-toggle>
                  <mat-datepicker #untilPicker></mat-datepicker>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Totaalbedrag</mat-label>
                <span matTextPrefix>&euro;&nbsp;</span>
                <input matInput type="number" formControlName="totalSum" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Status</mat-label>
                <mat-select formControlName="bookingStatus">
                  @for (status of statuses(); track status.value) {
                    <mat-option [value]="status.value">{{ status.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <div class="actions">
                <a mat-button routerLink="/bookings">Annuleren</a>
                <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
                  @if (saving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Opslaan
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- RIGHT TOP: Booker info -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>Hoofdboeker</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (booker()) {
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Naam</span>
                  <span class="info-value">{{ booker()!.firstname }} {{ booker()!.prefix }} {{ booker()!.lastname }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Roepnaam</span>
                  <span class="info-value">{{ booker()!.callsign }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Telefoon</span>
                  <span class="info-value">{{ booker()!.telephone }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">E-mail</span>
                  <span class="info-value email">{{ booker()!.emailaddress }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Geboortedatum</span>
                  <span class="info-value">{{ booker()!.birthdate | date:'dd-MM-yyyy' }}</span>
                </div>
              </div>
              <div class="card-actions">
                <button mat-stroked-button color="primary">
                  <mat-icon>edit</mat-icon> BEWERKEN
                </button>
              </div>
            } @else {
              <p class="empty-text">Geen hoofdboeker gekoppeld.</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- LEFT BOTTOM: Booking Lines (Accommodations) -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>Accommodaties</mat-card-title>
            <button mat-stroked-button color="primary" class="card-header-btn">
              <mat-icon>add</mat-icon> TOEVOEGEN
            </button>
          </mat-card-header>
          <mat-card-content>
            @if (bookingLines().length > 0) {
              @for (line of bookingLines(); track line.accommodationId + line.supplierId) {
                <div class="booking-line-card">
                  <div class="booking-line-header">
                    <mat-icon class="accommodation-icon">hotel</mat-icon>
                    <div>
                      <div class="booking-line-name">{{ line.accommodationName }}</div>
                      <div class="booking-line-supplier">{{ line.supplierName }}</div>
                    </div>
                    <div class="booking-line-actions">
                      <button mat-icon-button color="primary"><mat-icon>edit</mat-icon></button>
                      <button mat-icon-button color="warn"><mat-icon>delete</mat-icon></button>
                    </div>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="booking-line-details">
                    <div class="booking-line-dates">
                      <mat-icon>date_range</mat-icon>
                      {{ line.fromDate | date:'dd-MM-yyyy' }} — {{ line.untilDate | date:'dd-MM-yyyy' }}
                    </div>
                    <div class="booking-line-amount">{{ line.totalSum | currency:'EUR':'symbol':'1.2-2' }}</div>
                  </div>
                </div>
              }
            } @else {
              <p class="empty-text">Nog geen accommodaties toegevoegd.</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- RIGHT MIDDLE: Travelers -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>Reizigers</mat-card-title>
            <button mat-stroked-button color="primary" class="card-header-btn">
              <mat-icon>add</mat-icon> TOEVOEGEN
            </button>
          </mat-card-header>
          <mat-card-content>
            @if (travelers().length > 0) {
              <table mat-table [dataSource]="travelers()" class="full-width">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Naam</th>
                  <td mat-cell *matCellDef="let t">{{ t.firstname }} {{ t.prefix }} {{ t.lastname }}</td>
                </ng-container>
                <ng-container matColumnDef="birthdate">
                  <th mat-header-cell *matHeaderCellDef>Geboortedatum</th>
                  <td mat-cell *matCellDef="let t">{{ t.birthdate | date:'dd-MM-yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Acties</th>
                  <td mat-cell *matCellDef="let t">
                    <button mat-icon-button color="primary"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn"><mat-icon>delete</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="travelerColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: travelerColumns;"></tr>
              </table>
            } @else {
              <p class="empty-text">Geen reizigers geregistreerd.</p>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Payments section -->
      @if (!isNew()) {
        <mat-card class="payments-card">
          <mat-card-header>
            <mat-card-title>Betalingen</mat-card-title>
            <a mat-stroked-button color="primary" class="card-header-btn"
               [routerLink]="['/bookings', bookingId, 'payments']">
              <mat-icon>payment</mat-icon> BETALING
            </a>
          </mat-card-header>
          <mat-card-content>
            <p class="empty-text">Nog geen betalingen gekoppeld.</p>
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
    .back-link:hover {
      text-decoration: underline;
    }
    .page-title {
      font-size: 22px;
      font-weight: 500;
      margin: 8px 0 24px;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .detail-card {
      border-radius: 12px;
    }
    .detail-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header-btn {
      margin-left: auto;
    }
    .full-width { width: 100%; }
    .row {
      display: flex;
      gap: 16px;
    }
    .row mat-form-field { flex: 1; }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .info-grid {
      display: grid;
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
    .info-value.email {
      color: #1976d2;
    }
    .card-actions {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
    .payments-card {
      margin-top: 24px;
      border-radius: 12px;
    }
    .payments-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .booking-line-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }
    .booking-line-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .accommodation-icon {
      color: #1976d2;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .booking-line-name {
      font-weight: 500;
      font-size: 15px;
    }
    .booking-line-supplier {
      color: #666;
      font-size: 13px;
    }
    .booking-line-actions {
      margin-left: auto;
    }
    .booking-line-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .booking-line-dates {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #555;
      font-size: 13px;
    }
    .booking-line-dates mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #888;
    }
    .booking-line-amount {
      font-weight: 600;
      font-size: 15px;
      color: #2e7d32;
    }
  `],
})
export class BookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private bookingLineService = inject(BookingLineService);
  private bookerService = inject(BookerService);
  private travelerService = inject(TravelerService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  bookingId: string | null = null;

  bookingForm = this.fb.group({
    bookingNumber: [''],
    fromDate: [null as Date | null],
    untilDate: [null as Date | null],
    totalSum: [null as number | null],
    bookingStatus: [''],
  });

  isNew = signal(true);
  loading = signal(false);
  saving = signal(false);
  currentBookingNumber = signal('');
  statuses = signal([
    { value: 'aanvraag', label: 'Aanvraag' },
    { value: 'offerte', label: 'Offerte' },
    { value: 'boeking', label: 'Boeking' },
    { value: 'voorschot', label: 'Voorschot' },
    { value: 'betaald', label: 'Betaald' },
    { value: 'afgerond', label: 'Afgerond' },
  ]);
  booker = signal<Booker | null>(null);
  travelers = signal<Traveler[]>([]);
  bookingLines = signal<BookingLine[]>([]);

  travelerColumns = ['name', 'birthdate', 'actions'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.bookingId = id;
      this.loading.set(true);
      this.bookingService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (b) => {
          this.currentBookingNumber.set(b.bookingNumber);
          this.bookingForm.patchValue({
            bookingNumber: b.bookingNumber,
            fromDate: b.fromDate ? new Date(b.fromDate) : null,
            untilDate: b.untilDate ? new Date(b.untilDate) : null,
            totalSum: b.totalSum,
            bookingStatus: b.bookingStatus,
          });
          this.loading.set(false);

          // Load booker for this booking (Booking has bookerId)
          if (b.bookerId) {
            this.bookerService.getById(b.bookerId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (booker) => this.booker.set(booker),
            });
          }

          // Load travelers for this booking (Traveler has bookingId)
          this.travelerService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (travelers) => {
              this.travelers.set(travelers.filter((t) => t.bookingId === id));
            },
          });

          // Load booking lines for this booking
          this.bookingLineService.getByBookingId(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (lines) => this.bookingLines.set(lines),
          });
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Boeking niet gevonden', 'Sluiten', { duration: 3000 });
          this.router.navigate(['/bookings']);
        },
      });
    }
  }

  onSave() {
    this.saving.set(true);
    const formValue = this.bookingForm.value;
    const payload: Partial<Booking> = {
      ...formValue,
      bookingNumber: formValue.bookingNumber ?? undefined,
      fromDate: this.toLocalDate(formValue.fromDate),
      untilDate: this.toLocalDate(formValue.untilDate),
      totalSum: formValue.totalSum ?? undefined,
      bookingStatus: formValue.bookingStatus ?? undefined,
    };
    const op = this.isNew()
      ? this.bookingService.create(payload)
      : this.bookingService.update(this.bookingId!, payload);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Boeking opgeslagen', 'Sluiten', { duration: 3000 });
        this.router.navigate(['/bookings']);
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Save failed:', err);
        this.snackBar.open('Fout bij opslaan', 'Sluiten', { duration: 5000 });
      },
    });
  }

  private toLocalDate(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(value).substring(0, 10);
  }
}
