import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../shared/services/confirm.service';
import { TemplateService } from './template.service';
import { AuthService } from '../../core/auth/auth.service';
import { RowActionsComponent } from '../../shared/components/row-actions.component';
import { DocumentTemplate } from '../../shared/models';
import { TemplateDialogComponent } from './template-dialog.component';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    DatePipe,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
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
      <h1>{{ 'templates.title' | translate }}</h1>
      @if (canCreate) {
        <button mat-raised-button color="primary" class="new-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> {{ 'templates.newTemplate' | translate }}
        </button>
      }
    </div>

    <mat-form-field appearance="outline" class="filter-field">
      <mat-label>{{ 'common.search' | translate }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput (input)="applyFilter($event)" [placeholder]="'templates.searchPlaceholder' | translate" />
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

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>{{ 'templates.type' | translate }}</th>
            <td mat-cell *matCellDef="let tpl">
              {{ (tpl.sourceHtml != null ? 'templates.typeEditor' : 'templates.typeUpload') | translate }}
            </td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>{{ 'templates.createdAt' | translate }}</th>
            <td mat-cell *matCellDef="let tpl">{{ tpl.createdAt | date:'dd-MM-yyyy HH:mm' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="actions-header">{{ 'common.actions' | translate }}</th>
            <td mat-cell *matCellDef="let tpl" class="actions-cell">
              <app-row-actions [canView]="canView" [canEdit]="canEdit" [canDelete]="canDelete"
                               (view)="viewTemplate(tpl)" (edit)="openDialog(tpl)" (remove)="confirmDelete(tpl)">
                @if (canView) {
                  <button type="button" mat-icon-button class="action-download act-info"
                          [matTooltip]="'templates.download' | translate"
                          [attr.aria-label]="'templates.download' | translate"
                          (click)="download(tpl)">
                    <mat-icon>download</mat-icon>
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
              {{ 'templates.noTemplatesFound' | translate }}
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
export class TemplateListComponent implements OnInit {
  private templateService = inject(TemplateService);
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

  displayedColumns = ['name', 'description', 'type', 'createdAt', 'actions'];
  pageIndex = signal(0);
  pageSize = signal(25);

  allTemplates = signal<DocumentTemplate[]>([]);
  filtered = signal<DocumentTemplate[]>([]);
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
        )
      );
    }
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  viewTemplate(template: DocumentTemplate) {
    this.dialog.open(TemplateDialogComponent, {
      data: { template, readOnly: true },
      width: template.sourceHtml != null ? '980px' : '500px',
      maxWidth: '95vw',
    });
  }

  openDialog(template?: DocumentTemplate) {
    const dialogRef = this.dialog.open(TemplateDialogComponent, {
      data: { template },
      // een template uit de editor heeft meer ruimte nodig dan het uploadformulier
      width: template?.sourceHtml != null ? '980px' : '500px',
      maxWidth: '95vw',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTemplates();
      }
    });
  }

  download(template: DocumentTemplate) {
    this.templateService.getContent(template.documentTemplateId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = template.name + '.docx';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  async confirmDelete(template: DocumentTemplate) {
    const message = this.translate.instant('templates.deleteConfirm', { name: template.name });
    if (!await this.confirmService.confirmDelete(message)) return;

    this.templateService.delete(template.documentTemplateId).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('templates.removed'), this.translate.instant('common.close'), { duration: 3000 });
        this.loadTemplates();
      },
      error: () => {
        this.snackBar.open(this.translate.instant('templates.removeError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  private loadTemplates() {
    this.loading.set(true);
    this.templateService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (templates) => {
        this.allTemplates.set(templates);
        this.filtered.set(templates);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
