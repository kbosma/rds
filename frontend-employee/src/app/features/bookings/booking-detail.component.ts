import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Booking, BookingService } from './booking.service';
import { BookingLineService } from './booking-line.service';
import { BookingLineDialogComponent, BookingLineDialogData } from './booking-line-dialog.component';
import { BookerService } from '../bookers/booker.service';
import { TravelerService } from '../travelers/traveler.service';
import { MolliePaymentService } from '../mollie/mollie-payment.service';
import { AuthService } from '../../core/auth/auth.service';
import { Booker, Traveler, BookingLine, MolliePayment, MolliePaymentStatusEntry } from '../../shared/models';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

interface BookingMolliePaymentLink {
  bookingId: string;
  molliePaymentId: string;
}

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
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatTableModule,
    MatDividerModule,
    MatDialogModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    TranslateModule,
  ],
  template: `
    <a routerLink="/bookings" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'bookings.backToBookings' | translate }}
    </a>

    <h1 class="page-title">
      {{ isNew() ? ('bookings.newBookingTitle' | translate) : ('bookings.editBookingTitle' | translate) + ' — ' + currentBookingNumber() }}
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
            <mat-card-title>{{ 'bookings.bookingDetails' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="bookingForm" (ngSubmit)="onSave()">
              @if (!isNew()) {
                <div class="computed-field booking-number-field">
                  <span class="info-label">{{ 'bookings.bookingNumber' | translate }}</span>
                  <span class="computed-value">{{ currentBookingNumber() }}</span>
                </div>
              }

              @if (!isNew()) {
                <div class="computed-fields">
                  <div class="computed-field">
                    <span class="info-label">{{ 'bookings.fromDateComputed' | translate }}</span>
                    <span class="computed-value">{{ currentFromDate() | date:'dd-MM-yyyy' }}</span>
                  </div>
                  <div class="computed-field">
                    <span class="info-label">{{ 'bookings.untilDateComputed' | translate }}</span>
                    <span class="computed-value">{{ currentUntilDate() | date:'dd-MM-yyyy' }}</span>
                  </div>
                  <div class="computed-field">
                    <span class="info-label">{{ 'bookings.totalComputed' | translate }}</span>
                    <span class="total-sum-value">{{ currentTotalSum() | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </div>
                </div>
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>{{ 'common.status' | translate }}</mat-label>
                <mat-select formControlName="bookingStatus">
                  @for (status of statuses(); track status.value) {
                    <mat-option [value]="status.value">{{ status.labelKey | translate }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <div class="actions">
                <a mat-button routerLink="/bookings"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</a>
                <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
                  @if (saving()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <ng-container><mat-icon>save</mat-icon> {{ 'common.save' | translate }}</ng-container>
                  }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- RIGHT TOP: Booker info -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.mainBooker' | translate }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (booker()) {
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ 'common.name' | translate }}</span>
                  <span class="info-value">{{ booker()!.firstname }} {{ booker()!.prefix }} {{ booker()!.lastname }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'bookings.callsign' | translate }}</span>
                  <span class="info-value">{{ booker()!.callsign }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'common.telephone' | translate }}</span>
                  <span class="info-value">{{ booker()!.telephone }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'common.email' | translate }}</span>
                  <span class="info-value email">{{ booker()!.emailaddress }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'common.birthdate' | translate }}</span>
                  <span class="info-value">{{ booker()!.birthdate | date:'dd-MM-yyyy' }}</span>
                </div>
              </div>
              <div class="card-actions">
                <button mat-stroked-button color="primary">
                  <mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}
                </button>
              </div>
            } @else {
              <p class="empty-text">{{ 'bookings.noBookerLinked' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- LEFT BOTTOM: Booking Lines (Accommodations) -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.accommodations' | translate }}</mat-card-title>
            <button mat-stroked-button color="primary" class="card-header-btn"
                    (click)="openBookingLineDialog()">
              <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
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
                      <button mat-icon-button color="primary" (click)="openBookingLineDialog(line)"><mat-icon>edit</mat-icon></button>
                      <button mat-icon-button color="warn" (click)="deleteBookingLine(line)"><mat-icon>delete</mat-icon></button>
                    </div>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="booking-line-details">
                    <div class="booking-line-dates">
                      <mat-icon>date_range</mat-icon>
                      {{ line.fromDate | date:'dd-MM-yyyy' }} — {{ line.untilDate | date:'dd-MM-yyyy' }}
                    </div>
                    <div class="booking-line-amount">{{ line.price | currency:'EUR':'symbol':'1.2-2' }}</div>
                  </div>
                </div>
              }
            } @else {
              <p class="empty-text">{{ 'bookings.noAccommodationsYet' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- RIGHT MIDDLE: Travelers -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.travelers' | translate }}</mat-card-title>
            <button mat-stroked-button color="primary" class="card-header-btn">
              <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
            </button>
          </mat-card-header>
          <mat-card-content>
            @if (travelers().length > 0) {
              <table mat-table [dataSource]="travelers()" class="full-width">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | translate }}</th>
                  <td mat-cell *matCellDef="let t">{{ t.firstname }} {{ t.prefix }} {{ t.lastname }}</td>
                </ng-container>
                <ng-container matColumnDef="birthdate">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.birthdate' | translate }}</th>
                  <td mat-cell *matCellDef="let t">{{ t.birthdate | date:'dd-MM-yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let t">
                    <button mat-icon-button color="primary"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn"><mat-icon>delete</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="travelerColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: travelerColumns;"></tr>
              </table>
            } @else {
              <p class="empty-text">{{ 'bookings.noTravelersRegistered' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Payments section -->
      @if (!isNew()) {
        <mat-card class="payments-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.payments' | translate }}</mat-card-title>
            <button mat-stroked-button color="primary" class="card-header-btn"
                    (click)="showNewPaymentForm.set(!showNewPaymentForm())">
              <mat-icon>add</mat-icon> {{ 'common.newPayment' | translate }}
            </button>
          </mat-card-header>
          <mat-card-content>
            <!-- New payment form -->
            @if (showNewPaymentForm()) {
              <div class="new-payment-form">
                <form [formGroup]="newPaymentForm" (ngSubmit)="onCreatePayment()">
                  <div class="row">
                    <mat-form-field appearance="outline">
                      <mat-label>{{ 'common.description' | translate }}</mat-label>
                      <input matInput formControlName="description" />
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>{{ 'common.amount' | translate }}</mat-label>
                      <span matTextPrefix>&euro;&nbsp;</span>
                      <input matInput type="number" formControlName="amount" />
                    </mat-form-field>
                  </div>
                  <div class="actions">
                    <button mat-button type="button" (click)="showNewPaymentForm.set(false)"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
                    <button mat-raised-button color="primary" type="submit"
                            [disabled]="creatingPayment() || newPaymentForm.invalid">
                      @if (creatingPayment()) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <ng-container><mat-icon>add</mat-icon> {{ 'common.add' | translate }}</ng-container>
                      }
                    </button>
                  </div>
                </form>
              </div>
              <mat-divider class="form-divider"></mat-divider>
            }

            <!-- Payments table -->
            @if (paymentsLoading()) {
              <div class="loading-inline">
                <mat-spinner diameter="30"></mat-spinner>
              </div>
            } @else if (payments().length > 0) {
              <table mat-table [dataSource]="payments()" multiTemplateDataRows class="full-width">
                <ng-container matColumnDef="description">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.description' | translate }}</th>
                  <td mat-cell *matCellDef="let p">{{ p.description }}</td>
                </ng-container>

                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.amount' | translate }}</th>
                  <td mat-cell *matCellDef="let p">&euro; {{ p.amount | number:'1.2-2' }}</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.status' | translate }}</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="status-badge" [attr.data-status]="p.status">{{ 'payments.status_' + p.status | translate }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | translate }}</th>
                  <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'dd-MM-yyyy' }}</td>
                </ng-container>

                <ng-container matColumnDef="expand">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let p">
                    <button mat-icon-button (click)="togglePaymentRow(p); $event.stopPropagation()">
                      <mat-icon>{{ expandedPaymentId() === p.molliePaymentId ? 'expand_less' : 'expand_more' }}</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <!-- Expanded detail row -->
                <ng-container matColumnDef="expandedDetail">
                  <td mat-cell *matCellDef="let p" [attr.colspan]="paymentColumns.length">
                    @if (expandedPaymentId() === p.molliePaymentId) {
                      <div class="status-history">
                        <div class="status-history-header">
                          <h4>{{ 'bookings.statusHistory' | translate }}</h4>
                          @if (canManageStatusEntries()) {
                            <button mat-stroked-button color="primary" class="add-status-btn"
                                    (click)="showNewStatusForm.set(!showNewStatusForm())">
                              <mat-icon>add</mat-icon> {{ 'bookings.addStatus' | translate }}
                            </button>
                          }
                        </div>

                        @if (showNewStatusForm() && canManageStatusEntries()) {
                          <div class="new-status-form">
                            <form [formGroup]="newStatusForm" (ngSubmit)="onCreateStatusEntry(p.molliePaymentId)">
                              <div class="row">
                                <mat-form-field appearance="outline">
                                  <mat-label>{{ 'common.status' | translate }}</mat-label>
                                  <mat-select formControlName="status">
                                    @for (s of paymentStatuses; track s.value) {
                                      <mat-option [value]="s.value">{{ s.labelKey | translate }}</mat-option>
                                    }
                                  </mat-select>
                                </mat-form-field>
                                <div class="status-form-actions">
                                  <button mat-button type="button" (click)="showNewStatusForm.set(false)"><mat-icon>close</mat-icon> {{ 'common.cancel' | translate }}</button>
                                  <button mat-raised-button color="primary" type="submit"
                                          [disabled]="creatingStatusEntry() || newStatusForm.invalid">
                                    @if (creatingStatusEntry()) {
                                      <mat-spinner diameter="18"></mat-spinner>
                                    } @else {
                                      <ng-container><mat-icon>add</mat-icon> {{ 'common.add' | translate }}</ng-container>
                                    }
                                  </button>
                                </div>
                              </div>
                            </form>
                          </div>
                        }

                        @if (statusEntriesLoading()) {
                          <mat-spinner diameter="24"></mat-spinner>
                        } @else {
                          <table class="history-table">
                            <thead>
                              <tr>
                                <th>{{ 'common.status' | translate }}</th>
                                <th>{{ 'common.date' | translate }}</th>
                                <th>{{ 'bookings.by' | translate }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (entry of statusEntries(); track entry.molliePaymentStatusEntryId) {
                                <tr>
                                  <td>
                                    <span class="status-badge" [attr.data-status]="entry.status">{{ 'payments.status_' + entry.status | translate }}</span>
                                  </td>
                                  <td>{{ entry.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
                                  <td>{{ entry.createdBy ?? ('common.system' | translate) }}</td>
                                </tr>
                              }
                              @if (statusEntries().length === 0) {
                                <tr><td colspan="3" class="no-data-cell">{{ 'bookings.noStatusHistory' | translate }}</td></tr>
                              }
                            </tbody>
                          </table>
                        }
                      </div>
                    }
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="paymentColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: paymentColumns;"
                    (click)="togglePaymentRow(row)"
                    class="clickable-row"></tr>
                <tr mat-row *matRowDef="let row; columns: ['expandedDetail']"
                    class="detail-row"></tr>
              </table>
            } @else {
              <p class="empty-text">{{ 'bookings.noPaymentsLinked' | translate }}</p>
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
    .computed-fields {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .computed-field {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 12px 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .computed-value {
      font-size: 15px;
      font-weight: 500;
      margin-top: 4px;
    }
    .booking-number-field {
      margin-bottom: 16px;
    }
    .total-sum-value {
      font-size: 15px;
      font-weight: 600;
      color: #2e7d32;
      margin-top: 4px;
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
    .loading-inline {
      display: flex;
      justify-content: center;
      padding: 24px;
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
    .new-payment-form {
      padding: 16px 0;
    }
    .form-divider {
      margin-bottom: 16px;
    }
    .clickable-row {
      cursor: pointer;
    }
    .clickable-row:hover {
      background-color: #f5f5f5;
    }
    .detail-row {
      height: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-badge[data-status="paid"] {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .status-badge[data-status="open"], .status-badge[data-status="pending"] {
      background-color: #fff3e0;
      color: #e65100;
    }
    .status-badge[data-status="failed"] {
      background-color: #ffebee;
      color: #c62828;
    }
    .status-badge[data-status="canceled"] {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }
    .status-badge[data-status="expired"] {
      background-color: #efebe9;
      color: #4e342e;
    }
    .status-badge[data-status="authorized"] {
      background-color: #e3f2fd;
      color: #1565c0;
    }
    .status-history {
      padding: 16px 24px;
      background: #fafafa;
    }
    .status-history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .status-history h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #555;
    }
    .add-status-btn {
      font-size: 12px;
    }
    .new-status-form {
      margin-bottom: 12px;
    }
    .new-status-form .row {
      align-items: center;
    }
    .status-form-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      padding-bottom: 22px;
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .history-table th {
      text-align: left;
      padding: 6px 12px;
      border-bottom: 1px solid #ddd;
      color: #888;
      font-weight: 500;
    }
    .history-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #eee;
    }
    .no-data-cell {
      text-align: center;
      padding: 16px;
      color: #888;
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
  private molliePaymentService = inject(MolliePaymentService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  bookingId: string | null = null;

  bookingForm = this.fb.group({
    bookingStatus: [''],
  });

  newPaymentForm = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  newStatusForm = this.fb.group({
    status: ['', Validators.required],
  });

  isNew = signal(true);
  loading = signal(false);
  saving = signal(false);
  currentBookingNumber = signal('');
  statuses = signal([
    { value: 'aanvraag', labelKey: 'bookings.status_aanvraag' },
    { value: 'offerte', labelKey: 'bookings.status_offerte' },
    { value: 'boeking', labelKey: 'bookings.status_boeking' },
    { value: 'voorschot', labelKey: 'bookings.status_voorschot' },
    { value: 'betaald', labelKey: 'bookings.status_betaald' },
    { value: 'afgerond', labelKey: 'bookings.status_afgerond' },
  ]);
  currentFromDate = signal<string | null>(null);
  currentUntilDate = signal<string | null>(null);
  currentTotalSum = signal<number>(0);
  booker = signal<Booker | null>(null);
  travelers = signal<Traveler[]>([]);
  bookingLines = signal<BookingLine[]>([]);

  // Payments
  payments = signal<MolliePayment[]>([]);
  paymentsLoading = signal(false);
  showNewPaymentForm = signal(false);
  creatingPayment = signal(false);

  // Status entries
  expandedPaymentId = signal<string | null>(null);
  statusEntries = signal<MolliePaymentStatusEntry[]>([]);
  statusEntriesLoading = signal(false);
  showNewStatusForm = signal(false);
  creatingStatusEntry = signal(false);

  travelerColumns = ['name', 'birthdate', 'actions'];
  paymentColumns = ['description', 'amount', 'status', 'createdAt', 'expand'];

  paymentStatuses = [
    { value: 'open', labelKey: 'payments.status_open' },
    { value: 'pending', labelKey: 'payments.status_pending' },
    { value: 'authorized', labelKey: 'payments.status_authorized' },
    { value: 'paid', labelKey: 'payments.status_paid' },
    { value: 'failed', labelKey: 'payments.status_failed' },
    { value: 'canceled', labelKey: 'payments.status_canceled' },
    { value: 'expired', labelKey: 'payments.status_expired' },
  ];

  canManageStatusEntries(): boolean {
    return this.authService.hasRole('ADMIN') || this.authService.hasRole('MANAGER');
  }

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
            bookingStatus: b.bookingStatus,
          });
          this.currentFromDate.set(b.fromDate ?? null);
          this.currentUntilDate.set(b.untilDate ?? null);
          this.currentTotalSum.set(b.totalSum ?? 0);
          this.loading.set(false);

          if (b.bookerId) {
            this.bookerService.getById(b.bookerId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: (booker) => this.booker.set(booker),
            });
          }

          this.travelerService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (travelers) => {
              this.travelers.set(travelers.filter((t) => t.bookingId === id));
            },
          });

          this.bookingLineService.getByBookingId(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (lines) => this.bookingLines.set(lines),
          });

          this.loadPayments();
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(this.translate.instant('bookings.notFound'), this.translate.instant('common.close'), { duration: 3000 });
          this.router.navigate(['/bookings']);
        },
      });
    }
  }

  onSave() {
    this.saving.set(true);
    const formValue = this.bookingForm.value;
    const payload: Partial<Booking> = {
      bookingStatus: formValue.bookingStatus ?? undefined,
    };
    const op = this.isNew()
      ? this.bookingService.create(payload)
      : this.bookingService.update(this.bookingId!, payload);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('bookings.saved'), this.translate.instant('common.close'), { duration: 3000 });
        this.router.navigate(['/bookings']);
      },
      error: (err) => {
        this.saving.set(false);
        console.error('Save failed:', err);
        this.snackBar.open(this.translate.instant('bookings.saveError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  onCreatePayment() {
    if (!this.bookingId || this.newPaymentForm.invalid) return;

    this.creatingPayment.set(true);
    const { description, amount } = this.newPaymentForm.value;

    this.molliePaymentService.create({
      description: description!,
      amount: amount!,
      currency: 'EUR',
      status: 'open',
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (payment) => {
        this.http.post<BookingMolliePaymentLink>(
          `${environment.apiUrl}/booking-mollie-payments`,
          { bookingId: this.bookingId, molliePaymentId: payment.molliePaymentId }
        ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.creatingPayment.set(false);
            this.showNewPaymentForm.set(false);
            this.newPaymentForm.reset();
            this.snackBar.open(this.translate.instant('bookings.paymentAdded'), this.translate.instant('common.close'), { duration: 3000 });
            this.loadPayments();
          },
          error: () => {
            this.creatingPayment.set(false);
            this.snackBar.open(this.translate.instant('bookings.paymentLinkError'), this.translate.instant('common.close'), { duration: 5000 });
          },
        });
      },
      error: () => {
        this.creatingPayment.set(false);
        this.snackBar.open(this.translate.instant('bookings.paymentCreateError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  togglePaymentRow(payment: MolliePayment) {
    if (this.expandedPaymentId() === payment.molliePaymentId) {
      this.expandedPaymentId.set(null);
      this.statusEntries.set([]);
      this.showNewStatusForm.set(false);
      return;
    }

    this.expandedPaymentId.set(payment.molliePaymentId);
    this.showNewStatusForm.set(false);
    this.loadStatusEntries(payment.molliePaymentId);
  }

  onCreateStatusEntry(molliePaymentId: string) {
    if (this.newStatusForm.invalid) return;

    this.creatingStatusEntry.set(true);
    const status = this.newStatusForm.value.status!;

    this.molliePaymentService.createStatusEntry(molliePaymentId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creatingStatusEntry.set(false);
          this.showNewStatusForm.set(false);
          this.newStatusForm.reset();
          this.snackBar.open(this.translate.instant('bookings.statusAdded'), this.translate.instant('common.close'), { duration: 3000 });
          this.loadStatusEntries(molliePaymentId);
        },
        error: () => {
          this.creatingStatusEntry.set(false);
          this.snackBar.open(this.translate.instant('bookings.statusAddError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  openBookingLineDialog(line?: BookingLine) {
    if (!this.bookingId) return;

    const data: BookingLineDialogData = {
      bookingId: this.bookingId,
      bookingLine: line,
    };

    this.dialog.open(BookingLineDialogComponent, { data, width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.reloadBookingData();
        }
      });
  }

  deleteBookingLine(line: BookingLine) {
    if (!confirm(this.translate.instant('bookings.deleteConfirm', { name: line.accommodationName }))) return;

    this.bookingLineService.delete(line.bookingId, line.accommodationId, line.supplierId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('bookings.accommodationRemoved'), this.translate.instant('common.close'), { duration: 3000 });
          this.reloadBookingData();
        },
        error: () => {
          this.snackBar.open(this.translate.instant('bookings.removeError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  private reloadBookingData() {
    if (!this.bookingId) return;

    this.bookingService.getById(this.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => {
          this.currentFromDate.set(b.fromDate ?? null);
          this.currentUntilDate.set(b.untilDate ?? null);
          this.currentTotalSum.set(b.totalSum ?? 0);
        },
      });

    this.bookingLineService.getByBookingId(this.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lines) => this.bookingLines.set(lines),
      });
  }

  private loadPayments() {
    if (!this.bookingId) return;

    this.paymentsLoading.set(true);

    this.http.get<BookingMolliePaymentLink[]>(
      `${environment.apiUrl}/booking-mollie-payments/${this.bookingId}`
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (links) => {
        if (links.length === 0) {
          this.payments.set([]);
          this.paymentsLoading.set(false);
          return;
        }

        const paymentRequests = links.map(link =>
          this.molliePaymentService.getById(link.molliePaymentId)
        );

        forkJoin(paymentRequests)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (payments) => {
              this.payments.set(payments);
              this.paymentsLoading.set(false);
            },
            error: () => {
              this.payments.set([]);
              this.paymentsLoading.set(false);
            },
          });
      },
      error: () => {
        this.payments.set([]);
        this.paymentsLoading.set(false);
      },
    });
  }

  private loadStatusEntries(molliePaymentId: string) {
    this.statusEntriesLoading.set(true);
    this.molliePaymentService.getStatusEntries(molliePaymentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          this.statusEntries.set(entries);
          this.statusEntriesLoading.set(false);
        },
        error: () => {
          this.statusEntries.set([]);
          this.statusEntriesLoading.set(false);
        },
      });
  }

}
