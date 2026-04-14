import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TemplateService } from './template.service';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentTemplate } from '../../shared/models';
import { TemplateDialogComponent } from './template-dialog.component';

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <div class="header">
      <h1>{{ 'templates.title' | translate }}</h1>
      @if (canEdit) {
        <button mat-raised-button color="primary" (click)="openDialog()">
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
      @if (filtered().length === 0) {
        <p class="no-data">{{ 'templates.noTemplatesFound' | translate }}</p>
      } @else {
        <div class="card-grid">
          @for (tpl of filtered(); track tpl.documentTemplateId) {
            <mat-card class="template-card">
              <mat-card-content>
                <h3 class="tpl-name">{{ tpl.name }}</h3>
                @if (tpl.description) {
                  <p class="tpl-desc">{{ tpl.description }}</p>
                }
                <mat-divider></mat-divider>
                <div class="tpl-detail">
                  <mat-icon>calendar_today</mat-icon>
                  <span>{{ 'templates.createdAt' | translate }}: {{ tpl.createdAt | date:'dd-MM-yyyy HH:mm' }}</span>
                </div>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-button color="primary" (click)="download(tpl)">
                  <mat-icon>download</mat-icon> {{ 'common.details' | translate }}
                </button>
                @if (canEdit) {
                  <button mat-button color="primary" (click)="openDialog(tpl)">
                    <mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}
                  </button>
                  <button mat-button color="warn" (click)="confirmDelete(tpl)">
                    <mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}
                  </button>
                }
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
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
    .card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .template-card {
      border-radius: 12px;
      overflow: hidden;
    }
    .tpl-name {
      font-size: 18px;
      font-weight: 500;
      margin: 8px 0 4px;
    }
    .tpl-desc {
      font-size: 13px;
      color: #666;
      margin-bottom: 12px;
    }
    .tpl-detail {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      color: #666;
      font-size: 14px;
    }
    .tpl-detail mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #888;
    }
    .no-data {
      color: #888;
      font-size: 14px;
      text-align: center;
      padding: 40px;
    }
    .loading {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    @media (max-width: 1200px) {
      .card-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 800px) {
      .card-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TemplateListComponent implements OnInit {
  private templateService = inject(TemplateService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  canEdit = this.authService.hasRole('MANAGER');

  allTemplates = signal<DocumentTemplate[]>([]);
  filtered = signal<DocumentTemplate[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.loadTemplates();
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
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

  openDialog(template?: DocumentTemplate) {
    const dialogRef = this.dialog.open(TemplateDialogComponent, {
      data: { template },
      width: '500px',
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

  confirmDelete(template: DocumentTemplate) {
    const message = this.translate.instant('templates.deleteConfirm', { name: template.name });
    if (!confirm(message)) return;

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
