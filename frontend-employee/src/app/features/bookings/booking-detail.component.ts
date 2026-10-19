import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { PaymentStatusBadgeComponent } from '../../shared/components/payment-status-badge.component';
import { MolliePaymentViewDialogComponent } from '../mollie/mollie-payment-view-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Booking, BookingService } from './booking.service';
import { BookingLineService } from './booking-line.service';
import { BookingActivityService } from './booking-activity.service';
import { BookingLineDialogComponent, BookingLineDialogData } from './booking-line-dialog.component';
import { BookingActivityDialogComponent, BookingActivityDialogData } from './booking-activity-dialog.component';
import { BookingEditDialogComponent, BookingEditDialogData } from './booking-edit-dialog.component';
import { BookerDialogComponent, BookerDialogData } from '../bookers/booker-dialog.component';
import { BookerSelectDialogComponent } from '../bookers/booker-select-dialog.component';
import { BookerService } from '../bookers/booker.service';
import { TravelerService } from '../travelers/traveler.service';
import { TravelerDialogComponent, TravelerDialogData } from '../travelers/traveler-dialog.component';
import { MolliePaymentService } from '../mollie/mollie-payment.service';
import { DocumentService } from '../documents/document.service';
import { BookingMessagesCardComponent } from './booking-messages-card.component';
import { TimelineItem } from './booking-timeline';
import { DocumentPortalDialogComponent } from '../documents/document-portal-dialog.component';
import { SentEmailService } from './sent-email.service';
import { SentEmailViewDialogComponent } from './sent-email-view-dialog.component';
import { DocumentUploadDialogComponent, DocumentUploadDialogData } from '../documents/document-upload-dialog.component';
import {
  EmailTemplatePreviewDialogComponent,
  EmailTemplatePreviewDialogData,
} from '../email-templates/email-template-preview-dialog.component';
import { AuthService } from '../../core/auth/auth.service';
import { Booker, Traveler, BookingLine, BookingActivity, MolliePayment, Document, SentEmail } from '../../shared/models';
import { CurrencyPipe, DatePipe, DecimalPipe, Location } from '@angular/common';
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
    BookingMessagesCardComponent,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    RowActionsComponent,
    PaymentStatusBadgeComponent,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatDividerModule,
    MatDialogModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    TranslatePipe,
  ],
  template: `
    <a routerLink="/bookings" class="back-link">
      <mat-icon>arrow_back</mat-icon> {{ 'bookings.backToBookings' | translate }}
    </a>

    <h1 class="page-title">
      {{ isNew() ? ('bookings.newBookingTitle' | translate) : ((readOnly() ? 'bookings.viewBookingTitle' : 'bookings.editBookingTitle') | translate) + ' — ' + currentBookingNumber() }}
    </h1>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="detail-columns">
        <div class="column">
        <!-- LEFT TOP: Booking details -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.bookingDetails' | translate }}</mat-card-title>
            @if (!isNew() && can('BOOKING_UPDATE')) {
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
            } @else {
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">{{ 'common.status' | translate }}</span>
                  <span class="info-value">{{ statuses[currentBookingStatus()] | translate }}</span>
                </div>
                <p class="concept-note">{{ 'bookings.conceptNotice' | translate }}</p>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- LEFT BOTTOM: Booking Lines (Accommodations) -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.accommodations' | translate }}</mat-card-title>
            @if (!readOnly()) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="openBookingLineDialog()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
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
                  <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let line" class="actions-cell">
                    <app-row-actions [canEdit]="!readOnly()" [canDelete]="!readOnly()"
                                     (edit)="openBookingLineDialog(line)" (remove)="deleteBookingLine(line)" />
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

      @if (!isNew()) {
        <mat-card class="middle-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookingActivity.title' | translate }}</mat-card-title>
            @if (!readOnly()) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="openBookingActivityDialog()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
          </mat-card-header>
          <mat-card-content>
            @if (bookingActivities().length > 0) {
              <table mat-table [dataSource]="bookingActivities()" class="full-width">
                <ng-container matColumnDef="activity">
                  <th mat-header-cell *matHeaderCellDef>{{ 'bookingActivity.activity' | translate }}</th>
                  <td mat-cell *matCellDef="let ba">
                    <div class="activity-cell">
                      <mat-icon class="activity-icon">local_activity</mat-icon>
                      <div>
                        <div class="activity-name">{{ ba.activityName }}</div>
                        <div class="activity-type">{{ 'activity.' + ba.activityType | translate }}</div>
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef>{{ 'bookingActivity.dateAndTimes' | translate }}</th>
                  <td mat-cell *matCellDef="let ba" class="activity-when">
                    <div>{{ ba.activityDate | date:'dd-MM-yyyy' }}</div>
                    <div class="activity-type">
                      {{ ba.fromTime?.substring(0, 5) }} — {{ ba.untilTime?.substring(0, 5) }}
                      @if (ba.untilTime < ba.fromTime) {
                        {{ 'bookingActivity.nextDay' | translate }}
                      }
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="totalPrice">
                  <th mat-header-cell *matHeaderCellDef>{{ 'bookingActivity.totalPrice' | translate }}</th>
                  <td mat-cell *matCellDef="let ba">
                    <span class="price-value">{{ ba.totalPrice | currency:'EUR':'symbol':'1.2-2' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="activityActions">
                  <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let ba" class="actions-cell">
                    <app-row-actions [canEdit]="!readOnly()" [canDelete]="!readOnly()"
                                     (edit)="openBookingActivityDialog(ba)" (remove)="deleteBookingActivity(ba)" />
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="bookingActivityColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: bookingActivityColumns;"></tr>
              </table>
            } @else {
              <p class="empty-text">{{ 'bookingActivity.noActivitiesYet' | translate }}</p>
            }
          </mat-card-content>
        </mat-card>

          <mat-card class="middle-card">
            <mat-card-header>
              <mat-card-title>{{ 'bookings.payments' | translate }}</mat-card-title>
              @if (!readOnly()) {
                <button mat-stroked-button color="primary" class="card-header-btn"
                        (click)="showNewPaymentForm.set(!showNewPaymentForm())">
                  <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
                </button>
              }
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
                <table mat-table [dataSource]="payments()" class="full-width">
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
                      <app-payment-status-badge [status]="currentPaymentStatus(p.molliePaymentId)" />
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="createdAt">
                    <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | translate }}</th>
                    <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'dd-MM-yyyy' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
                    <td mat-cell *matCellDef="let p" class="actions-cell">
                      <app-row-actions [canView]="authService.hasAuthority('PAYMENT_READ')" (view)="viewPayment(p)" />
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="paymentColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: paymentColumns;"></tr>
                </table>
              } @else {
                <p class="empty-text">{{ 'bookings.noPaymentsLinked' | translate }}</p>
              }
            </mat-card-content>
          </mat-card>
      }
        </div>

        <div class="column">
        <!-- RIGHT TOP: Booker info -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.mainBooker' | translate }}</mat-card-title>
            <span class="card-header-actions">
              @if (booker() && !isNew() && can('BOOKING_UPDATE')) {
                <button mat-stroked-button color="primary"
                        (click)="openBookerDialog()">
                  <mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}
                </button>
              }
              @if (booker() && !isNew() && can('BOOKING_DELETE')) {
                <button mat-stroked-button color="warn"
                        (click)="removeBooker()">
                  <mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}
                </button>
              }
              @if (!booker() && !isNew() && can('BOOKING_CREATE')) {
                <button mat-stroked-button color="primary"
                        (click)="openBookerSelectDialog()">
                  <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
                </button>
              }
            </span>
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

        <!-- RIGHT MIDDLE: Travelers -->
        <mat-card class="detail-card">
          <mat-card-header>
            <mat-card-title>{{ 'bookings.travelers' | translate }}</mat-card-title>
            @if (can('BOOKING_CREATE')) {
              <button mat-stroked-button color="primary" class="card-header-btn"
                      (click)="openTravelerDialog()">
                <mat-icon>add</mat-icon> {{ 'common.add' | translate }}
              </button>
            }
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
                  <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
                  <td mat-cell *matCellDef="let t" class="actions-cell">
                    <app-row-actions [canEdit]="can('BOOKING_UPDATE')" [canDelete]="can('BOOKING_DELETE')"
                                     (edit)="openTravelerDialog(t)" (remove)="deleteTraveler(t)" />
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

      @if (!isNew()) {
        <app-booking-messages-card
          [emails]="sentEmails()" [documents]="documents()" [payments]="payments()" [paymentStatus]="paymentStatusMap()"
          [canSendEmail]="!!booker() && can('EMAIL_SEND')" [canAddDocument]="can('DOCUMENT_CREATE')"
          [canReadEmail]="authService.hasAuthority('BOOKING_READ')" [canReadDocument]="authService.hasAuthority('DOCUMENT_READ')"
          [canReadPayment]="authService.hasAuthority('PAYMENT_READ')" [canEditDocument]="can('DOCUMENT_UPDATE')"
          (newEmail)="openEmailDialog()" (newDocument)="openDocumentUploadDialog()"
          (view)="viewTimelineItem($event)" (editDocument)="editDocumentPortal($event)" />
      }
        </div>
      </div>
    }
  `,
  styles: [`
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--theme-primary);
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
    .detail-columns {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 24px;
      align-items: start;
    }
    .column {
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-width: 0;
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
    .card-header-actions {
      display: flex;
      gap: 8px;
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
      color: var(--theme-primary);
    }
    .info-value.total {
      font-weight: 600;
      color: #2e7d32;
    }
    .empty-text {
      color: #888;
      font-style: italic;
    }
    .concept-note {
      color: #e65100;
      font-size: 13px;
      font-style: italic;
      margin: 8px 0 0;
    }
    .middle-card {
      border-radius: 12px;
    }
    .middle-card mat-card-header {
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
    .accommodation-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .accommodation-icon {
      color: var(--theme-primary);
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
    .activity-when {
      white-space: nowrap;
    }

    .activity-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .activity-icon {
      color: #7b1fa2;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .activity-name {
      font-weight: 500;
    }
    .activity-type {
      color: #666;
      font-size: 12px;
    }
    .actions-header { text-align: right; }
    .actions-cell { width: 1%; white-space: nowrap; }
    .new-payment-form {
      padding: 16px 0;
    }
    .form-divider {
      margin-bottom: 16px;
    }
  `],
})
export class BookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private bookingLineService = inject(BookingLineService);
  private bookingActivityService = inject(BookingActivityService);
  private bookerService = inject(BookerService);
  private travelerService = inject(TravelerService);
  private molliePaymentService = inject(MolliePaymentService);
  private documentService = inject(DocumentService);
  private sentEmailService = inject(SentEmailService);
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private location = inject(Location);

  bookingId: string | null = null;
  /** In concept-modus: de gekozen hoofdboeker, nog niet gepersisteerd als boeking. */
  private conceptBookerId: string | null = null;

  newPaymentForm = this.fb.group({
    description: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  isNew = signal(true);
  loading = signal(false);
  currentBooking = signal<Booking | null>(null);

  currentBookingNumber = signal('');
  /** Alleen inzien: geopend met ?readonly=true (inzien-icoon in de boekingenlijst); alle wijzig-knoppen zijn dan weg. */
  readOnly = signal(false);
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
    opreis: 'bookings.status_opreis',
    weerthuis: 'bookings.status_weerthuis',
    afgerond: 'bookings.status_afgerond',
  };
  booker = signal<Booker | null>(null);
  travelers = signal<Traveler[]>([]);
  bookingLines = signal<BookingLine[]>([]);

  // Documents
  documents = signal<Document[]>([]);
  sentEmails = signal<SentEmail[]>([]);

  // Payments
  payments = signal<MolliePayment[]>([]);
  paymentsLoading = signal(false);
  showNewPaymentForm = signal(false);
  creatingPayment = signal(false);

  /** Huidige status per betaling (de laatste statusregel, gezet door Mollie). */
  paymentStatusMap = signal<Record<string, string>>({});

  // Booking Activities
  bookingActivities = signal<BookingActivity[]>([]);
  bookingActivityColumns = ['activity', 'period', 'totalPrice', 'activityActions'];

  bookingLineColumns = ['accommodation', 'period', 'price', 'actions'];
  travelerColumns = ['name', 'birthdate', 'actions'];
  paymentColumns = ['description', 'amount', 'status', 'createdAt', 'actions'];

  currentPaymentStatus(molliePaymentId: string): string {
    return this.paymentStatusMap()[molliePaymentId] ?? '';
  }

  /** Een wijzigende actie is alleen toegestaan met de authority én buiten alleen-inzien. */
  can(authority: string): boolean {
    return !this.readOnly() && this.authService.hasAuthority(authority);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isNew.set(false);
      this.bookingId = id;
      this.readOnly.set(this.route.snapshot.queryParamMap.get('readonly') === 'true');
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

          this.loadBookingActivities();
          this.loadPayments();
          this.loadDocuments();
          this.loadSentEmails();
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(this.translate.instant('bookings.notFound'), this.translate.instant('common.close'), { duration: 3000 });
          this.router.navigate(['/bookings']);
        },
      });
    } else {
      // Concept-modus: nieuwe boeking met voorgevulde hoofdboeker (via query param).
      // Een boeking begint altijd bij een boeker; ontbreekt die (bv. bij handmatig
      // openen van /bookings/new), stuur dan terug naar het overzicht.
      const bookerId = this.route.snapshot.queryParamMap.get('bookerId');
      if (!bookerId) {
        this.snackBar.open(this.translate.instant('bookings.selectBookerFirst'), this.translate.instant('common.close'), { duration: 4000 });
        this.router.navigate(['/bookings']);
        return;
      }
      this.currentBookingStatus.set('aanvraag');
      this.conceptBookerId = bookerId;
      this.bookerService.getById(bookerId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (booker) => this.booker.set(booker),
      });
    }
  }

  /**
   * Zorgt dat er een gepersisteerde boeking is voordat een sub-actie (accommodatie,
   * reiziger, ...) wordt uitgevoerd. In concept-modus wordt — na bevestiging — de
   * boeking nu pas echt aangemaakt (met boekingnummer), waarna `proceed` draait.
   */
  private async ensureBookingPersisted(proceed: (bookingId: string) => void) {
    if (this.bookingId) {
      proceed(this.bookingId);
      return;
    }
    if (!this.conceptBookerId) return;
    if (!await this.confirmService.confirm(this.translate.instant('bookings.createConceptConfirm'))) return;

    this.bookingService.create({ bookerId: this.conceptBookerId, bookingStatus: 'aanvraag' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.applyCreatedBooking(created);
          this.refreshBookerIfProspect();
          proceed(created.bookingId);
        },
        error: () => {
          this.snackBar.open(this.translate.instant('bookings.createError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  /**
   * De backend maakt een prospect ACTIVE zodra er een boeking voor hem wordt aangemaakt. Laad de boeker opnieuw,
   * zodat het scherm niet nog de oude status (en bv. de knop "Maak boeker") toont.
   */
  private refreshBookerIfProspect() {
    const booker = this.booker();
    if (booker?.status !== 'prospect') return;
    this.bookerService.getById(booker.bookerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (fresh) => this.booker.set(fresh) });
  }

  /** Verwerkt de zojuist aangemaakte boeking: concept wordt een echte boeking. */
  private applyCreatedBooking(created: Booking) {
    this.bookingId = created.bookingId;
    this.currentBooking.set(created);
    this.currentBookingNumber.set(created.bookingNumber);
    this.currentBookingStatus.set(created.bookingStatus);
    this.currentFromDate.set(created.fromDate ?? null);
    this.currentUntilDate.set(created.untilDate ?? null);
    this.currentTotalSum.set(created.totalSum ?? 0);
    this.isNew.set(false);
    // Werk de URL bij naar de echte boeking zonder herladen.
    this.location.replaceState('/bookings/' + created.bookingId);
    this.snackBar.open(this.translate.instant('bookings.created'), this.translate.instant('common.close'), { duration: 3000 });
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

  /** Alleen-lezen weergave van een betaling met de volledige statushistorie, in een dialoog. */
  viewPayment(payment: MolliePayment) {
    this.dialog.open(MolliePaymentViewDialogComponent, {
      data: {
        payment,
        bookingNumber: this.currentBookingNumber(),
        canCorrect: this.can('PAYMENT_CORRECT'),
        currentBookingId: this.bookingId,
        canRelink: this.can('PAYMENT_RELINK'),
      },
      width: '640px',
      maxWidth: '95vw',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((changed) => {
      if (changed) this.loadPayments(); // een correctie wijzigt de status, een herkoppeling haalt de betaling bij deze boeking weg
    });
  }

  openBookingLineDialog(line?: BookingLine) {
    this.ensureBookingPersisted((bookingId) => {
      const data: BookingLineDialogData = {
        bookingId,
        bookingLine: line,
        existingLines: this.bookingLines(),
      };

      this.dialog.open(BookingLineDialogComponent, { data, width: '500px' })
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((result) => {
          if (result) {
            this.reloadBookingData();
          }
        });
    });
  }

  /** Een e-mailtemplate samenvoegen met deze boeking en naar de hoofdboeker sturen. */
  openEmailDialog() {
    if (!this.bookingId) return;

    const data: EmailTemplatePreviewDialogData = {
      booking: { bookingId: this.bookingId, bookingNumber: this.currentBookingNumber() },
    };
    this.dialog.open(EmailTemplatePreviewDialogComponent, { data, width: '760px', maxWidth: '95vw' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadSentEmails());
  }

  /** Een regel uit de tijdlijn openen: dezelfde dialogen als eerder, per soort. */
  viewTimelineItem(item: TimelineItem) {
    if (item.kind === 'document') this.viewDocument(item.source);
    else if (item.kind === 'payment') this.viewPayment(item.source);
    else this.viewSentEmail(item.source);
  }

  /** Een document kan achteraf alleen nog zichtbaar of onzichtbaar gemaakt worden in het boekerportaal. */
  editDocumentPortal(doc: Document) {
    this.dialog.open(DocumentPortalDialogComponent, { data: { document: doc }, width: '420px', maxWidth: '95vw' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((saved) => {
        if (saved) this.loadDocuments();
      });
  }

  viewSentEmail(email: SentEmail) {
    this.dialog.open(SentEmailViewDialogComponent, {
      data: { email, canResend: this.can('EMAIL_SEND') },
      width: '760px',
      maxWidth: '95vw',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((resent) => {
      if (resent) this.loadSentEmails();
    });
  }

  openBookerDialog() {
    if (!this.booker()) return;

    const data: BookerDialogData = { booker: this.booker()!, readOnly: false };
    this.dialog.open(BookerDialogComponent, { data, width: '760px', maxWidth: '95vw' })
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

  async removeBooker() {
    if (!this.bookingId || !this.booker()) return;
    if (!await this.confirmService.confirm(this.translate.instant('bookings.removeBookerConfirm'))) return;

    this.bookingService.update(this.bookingId, { bookerId: null as unknown as string })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.booker.set(null);
          this.snackBar.open(this.translate.instant('bookings.bookerRemoved'), this.translate.instant('common.close'), { duration: 3000 });
        },
        error: () => {
          this.snackBar.open(this.translate.instant('bookings.bookerRemoveError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  openBookerSelectDialog() {
    if (!this.bookingId) return;

    this.dialog.open(BookerSelectDialogComponent, { width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedBookerId: string | undefined) => {
        if (selectedBookerId) {
          this.bookingService.update(this.bookingId!, { bookerId: selectedBookerId })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.bookerService.getById(selectedBookerId)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({
                    next: (booker) => this.booker.set(booker),
                  });
                this.snackBar.open(this.translate.instant('bookings.bookerLinked'), this.translate.instant('common.close'), { duration: 3000 });
              },
              error: () => {
                this.snackBar.open(this.translate.instant('bookings.bookerLinkError'), this.translate.instant('common.close'), { duration: 5000 });
              },
            });
        }
      });
  }

  openTravelerDialog(traveler?: Traveler) {
    this.ensureBookingPersisted((bookingId) => {
      const data: TravelerDialogData = { bookingId, traveler };
      this.dialog.open(TravelerDialogComponent, { data, width: '500px' })
        .afterClosed()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((result) => {
          if (result) {
            this.reloadTravelers();
          }
        });
    });
  }

  async deleteTraveler(traveler: Traveler) {
    const name = `${traveler.firstname} ${traveler.prefix ?? ''} ${traveler.lastname}`.replace(/\s+/g, ' ').trim();
    if (!await this.confirmService.confirmDelete(this.translate.instant('bookings.deleteConfirm', { name }))) return;

    this.travelerService.delete(traveler.travelerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('travelers.removed'), this.translate.instant('common.close'), { duration: 3000 });
          this.reloadTravelers();
        },
        error: () => {
          this.snackBar.open(this.translate.instant('travelers.removeError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  private reloadTravelers() {
    if (!this.bookingId) return;
    this.travelerService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (travelers) => {
          this.travelers.set(travelers.filter((t) => t.bookingId === this.bookingId));
        },
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

  async deleteBookingLine(line: BookingLine) {
    if (!await this.confirmService.confirmDelete(this.translate.instant('bookings.deleteConfirm', { name: line.accommodationName }))) return;

    this.bookingLineService.delete(line.bookingLineId)
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

  openBookingActivityDialog(ba?: BookingActivity) {
    if (!this.bookingId) return;

    const data: BookingActivityDialogData = {
      bookingId: this.bookingId,
      bookingActivity: ba,
    };

    this.dialog.open(BookingActivityDialogComponent, { data, width: '500px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.loadBookingActivities();
          this.reloadBookingData();
        }
      });
  }

  async deleteBookingActivity(ba: BookingActivity) {
    if (!await this.confirmService.confirmDelete(this.translate.instant('bookings.deleteConfirm', { name: ba.activityName }))) return;

    this.bookingActivityService.delete(ba.bookingActivityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(this.translate.instant('bookingActivity.removed'), this.translate.instant('common.close'), { duration: 3000 });
          this.loadBookingActivities();
          this.reloadBookingData();
        },
        error: () => {
          this.snackBar.open(this.translate.instant('bookings.removeError'), this.translate.instant('common.close'), { duration: 5000 });
        },
      });
  }

  private loadBookingActivities() {
    if (!this.bookingId) return;

    this.bookingActivityService.getByBookingId(this.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (activities) => this.bookingActivities.set(activities),
        error: () => this.bookingActivities.set([]),
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
              this.loadPaymentStatuses(payments);
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

  private loadSentEmails() {
    if (!this.bookingId || !this.authService.hasAuthority('BOOKING_READ')) return;
    this.sentEmailService.getByBookingId(this.bookingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (emails) => this.sentEmails.set(emails),
        error: () => this.sentEmails.set([]),
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

  private loadPaymentStatuses(payments: MolliePayment[]) {
    const statusRequests = payments.map(p =>
      this.molliePaymentService.getStatusEntries(p.molliePaymentId)
    );
    if (statusRequests.length === 0) return;

    forkJoin(statusRequests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (allEntries) => {
          const map: Record<string, string> = {};
          allEntries.forEach((entries, i) => {
            if (entries.length > 0) {
              map[payments[i].molliePaymentId] = entries[entries.length - 1].status?.toLowerCase() ?? '';
            }
          });
          this.paymentStatusMap.set(map);
        },
      });
  }

}
