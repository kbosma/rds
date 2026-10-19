import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { EmailTemplateService } from './email-template.service';
import { AuthService } from '../../core/auth/auth.service';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { EmailTemplate } from '../../shared/models';
import { EmailTemplateDialogComponent } from './email-template-dialog.component';

/**
 * Beheer van e-mailtemplates (subject + HTML-body) die per organisatie worden
 * opgeslagen en gemerged met prospect-gegevens kunnen worden voorbekeken.
 */
@Component({
  selector: 'app-email-template-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    RowActionsComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslatePipe,
  ],
  template: `
    <div class="header">
      <h1>{{ 'emailTemplates.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" class="new-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> {{ 'emailTemplates.new' | translate }}
        </button>
      }
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (input)="applyFilter($event)" />
    </mat-form-field>

    @if (loading()) {
      <div class="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table mat-table [dataSource]="paged()" class="full-width">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | translate }}</th>
            <td mat-cell *matCellDef="let tpl">{{ tpl.name }}</td>
          </ng-container>

          <ng-container matColumnDef="description">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.description' | translate }}</th>
            <td mat-cell *matCellDef="let tpl">{{ tpl.description }}</td>
          </ng-container>

          <ng-container matColumnDef="subject">
            <th mat-header-cell *matHeaderCellDef>{{ 'emailTemplates.subject' | translate }}</th>
            <td mat-cell *matCellDef="let tpl">{{ tpl.subject }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | translate }}</th>
            <td mat-cell *matCellDef="let tpl">{{ tpl.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let tpl" class="actions-cell">
              <!-- Inzien = de template alleen-lezen. E-mail versturen kan hier niet: dat gebeurt vanuit een boeking of een prospect. -->
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewTemplate(tpl)" (edit)="openDialog(tpl)" (remove)="confirmDelete(tpl)" />
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index"
              [class.alt-row]="i % 2 === 1"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              {{ 'emailTemplates.noTemplatesFound' | translate }}
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="filtered().length"
        [pageSize]="pageSize()"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPage($event)"
        showFirstLastButtons>
      </mat-paginator>
    }
  `,
  styles: [`
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 500;
    }
    .filter-field {
      width: 100%;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .full-width { width: 100%; }
    .alt-row { background-color: #fafafa; }
    .actions-header { text-align: right; }
    .actions-cell { width: 1%; }
    .no-data { text-align: center; padding: 24px; color: #888; }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
  `],
})
export class EmailTemplateListComponent implements OnInit {
  private emailTemplateService = inject(EmailTemplateService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);

  canCreate = this.authService.hasAuthority('TEMPLATE_CREATE');
  canView = this.authService.hasAuthority('TEMPLATE_READ');
  canEdit = this.authService.hasAuthority('TEMPLATE_UPDATE');
  canDelete = this.authService.hasAuthority('TEMPLATE_DELETE');

  displayedColumns = ['name', 'description', 'subject', 'createdAt', 'actions'];
  pageIndex = signal(0);
  pageSize = signal(25);

  allTemplates = signal<EmailTemplate[]>([]);
  filtered = signal<EmailTemplate[]>([]);
  loading = signal(true);
  paged = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  ngOnInit() {
    this.loadTemplates();
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.pageIndex.set(0);
    if (!value) {
      this.filtered.set(this.allTemplates());
    } else {
      this.filtered.set(
        this.allTemplates().filter(t =>
          t.name.toLowerCase().includes(value)
          || (t.description?.toLowerCase().includes(value) ?? false)
          || t.subject.toLowerCase().includes(value)
        )
      );
    }
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  openDialog(template?: EmailTemplate) {
    const dialogRef = this.dialog.open(EmailTemplateDialogComponent, {
      data: { template },
      width: '860px',
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      if (result) {
        this.loadTemplates();
      }
    });
  }

  viewTemplate(template: EmailTemplate) {
    this.dialog.open(EmailTemplateDialogComponent, {
      data: { template, readOnly: true },
      width: '860px',
      maxWidth: '95vw',
    });
  }

  async confirmDelete(template: EmailTemplate) {
    const message = this.translate.instant('emailTemplates.deleteConfirm', { name: template.name });
    if (!await this.confirmService.confirmDelete(message)) return;

    this.emailTemplateService.delete(template.emailTemplateId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('emailTemplates.removed'), this.translate.instant('common.close'), { duration: 3000 });
        this.loadTemplates();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('emailTemplates.removeError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  private loadTemplates() {
    this.loading.set(true);
    this.emailTemplateService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (templates) => {
        this.allTemplates.set(templates);
        this.filtered.set(templates);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
