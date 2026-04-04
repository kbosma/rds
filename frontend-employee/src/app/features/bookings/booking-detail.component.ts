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
import { BookingEditDialogComponent, BookingEditDialogData } from './booking-edit-dialog.component';
import { BookerDialogComponent, BookerDialogData } from '../bookers/booker-dialog.component';
import { BookerService } from '../bookers/booker.service';
import { TravelerService } from '../travelers/traveler.service';
import { MolliePaymentService } from '../mollie/mollie-payment.service';
import { DocumentService } from '../documents/document.service';
import { DocumentUploadDialogComponent, DocumentUploadDialogData } from '../documents/document-upload-dialog.component';
import { AuthService } from '../../core/auth/auth.service';
import { Booker, Traveler, BookingLine, MolliePayment, MolliePaymentStatusEntry, Document } from '../../shared/models';
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
            @if (!isNew() && authService.hasAuthority('BOOKING_UPDATE')) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="openBookingEditDialog()">
                <mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}
              </button>
            }
          </mat-card-header>
          <mat-card-content>
            @if (!isNew()) {
              <div class="info-grid info-grid-wide">
                <div class="info-item">
                  <span class="info-label">{{ 'bookings.bookingNumber' | translate }}</span>
                  <span class="info-value">{{ currentBookingNumber() }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'common.status' | translate }}</span>
                  <span class="info-value">{{ statuses[currentBookingStatus()] | translate }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'bookings.fromDateComputed' | translate }}</span>
                  <span class="info-value">{{ currentFromDate() | date:'dd-MM-yyyy' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'bookings.untilDateComputed' | translate }}</span>
                  <span class="info-value">{{ currentUntilDate() | date:'dd-MM-yyyy' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ 'bookings.totalComputed' | translate }}</span>
                  <span class="info-value total">{{ currentTotalSum() | currency:'EUR':'symbol':'1.2-2' }}</span>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- RIGHT TOP: Booker info -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.mainBooker' | translate }}</mat-card-title>
            @if (booker() && authService.hasAuthority('BOOKING_UPDATE')) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="openBookerDialog()">
                <mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}
              </button>
            }
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
              <table mat-table [dataSource]="bookingLines()" class="full-width">
                <ng-container matColumnDef="accommodation">
                  <th mat-header-cell *matHeaderCellDef>{{ 'bookingLine.accommodation' | translate }}</th>
                  <td mat-cell *matCellDef="let line">
                    <div class="accommodation-cell">
                      <mat-icon class="accommodation-icon">hotel</mat-icon>
                      <div>
                        <div class="accommodation-name">{{ line.accommodationName }}</div>
                        <div class="accommodation-supplier">{{ line.supplierName }}</div>
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.from' | translate }} — {{ 'common.until' | translate }}</th>
                  <td mat-cell *matCellDef="let line">{{ line.fromDate | date:'dd-MM-yyyy' }} — {{ line.untilDate | date:'dd-MM-yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="price">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.price' | translate }}</th>
                  <td mat-cell *matCellDef="let line">
                    <span class="price-value">{{ line.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let line">
                    <button mat-icon-button color="primary" (click)="openBookingLineDialog(line)"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button color="warn" (click)="deleteBookingLine(line)"><mat-icon>delete</mat-icon></button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="bookingLineColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: bookingLineColumns;"></tr>
              </table>
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

      <!-- Payments & Documents -->
      @if (!isNew()) {
      <div class="bottom-grid">
        <mat-card class="bottom-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.payments' | translate }}</mat-card-title>
            <button mat-stroked-button color="primary" class="card-header-btn"
                    (click)="showNewPaymentForm.set(!showNewPaymentForm())">
              <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
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

        <mat-card class="bottom-card">
          <mat-card-header>
            <mat-card-title>{{ 'documents.title' | translate }}</mat-card-title>
            @if (authService.hasAuthority('BOOKING_CREATE')) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="openDocumentUploadDialog()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
          </mat-card-header>
          <mat-card-content>
            @if (documents().length > 0) {
              <table mat-table [dataSource]="documents()" class="full-width">
                <ng-container matColumnDef="displayname">
                  <th mat-header-cell *matHeaderCellDef>{{ 'documents.displayname' | translate }}</th>
                  <td mat-cell *matCellDef="let d">
                    <div class="document-name">
                      <mat-icon class="doc-icon">description</mat-icon>
                      {{ d.displayname }}
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | translate }}</th>
                  <td mat-cell *matCellDef="let d">{{ d.createdAt | date:'dd-MM-yyyy' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let d">
                    <button mat-icon-button color="primary" (click)="viewDocument(d)">
                      <mat-icon>visibility</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteDocument(d)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="documentColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: documentColumns;"></tr>
              </table>
            } @else {
              <p class="empty-text">{{ 'documents.noDocumentsYet' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>
      </div>
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
      gap: 8px;
    }
    .info-grid-wide {
      --label-width: 180px;
    }
    .info-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .info-label {
      font-size: 13px;
      color: #888;
      width: var(--label-width, 130px);
      flex-shrink: 0;
    }
    .info-label::after {
      content: ':';
    }
    .info-value {
      font-size: 14px;
    }
    .info-value.email {
      color: #1976d2;
    }
    .info-value.total {
      font-weight: 600;
      color: #2e7d32;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
      align-items: start;
    }
    .bottom-card {
      border-radius: 12px;
    }
    .bottom-card mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .document-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .doc-icon {
      color: #1976d2;
      font-size: 20px;
      width: 20px;
      height: 20px;
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
    .accommodation-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .accommodation-icon {
      color: #1976d2;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .accommodation-name {
      font-weight: 500;
    }
    .accommodation-supplier {
      color: #666;
      font-size: 12px;
    }
    .price-value {
      font-weight: 600;
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
  private documentService = inject(DocumentService);
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  bookingId: string | null = null;

  newPaymentForm = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  newStatusForm = this.fb.group({
    status: ['', Validators.required],
  });

  isNew = signal(true);
  loading = signal(false);
  currentBooking = signal<Booking | null>(null);

  currentBookingNumber = signal('');
  currentBookingStatus = signal('');
  currentFromDate = signal<string | null>(null);
  currentUntilDate = signal<string | null>(null);
  currentTotalSum = signal<number>(0);

  statuses: Record<string, string> = {
    aanvraag: 'bookings.status_aanvraag',
    offerte: 'bookings.status_offerte',
    boeking: 'bookings.status_boeking',
    voorschot: 'bookings.status_voorschot',
    betaald: 'bookings.status_betaald',
    afgerond: 'bookings.status_afgerond',
  };
  booker = signal<Booker | null>(null);
  travelers = signal<Traveler[]>([]);
  bookingLines = signal<BookingLine[]>([]);

  // Documents
  documents = signal<Document[]>([]);
  documentColumns = ['displayname', 'createdAt', 'actions'];

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

  bookingLineColumns = ['accommodation', 'period', 'price', 'actions'];
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
          this.currentBooking.set(b);
          this.currentBookingNumber.set(b.bookingNumber);
          this.currentBookingStatus.set(b.bookingStatus);
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
          this.loadDocuments();
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(this.translate.instant('bookings.notFound'), this.translate.instant('common.close'), { duration: 3000 });
          this.router.navigate(['/bookings']);
        },
      });
    }
  }

  openBookingEditDialog() {
    if (!this.currentBooking()) return;

    const data: BookingEditDialogData = { booking: this.currentBooking()! };
    this.dialog.open(BookingEditDialogComponent, { data, width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.reloadBookingData();
        }
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

  openBookerDialog() {
    if (!this.booker()) return;

    const data: BookerDialogData = { booker: this.booker()!, readOnly: false };
    this.dialog.open(BookerDialogComponent, { data, width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result && this.booker()?.bookerId) {
          this.bookerService.getById(this.booker()!.bookerId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (booker) => this.booker.set(booker),
            });
        }
      });
  }

  openDocumentUploadDialog() {
    if (!this.bookingId) return;

    const data: DocumentUploadDialogData = { bookingId: this.bookingId };
    this.dialog.open(DocumentUploadDialogComponent, { data, width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.loadDocuments();
        }
      });
  }

  viewDocument(doc: Document) {
    this.documentService.getContent(doc.documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: () => {
          this.snackBar.open(this.translate.instant('documents.fetchError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  deleteDocument(doc: Document) {
    if (!confirm(this.translate.instant('documents.deleteConfirm', { name: doc.displayname }))) return;

    this.documentService.delete(doc.documentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('documents.removed'), this.translate.instant('common.close'), { duration: 3000 });
          this.loadDocuments();
        },
        error: () => {
          this.snackBar.open(this.translate.instant('documents.removeError'), this.translate.instant('common.close'), { duration: 5000 });
        },
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
          this.currentBooking.set(b);
          this.currentBookingNumber.set(b.bookingNumber);
          this.currentBookingStatus.set(b.bookingStatus);
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

  private loadDocuments() {
    if (!this.bookingId) return;

    this.documentService.getByBookingId(this.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (docs) => this.documents.set(docs),
        error: () => this.documents.set([]),
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
