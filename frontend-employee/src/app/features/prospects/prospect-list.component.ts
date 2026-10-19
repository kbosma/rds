import { Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BookerService } from '../bookers/booker.service';
import { BookerDialogComponent, BookerDialogData } from '../bookers/booker-dialog.component';
import { ProspectDialogComponent } from './prospect-dialog.component';
import {
  EmailTemplatePreviewDialogComponent,
  EmailTemplatePreviewDialogData,
} from '../email-templates/email-template-preview-dialog.component';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { deleteErrorKey } from '../../shared/utils/delete-error';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { Booker } from '../../shared/models';

/**
 * Overzicht van potentiële bookers (status PROSPECT) met registratie en bewerken.
 * Een prospect is in het datamodel een Booker; we filteren op status=prospect.
 */
@Component({
  selector: 'app-prospect-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    RowActionsComponent,
    TranslatePipe,
  ],
  template: `
    <div class="header">
      <h1>{{ 'prospects.title' | translate }}</h1>
      <button mat-raised-button color="primary" (click)="register()">
        <mat-icon>person_add</mat-icon> {{ 'prospects.register' | translate }}
      </button>
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (keyup)="applyFilter($event)" [placeholder]="'bookers.searchPlaceholder' | translate" />
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.name' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.firstname }} {{ row.prefix }} {{ row.lastname }}</td>
          </ng-container>

          <ng-container matColumnDef="emailaddress">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.email' | translate }}</th>
            <td mat-cell *matCellDef="let row"><span class="email-link">{{ row.emailaddress }}</span></td>
          </ng-container>

          <ng-container matColumnDef="telephone">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.telephone' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.telephone }}</td>
          </ng-container>

          <ng-container matColumnDef="birthdate">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'common.birthdate' | translate }}</th>
            <td mat-cell *matCellDef="let row">{{ row.birthdate | date:'dd-MM-yyyy' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let row" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewProspect(row)" (edit)="editProspect(row)" (remove)="deleteProspect(row)">
                <!-- E-mail versturen kan alleen vanuit een boeking of een prospect, niet vanuit de e-mailtemplates. -->
                @if (canSendEmail) {
                  <button type="button" mat-icon-button color="primary" class="action-email"
                          [matTooltip]="'emailTemplates.sendEmailTitle' | translate"
                          [attr.aria-label]="'emailTemplates.sendEmailTitle' | translate"
                          (click)="$event.stopPropagation(); sendEmail(row)">
                    <mat-icon>mail</mat-icon>
                  </button>
                }
              </app-row-actions>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'prospects.noProspectsFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
    }
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h1 { margin: 0; font-size: 24px; font-weight: 500; }
    .filter-field { width: 100%; }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width { width: 100%; }
    .alt-row { background-color: #fafafa; }
    .email-link { color: var(--theme-primary); }
    .actions-header { text-align: right; }
    .actions-cell { width: 1%; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    .loading { display: flex; justify-content: center; padding: 40px; }
  `],
})
export class ProspectListComponent implements OnInit {
  private bookerService = inject(BookerService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  private confirmService = inject(ConfirmService);
  private translate = inject(TranslateService);
  private snackBar = inject(MatSnackBar);

  canView = this.authService.hasAuthority('BOOKING_READ');
  canEdit = this.authService.hasAuthority('BOOKING_UPDATE');
  canDelete = this.authService.hasAuthority('BOOKING_DELETE');
  canSendEmail = this.authService.hasAuthority('EMAIL_SEND');

  displayedColumns = ['name', 'emailaddress', 'telephone', 'birthdate', 'actions'];
  dataSource = new MatTableDataSource<Booker>();
  loading = signal(true);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  ngOnInit() {
    this.dataSource.sortingDataAccessor = (item, property) => {
      if (property === 'name') {
        return `${item.firstname} ${item.prefix} ${item.lastname}`.trim();
      }
      return (item as unknown as Record<string, string>)[property] ?? '';
    };
    this.dataSource.filterPredicate = (data, filter) => {
      const searchStr = `${data.firstname} ${data.prefix} ${data.lastname} ${data.emailaddress} ${data.telephone}`.toLowerCase();
      return searchStr.includes(filter);
    };
    this.loadProspects();
  }

  private loadProspects() {
    this.loading.set(true);
    this.bookerService.getByStatus('prospect')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (prospects) => {
          this.dataSource.data = prospects;
          this.loading.set(false);
          setTimeout(() => {
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
          });
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  register() {
    this.dialog.open(ProspectDialogComponent, { width: '600px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created: boolean | undefined) => {
        if (created) {
          this.loadProspects();
        }
      });
  }

  /** Een e-mailtemplate kiezen en naar deze prospect sturen. */
  sendEmail(booker: Booker) {
    const name = `${booker.firstname} ${booker.prefix ?? ''} ${booker.lastname}`.replace(/\s+/g, ' ').trim();
    const data: EmailTemplatePreviewDialogData = { booker: { bookerId: booker.bookerId, name } };
    this.dialog.open(EmailTemplatePreviewDialogComponent, { data, width: '760px', maxWidth: '95vw' });
  }

  viewProspect(booker: Booker) {
    const data: BookerDialogData = { booker, readOnly: true };
    this.dialog.open(BookerDialogComponent, { data, width: '760px', maxWidth: '95vw' });
  }

  editProspect(booker: Booker) {
    const data: BookerDialogData = { booker, readOnly: false };
    this.dialog.open(BookerDialogComponent, { data, width: '760px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((updated: boolean | undefined) => {
        if (updated) {
          this.loadProspects();
        }
      });
  }

  async deleteProspect(booker: Booker) {
    const name = `${booker.firstname} ${booker.prefix ?? ''} ${booker.lastname}`.replace(/\s+/g, ' ').trim();
    if (!await this.confirmService.confirmDelete(this.translate.instant('common.deleteConfirmItem', { name }))) return;
    this.bookerService.delete(booker.bookerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dataSource.data = this.dataSource.data.filter(b => b.bookerId !== booker.bookerId);
          this.snackBar.open(this.translate.instant('common.deleted'), this.translate.instant('common.close'), { duration: 3000 });
        },
        error: (err) => this.snackBar.open(this.translate.instant(deleteErrorKey(err)), this.translate.instant('common.close'), { duration: 6000 }),
      });
  }
}
