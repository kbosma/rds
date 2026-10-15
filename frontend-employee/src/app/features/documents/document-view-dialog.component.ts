import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DocumentService } from './document.service';
import { Document } from '../../shared/models';

export interface DocumentViewDialogData {
  document: Document;
  /** Boekingsnummer van de boeking waaraan het document hangt (indien bekend). */
  bookingNumber?: string;
}

/**
 * Alleen-lezen weergave van een document met de mogelijkheid het te downloaden. Een document
 * (zeker een gegenereerd document) is geschiedenis: er is hier niets te wijzigen.
 */
@Component({
  selector: 'app-document-view-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatSnackBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'documents.viewTitle' | translate }}</h2>
    <mat-dialog-content>
      <dl class="details">
        <dt>{{ 'documents.displayname' | translate }}</dt>
        <dd>{{ data.document.displayname }}</dd>
        <dt>{{ 'bookings.bookingNumber' | translate }}</dt>
        <dd>{{ data.bookingNumber || '—' }}</dd>
        <dt>{{ 'documents.mimeType' | translate }}</dt>
        <dd>{{ data.document.mimeType || '—' }}</dd>
        <dt>{{ 'common.date' | translate }}</dt>
        <dd>{{ data.document.createdAt | date:'dd-MM-yyyy HH:mm' }}</dd>
        <dt>{{ 'documents.modifiedAt' | translate }}</dt>
        <dd>{{ data.document.modifiedAt ? (data.document.modifiedAt | date:'dd-MM-yyyy HH:mm') : '—' }}</dd>
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.close' | translate }}</button>
      <button mat-raised-button color="primary" class="download-btn" [disabled]="downloading()" (click)="download()">
        <mat-icon>download</mat-icon> {{ 'documents.download' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .details { display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin: 0; }
    .details dt { font-weight: 600; color: #555; }
    .details dd { margin: 0; word-break: break-word; }
  `],
})
export class DocumentViewDialogComponent {
  data: DocumentViewDialogData = inject(MAT_DIALOG_DATA);
  private documentService = inject(DocumentService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  downloading = signal(false);

  download() {
    this.downloading.set(true);
    this.documentService.getContent(this.data.document.documentId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.data.document.displayname;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.downloading.set(false);
        this.snackBar.open(this.translate.instant('documents.downloadError'), this.translate.instant('common.close'), { duration: 4000 });
      },
    });
  }
}
