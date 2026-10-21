import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TEMPLATE_IMAGE_DRAG_MIME,
  TEMPLATE_IMAGE_TYPES,
  TemplateImageService,
  templateImageAlt,
  templateImageErrorKey,
  templateImageProblemKey,
  validateTemplateImage,
} from './template-image.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../services/confirm.service';
import { TemplateImageItem } from '../models';

/**
 * Bibliotheek van de geüploade afbeeldingen van de eigen organisatie, naast de editor:
 * uploaden, bekijken, een afbeelding de tekst in slepen (of aanklikken) en verwijderen.
 *
 * Verwijderen kan alleen als geen template de afbeelding gebruikt (de server controleert dat)
 * én hij niet in de nog niet opgeslagen tekst staat (`activeUrls`; de server ziet die niet).
 * Verstuurde mails kunnen we niet controleren: daarvoor waarschuwt de bevestiging.
 */
@Component({
  selector: 'app-template-image-library',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslatePipe,
  ],
  template: `
    <div class="lib-head">
      <div class="lib-hint">{{ 'templateEditor.images.hint' | translate }}</div>
      <input #fileInput type="file" hidden [accept]="imageAccept" (change)="onFileSelected($event)" />
      <button type="button" mat-stroked-button class="upload-btn" [disabled]="uploading()" (click)="fileInput.click()">
        <mat-icon>upload</mat-icon> {{ 'templateEditor.images.upload' | translate }}
      </button>
      @if (uploading()) {
        <mat-spinner diameter="16"></mat-spinner>
      }
    </div>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="24"></mat-spinner></div>
    } @else if (loadFailed()) {
      <div class="empty">
        {{ 'templateEditor.images.loadError' | translate }}
        <button type="button" mat-button (click)="reload()">{{ 'templateEditor.images.retry' | translate }}</button>
      </div>
    } @else if (images().length === 0) {
      <div class="empty">{{ 'templateEditor.images.empty' | translate }}</div>
    } @else {
      <div class="grid">
        @for (image of images(); track image.emailImageId) {
          <div class="tile" draggable="true"
               [matTooltip]="tooltip(image)"
               (dragstart)="onDragStart($event, image)"
               (click)="imageChosen.emit(image)">
            <img [src]="image.url" [alt]="displayName(image)" draggable="false" loading="lazy" />
            <span class="name">{{ displayName(image) }}</span>
            @if (canDelete) {
              <button type="button" mat-icon-button class="del act-delete" [disabled]="isLocked(image)"
                      [attr.aria-label]="'common.delete' | translate"
                      (click)="$event.stopPropagation(); remove(image)">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .lib-head { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
    .lib-hint { flex-basis: 100%; font-size: 11px; color: #999; }
    .upload-btn { height: 30px; font-size: 12px; }
    .center { display: flex; justify-content: center; padding: 16px 0; }
    .empty { font-size: 12px; color: #888; padding: 8px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .tile {
      position: relative; display: flex; flex-direction: column; background: white;
      border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; cursor: grab; user-select: none;
    }
    .tile:hover { border-color: var(--theme-primary, #1976d2); }
    .tile:active { cursor: grabbing; }
    .tile img { width: 100%; height: 64px; object-fit: cover; background: #f5f5f5; display: block; }
    .name { font-size: 11px; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .del {
      position: absolute; top: 0; right: 0; width: 28px; height: 28px; padding: 2px;
      background: rgba(255,255,255,0.85); border-radius: 0 0 0 4px;
    }
    .del mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class TemplateImageLibraryComponent implements OnInit {
  /** URL's van afbeeldingen die in de (nog niet opgeslagen) editor-tekst staan. */
  activeUrls = input<string[]>([]);
  /** Een afbeelding is aangeklikt: de editor voegt hem in op de cursor. */
  imageChosen = output<TemplateImageItem>();

  private imageService = inject(TemplateImageService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private confirmService = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);

  readonly imageAccept = TEMPLATE_IMAGE_TYPES.join(',');
  readonly canDelete = this.authService.hasAuthority('TEMPLATE_DELETE');

  images = signal<TemplateImageItem[]>([]);
  loading = signal(true);
  loadFailed = signal(false);
  uploading = signal(false);

  ngOnInit() {
    this.reload();
  }

  /** Haalt de lijst opnieuw op (ook door de editor aangeroepen na een upload via de toolbar). */
  reload() {
    this.loadFailed.set(false);
    this.imageService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (images) => {
        this.images.set(images);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      },
    });
  }

  displayName(image: TemplateImageItem): string {
    return image.originalFilename || this.translate.instant('templateEditor.images.unnamed');
  }

  isLocked(image: TemplateImageItem): boolean {
    return image.inUse || this.activeUrls().includes(image.url);
  }

  tooltip(image: TemplateImageItem): string {
    const size = `${this.displayName(image)} (${Math.max(1, Math.round(image.sizeBytes / 1024))} KB)`;
    if (image.inUse) return `${size} - ${this.translate.instant('templateEditor.images.lockedInUse')}`;
    if (this.activeUrls().includes(image.url)) return `${size} - ${this.translate.instant('templateEditor.images.lockedInEditor')}`;
    return size;
  }

  onDragStart(event: DragEvent, image: TemplateImageItem) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData(TEMPLATE_IMAGE_DRAG_MIME,
      JSON.stringify({ url: image.url, alt: templateImageAlt(image.originalFilename) }));
    event.dataTransfer.effectAllowed = 'copy';
  }

  // --- uploaden (naar de bibliotheek; invoegen gebeurt pas bij slepen of aanklikken) ---
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // zodat hetzelfde bestand opnieuw gekozen kan worden
    if (file) this.upload(file);
  }

  private upload(file: File) {
    const problem = validateTemplateImage(file);
    if (problem) {
      this.notify(templateImageProblemKey(problem));
      return;
    }
    this.uploading.set(true);
    this.imageService.upload(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notify('templateEditor.images.uploaded');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        this.notify(templateImageErrorKey(err));
      },
    });
  }

  // --- verwijderen ---
  async remove(image: TemplateImageItem) {
    if (this.isLocked(image)) return;
    const confirmed = await this.confirmService.confirmDelete(
      this.translate.instant('templateEditor.images.deleteConfirm', { name: this.displayName(image) }));
    if (!confirmed) return;

    this.imageService.delete(image.emailImageId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.removeFromList(image);
        this.notify('templateEditor.images.deleted');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          // Een template gebruikt hem (de lijst was verouderd): markeer hem als in gebruik.
          this.images.update(list => list.map(i => i.emailImageId === image.emailImageId ? { ...i, inUse: true } : i));
          this.notify('templateEditor.images.inUseError');
        } else if (err.status === 404) {
          this.removeFromList(image); // al weg (bv. door een ander)
        } else {
          this.notify('templateEditor.images.deleteError');
        }
      },
    });
  }

  private removeFromList(image: TemplateImageItem) {
    this.images.update(list => list.filter(i => i.emailImageId !== image.emailImageId));
  }

  private notify(messageKey: string) {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), { duration: 5000 });
  }
}
