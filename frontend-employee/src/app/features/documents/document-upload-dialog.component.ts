import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DocumentService } from './document.service';
import { TemplateService } from '../templates/template.service';
import { DocumentTemplate } from '../../shared/models';
import { HttpClient } from '@angular/common/http';

const ALLOWED_MIME_TYPES = ['application/pdf'];

const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export interface DocumentUploadDialogData {
  bookingId: string;
}

@Component({
  selector: 'app-document-upload-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'documents.dialogTitle' | translate }}</h2>
    <mat-dialog-content>
      <!-- Displayname (shared) -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'documents.displayname' | translate }}</mat-label>
        <input matInput [(ngModel)]="displayname" [placeholder]="'documents.displaynamePlaceholder' | translate" />
      </mat-form-field>

      <!-- Mode toggle -->
      <mat-button-toggle-group [(ngModel)]="mode" class="mode-toggle">
        <mat-button-toggle value="generate">
          <mat-icon>auto_awesome</mat-icon> {{ 'documents.generateSection' | translate }}
        </mat-button-toggle>
        <mat-button-toggle value="upload">
          <mat-icon>upload_file</mat-icon> {{ 'documents.uploadSection' | translate }}
        </mat-button-toggle>
      </mat-button-toggle-group>

      <!-- Generate section -->
      @if (mode === 'generate') {
        <div class="section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'documents.template' | translate }}</mat-label>
            <mat-select [(ngModel)]="selectedTemplateId">
              @for (tpl of templates(); track tpl.documentTemplateId) {
                <mat-option [value]="tpl.documentTemplateId">{{ tpl.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-button-toggle-group [(ngModel)]="outputFormat" class="format-toggle">
            <mat-button-toggle value="pdf">
              <mat-icon>picture_as_pdf</mat-icon> PDF
            </mat-button-toggle>
            <mat-button-toggle value="docx">
              <mat-icon>description</mat-icon> DOCX
            </mat-button-toggle>
          </mat-button-toggle-group>
        </div>
      }

      <!-- Upload section -->
      @if (mode === 'upload') {
        <div class="section">
          <!-- URL fetch -->
          <div class="upload-section">
            <mat-form-field appearance="outline" class="url-field">
              <mat-label>{{ 'documents.url' | translate }}</mat-label>
              <input matInput [(ngModel)]="url" [placeholder]="'documents.urlPlaceholder' | translate" />
            </mat-form-field>
            <button mat-stroked-button color="primary" (click)="fetchFromUrl()" [disabled]="!url || fetching()">
              @if (fetching()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <ng-container><mat-icon>download</mat-icon> {{ 'documents.fetchUrl' | translate }}</ng-container>
              }
            </button>
          </div>

          <!-- File picker -->
          <div class="upload-section">
            <input type="file" accept=".pdf" #fileInput (change)="onFileSelected($event)" hidden />
            <button mat-stroked-button color="primary" (click)="fileInput.click()">
              <mat-icon>upload_file</mat-icon> {{ 'documents.chooseFile' | translate }}
            </button>
            @if (selectedFileName()) {
              <span class="file-name">{{ selectedFileName() }}</span>
            }
          </div>

          <!-- Drag and drop -->
          <div class="dropzone"
               [class.drag-over]="dragOver()"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)">
            <mat-icon class="dropzone-icon">cloud_upload</mat-icon>
            <p class="dropzone-text">{{ 'documents.dropzoneText' | translate }}</p>
            <p class="dropzone-hint">{{ 'documents.dropzoneHint' | translate }}</p>
          </div>
        </div>
      }

      @if (errorMessage()) {
        <p class="error-text">{{ errorMessage() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      @if (mode === 'generate') {
        <button mat-raised-button color="primary" (click)="generate()" [disabled]="!canGenerate() || saving()">
          @if (saving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container><mat-icon>auto_awesome</mat-icon> {{ 'documents.generate' | translate }}</ng-container>
          }
        </button>
      } @else {
        <button mat-raised-button color="primary" (click)="upload()" [disabled]="!canUpload() || saving()">
          @if (saving()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <ng-container><mat-icon>cloud_upload</mat-icon> {{ 'common.save' | translate }}</ng-container>
          }
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    .mode-toggle {
      display: flex;
      width: 100%;
      margin-bottom: 16px;
    }
    .mode-toggle mat-button-toggle {
      flex: 1;
    }
    .format-toggle {
      display: flex;
      width: 100%;
      margin-bottom: 8px;
    }
    .format-toggle mat-button-toggle {
      flex: 1;
    }
    .section {
      margin-top: 8px;
    }
    .upload-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .url-field { flex: 1; }
    .file-name {
      font-size: 13px;
      color: #555;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 200px;
    }
    .dropzone {
      border: 2px dashed #ccc;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
      margin-bottom: 8px;
    }
    .dropzone.drag-over {
      border-color: #1976d2;
      background-color: #e3f2fd;
    }
    .dropzone-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #aaa;
    }
    .dropzone-text {
      margin: 8px 0 4px;
      font-size: 14px;
      color: #555;
    }
    .dropzone-hint {
      margin: 0;
      font-size: 12px;
      color: #999;
    }
    .error-text {
      color: #c62828;
      font-size: 13px;
      margin-top: 8px;
    }
  `],
})
export class DocumentUploadDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<DocumentUploadDialogComponent>);
  private data: DocumentUploadDialogData = inject(MAT_DIALOG_DATA);
  private documentService = inject(DocumentService);
  private templateService = inject(TemplateService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  mode: 'generate' | 'upload' = 'generate';
  displayname = '';
  url = '';

  // Generate state
  templates = signal<DocumentTemplate[]>([]);
  selectedTemplateId = '';
  outputFormat: 'pdf' | 'docx' = 'pdf';

  // Upload state
  fileData = signal<number[] | null>(null);
  fileMimeType = signal('');
  selectedFileName = signal('');
  dragOver = signal(false);
  fetching = signal(false);

  // Shared state
  saving = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    this.templateService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (templates) => this.templates.set(templates),
    });
  }

  canGenerate(): boolean {
    return !!this.selectedTemplateId && !!this.outputFormat;
  }

  canUpload(): boolean {
    return !!this.fileData() && !!this.displayname;
  }

  generate() {
    if (!this.canGenerate()) return;

    this.saving.set(true);
    this.errorMessage.set('');

    this.documentService.generate(this.selectedTemplateId, this.data.bookingId, this.outputFormat).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('documents.generated'), this.translate.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('documents.generateError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  // Upload methods
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  fetchFromUrl() {
    if (!this.url) return;

    this.fetching.set(true);
    this.errorMessage.set('');

    this.http.get(this.url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const fileName = this.url.split('?')[0].split('/').pop() ?? 'document';
        const mimeType = this.resolveMimeType(blob.type, fileName);
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
          this.errorMessage.set(this.translate.instant('documents.invalidMimeType'));
          this.fetching.set(false);
          return;
        }
        if (!this.displayname) {
          this.displayname = fileName;
        }
        this.selectedFileName.set(fileName);
        this.fileMimeType.set(mimeType);
        this.blobToByteArray(blob);
        this.fetching.set(false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('documents.fetchError'));
        this.fetching.set(false);
      },
    });
  }

  upload() {
    if (!this.canUpload()) return;

    this.saving.set(true);
    this.documentService.create({
      bookingId: this.data.bookingId,
      displayname: this.displayname,
      mimeType: this.fileMimeType(),
      document: this.fileData()!,
    } as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('documents.saved'), this.translate.instant('common.close'), { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(this.translate.instant('documents.saveError'), this.translate.instant('common.close'), { duration: 5000 });
      },
    });
  }

  private processFile(file: File) {
    this.errorMessage.set('');

    const mimeType = this.resolveMimeType(file.type, file.name);
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      this.errorMessage.set(this.translate.instant('documents.invalidMimeType'));
      return;
    }

    if (!this.displayname) {
      this.displayname = file.name;
    }
    this.selectedFileName.set(file.name);
    this.fileMimeType.set(mimeType);
    this.blobToByteArray(file);
  }

  private resolveMimeType(detectedType: string, fileName: string): string {
    if (detectedType && detectedType !== 'application/octet-stream') {
      return detectedType;
    }
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSION_MIME_MAP[ext] ?? detectedType ?? 'application/octet-stream';
  }

  private blobToByteArray(blob: Blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const byteArray = Array.from(new Uint8Array(arrayBuffer));
      this.fileData.set(byteArray);
    };
    reader.readAsArrayBuffer(blob);
  }
}
