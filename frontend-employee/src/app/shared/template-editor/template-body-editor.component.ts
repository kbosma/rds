import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style';
import {
  TEMPLATE_IMAGE_DRAG_MIME,
  TEMPLATE_IMAGE_TYPES,
  TemplateImageService,
  templateImageAlt,
  templateImageErrorKey,
  templateImageProblemKey,
  isTemplateImageUrl,
  validateTemplateImage,
} from './template-image.service';
import { TemplateImageLibraryComponent } from './template-image-library.component';
import { TemplateImageItem } from '../models';
import { RepeatTableDefinition, TemplateVariableGroup } from './template-variables';

/** Custom drag-type zodat we onze variabele-drops onderscheiden van gewone tekst. */
const VAR_MIME = 'application/x-rds-var';

/*
 * Inline tabel-styling. Bewust inline (niet via component-CSS), zodat de opmaak
 * in de opgeslagen HTML zelf zit en dus óók zichtbaar is in de preview en in de
 * uiteindelijk verstuurde e-mail (mailclients kennen onze component-CSS niet).
 */
const TABLE_STYLE = 'border-collapse:collapse;width:100%;';
const TABLE_CELL_STYLE = 'border:1px solid #cccccc;padding:4px 8px;vertical-align:top;';
const TABLE_HEADER_STYLE = 'border:1px solid #cccccc;padding:4px 8px;background-color:#f0f0f0;font-weight:bold;text-align:left;';

/**
 * Tabel met twee extra attributen voor een herhaalde tabel: data-repeat (lijst, bv. booking.travelers) en
 * data-item (naam per element). Zonder deze attributen is het een gewone tabel; ze verdwijnen dan ook uit de HTML.
 */
const RepeatableTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      repeat: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-repeat'),
        renderHTML: (attributes: Record<string, unknown>) => (attributes['repeat'] ? { 'data-repeat': attributes['repeat'] } : {}),
      },
      item: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-item'),
        renderHTML: (attributes: Record<string, unknown>) => (attributes['item'] ? { 'data-item': attributes['item'] } : {}),
      },
    };
  },
});

/** Een afbeelding mag nooit breder zijn dan de mail; inline om dezelfde reden als hierboven. */
const IMAGE_STYLE = 'max-width:100%;height:auto;';

/**
 * WYSIWYG-editor (TipTap) voor de HTML van een template; dezelfde editor wordt gebruikt voor e-mailtemplates
 * en voor Word-templates (de backend maakt van die HTML een .docx). Links de editor met toolbar
 * (lettertype/-grootte, bold/italic/underline, lijsten, tabel, afbeelding), rechts de variabelen die via
 * drag-drop (of klik) op de juiste plek worden ingevoegd en de afbeeldingenbibliotheek. Werkt als
 * ControlValueAccessor; waarde = HTML.
 *
 * Welke variabelen en welke herhaalde tabellen er aangeboden worden bepaalt de gebruiker van de
 * component (zie template-variables.ts): een e-mail heeft andere velden dan een Word-template.
 *
 * Een herhaalde tabel is een gewone tabel met de attributen data-repeat (lijst) en data-item (naam
 * per element); de laatste rij wordt voor elk element herhaald (door de backend, bij e-mail en Word).
 *
 * Afbeeldingen worden geüpload (zie TemplateImageService) en als relatief publiek pad in de HTML
 * gezet; base64-afbeeldingen staan bewust uit (te zwaar en door veel mailclients geblokkeerd).
 */
@Component({
  selector: 'app-template-body-editor',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslatePipe,
    TemplateImageLibraryComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TemplateBodyEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="editor-wrapper">
      <div class="toolbar">
        <select class="tb-select" [value]="currentFont()" (change)="setFont($any($event.target).value)"
                [attr.aria-label]="'templateEditor.font' | translate">
          <option value="">{{ 'templateEditor.fontDefault' | translate }}</option>
          @for (f of fonts; track f.value) {
            <option [value]="f.value">{{ f.label }}</option>
          }
        </select>

        <select class="tb-select tb-size" [value]="currentSize()" (change)="setSize($any($event.target).value)"
                [attr.aria-label]="'templateEditor.size' | translate">
          <option value="">{{ 'templateEditor.sizeDefault' | translate }}</option>
          @for (s of sizes; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>

        <span class="tb-divider"></span>

        <button type="button" mat-icon-button [class.active]="isBold()" (click)="toggleBold()"
                [matTooltip]="'templateEditor.bold' | translate"><mat-icon>format_bold</mat-icon></button>
        <button type="button" mat-icon-button [class.active]="isItalic()" (click)="toggleItalic()"
                [matTooltip]="'templateEditor.italic' | translate"><mat-icon>format_italic</mat-icon></button>
        <button type="button" mat-icon-button [class.active]="isUnderline()" (click)="toggleUnderline()"
                [matTooltip]="'templateEditor.underline' | translate"><mat-icon>format_underlined</mat-icon></button>

        <span class="tb-divider"></span>

        <button type="button" mat-icon-button [class.active]="isBulletList()" (click)="toggleBullet()"
                [matTooltip]="'templateEditor.bullets' | translate"><mat-icon>format_list_bulleted</mat-icon></button>
        <button type="button" mat-icon-button [class.active]="isOrderedList()" (click)="toggleOrdered()"
                [matTooltip]="'templateEditor.numbered' | translate"><mat-icon>format_list_numbered</mat-icon></button>

        <span class="tb-divider"></span>

        <button type="button" mat-icon-button [matMenuTriggerFor]="tableMenu"
                [matTooltip]="'templateEditor.table' | translate"><mat-icon>table_chart</mat-icon></button>
        <mat-menu #tableMenu="matMenu">
          <button mat-menu-item (click)="insertTable()"><mat-icon>grid_on</mat-icon>{{ 'templateEditor.tableInsert' | translate }}</button>
          <button mat-menu-item (click)="addColumn()"><mat-icon>view_column</mat-icon>{{ 'templateEditor.tableAddCol' | translate }}</button>
          <button mat-menu-item (click)="addRow()"><mat-icon>table_rows</mat-icon>{{ 'templateEditor.tableAddRow' | translate }}</button>
          <button mat-menu-item (click)="deleteColumn()"><mat-icon>remove</mat-icon>{{ 'templateEditor.tableDelCol' | translate }}</button>
          <button mat-menu-item (click)="deleteRow()"><mat-icon>remove</mat-icon>{{ 'templateEditor.tableDelRow' | translate }}</button>
          <button mat-menu-item (click)="deleteTable()"><mat-icon>delete</mat-icon>{{ 'templateEditor.tableDelete' | translate }}</button>
          @if (repeatTables().length > 0) {
            <button mat-menu-item [matMenuTriggerFor]="repeatMenu"><mat-icon>repeat</mat-icon>{{ 'templateEditor.repeatTable' | translate }}</button>
          }
          @if (inRepeatTable()) {
            <button mat-menu-item (click)="turnOffRepeat()"><mat-icon>repeat_one</mat-icon>{{ 'templateEditor.repeatOff' | translate }}</button>
          }
        </mat-menu>
        <mat-menu #repeatMenu="matMenu">
          @for (definition of repeatTables(); track definition.list) {
            <button mat-menu-item (click)="insertRepeatTable(definition)">{{ definition.labelKey | translate }}</button>
          }
        </mat-menu>

        <span class="tb-divider"></span>

        <input #imageInput type="file" hidden [accept]="imageAccept" (change)="onImageSelected($event)" />
        <button type="button" mat-icon-button [disabled]="uploading()" (click)="imageInput.click()"
                [matTooltip]="'templateEditor.image' | translate"><mat-icon>image</mat-icon></button>
        @if (uploading()) {
          <mat-spinner diameter="18"></mat-spinner>
        }
      </div>

      <div class="editor-body">
        <div #editorHost class="editor-host" (blur)="onBlur()"></div>

        <div class="var-panel">
          <div class="panel-tabs">
            <button type="button" class="panel-tab" [class.active]="panelTab() === 'variables'"
                    (click)="panelTab.set('variables')">{{ 'templateEditor.tabVariables' | translate }}</button>
            <button type="button" class="panel-tab" [class.active]="panelTab() === 'images'"
                    (click)="panelTab.set('images')">{{ 'templateEditor.tabImages' | translate }}</button>
          </div>

          @if (panelTab() === 'variables') {
            <div class="var-hint">{{ 'templateEditor.variablesHint' | translate }}</div>
            @for (group of variableGroups(); track group.labelKey) {
              <div class="var-group">{{ group.labelKey | translate }}</div>
              @if (group.hintKey) {
                <div class="var-hint">{{ group.hintKey | translate }}</div>
              }
              @for (v of group.variables; track v.token) {
                <div class="var-item" draggable="true"
                     (dragstart)="onVarDragStart($event, v.token)"
                     (click)="insertVariable(v.token)"
                     [matTooltip]="v.token">
                  <mat-icon>drag_indicator</mat-icon>
                  <span>{{ v.labelKey | translate }}</span>
                </div>
              }
            }
          } @else {
            <app-template-image-library [activeUrls]="usedImageUrls()"
                                     (imageChosen)="onLibraryImageChosen($event)"></app-template-image-library>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .editor-wrapper { border: 1px solid #bdbdbd; border-radius: 6px; overflow: hidden; }
    .toolbar {
      display: flex; align-items: center; flex-wrap: wrap; gap: 2px;
      padding: 4px 6px; border-bottom: 1px solid #e0e0e0; background: #fafafa;
    }
    .tb-select {
      height: 32px; border: 1px solid #ccc; border-radius: 4px; background: white;
      font-size: 13px; padding: 0 4px; max-width: 150px;
    }
    .tb-size { max-width: 90px; }
    .tb-divider { width: 1px; height: 24px; background: #e0e0e0; margin: 0 4px; }
    .active { background: color-mix(in srgb, var(--theme-primary, #1976d2) 16%, white); border-radius: 4px; }
    .editor-body { display: flex; align-items: stretch; }
    .editor-host { flex: 1; min-height: 240px; max-height: 460px; overflow: auto; padding: 12px 16px; }
    .var-panel {
      width: 228px; flex-shrink: 0; border-left: 1px solid #e0e0e0; background: #fafafa;
      padding: 8px; overflow: auto; max-height: 460px;
    }
    .panel-tabs { display: flex; gap: 2px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
    .panel-tab {
      flex: 1; border: 0; background: none; padding: 6px 4px; font-size: 12px; font-weight: 600;
      text-transform: uppercase; color: #777; cursor: pointer; border-bottom: 2px solid transparent;
    }
    .panel-tab.active { color: var(--theme-primary, #1976d2); border-bottom-color: var(--theme-primary, #1976d2); }
    .var-hint { font-size: 11px; color: #999; margin-bottom: 8px; }
    .var-group { font-size: 12px; font-weight: 700; color: #555; margin: 10px 0 4px; }
    .var-group:first-of-type { margin-top: 0; }
    .var-item {
      display: flex; align-items: center; gap: 4px; padding: 5px 6px; margin-bottom: 4px;
      background: white; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 13px;
      cursor: grab; user-select: none;
    }
    .var-item:hover { border-color: var(--theme-primary, #1976d2); background: color-mix(in srgb, var(--theme-primary, #1976d2) 8%, white); }
    .var-item:active { cursor: grabbing; }
    .var-item mat-icon { font-size: 16px; width: 16px; height: 16px; color: #aaa; }
    /* ProseMirror edit-area + tabellen */
    ::ng-deep .editor-host .ProseMirror { outline: none; min-height: 220px; font-size: 14px; line-height: 1.5; }
    ::ng-deep .editor-host .ProseMirror:focus { outline: none; }
    ::ng-deep .editor-host .ProseMirror p { margin: 0 0 8px; }
    ::ng-deep .editor-host .ProseMirror table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    ::ng-deep .editor-host .ProseMirror td, ::ng-deep .editor-host .ProseMirror th {
      border: 1px solid #ccc; padding: 4px 8px; min-width: 40px; vertical-align: top;
    }
    ::ng-deep .editor-host .ProseMirror th { background: #f0f0f0; font-weight: 600; }
    /* Herhaalde tabel: gestippelde rand, en de rij die herhaald wordt (de laatste) gekleurd. */
    ::ng-deep .editor-host .ProseMirror table[data-repeat] { outline: 2px dashed var(--theme-primary, #1976d2); outline-offset: 2px; }
    ::ng-deep .editor-host .ProseMirror table[data-repeat] tr:last-child td {
      background: color-mix(in srgb, var(--theme-primary, #1976d2) 8%, white);
    }
    ::ng-deep .editor-host .ProseMirror ul, ::ng-deep .editor-host .ProseMirror ol { padding-left: 22px; margin: 0 0 8px; }
    ::ng-deep .editor-host .ProseMirror img { max-width: 100%; height: auto; }
    /* Afbeelding: de resize-extensie zet de afbeelding in een container met een handle; die handle is standaard onzichtbaar. */
    ::ng-deep .editor-host .ProseMirror [data-resize-container] { line-height: 0; }
    ::ng-deep .editor-host .ProseMirror [data-resize-wrapper] { max-width: 100%; }
    ::ng-deep .editor-host .ProseMirror [data-resize-container].ProseMirror-selectednode [data-resize-wrapper] {
      outline: 2px solid var(--theme-primary, #1976d2);
    }
    ::ng-deep .editor-host .ProseMirror [data-resize-handle] {
      display: none; width: 12px; height: 12px; box-sizing: border-box; z-index: 1;
      background: var(--theme-primary, #1976d2); border: 2px solid #fff; border-radius: 2px;
      cursor: nwse-resize; transform: translate(50%, 50%);
    }
    ::ng-deep .editor-host .ProseMirror [data-resize-container].ProseMirror-selectednode [data-resize-handle] { display: block; }
  `],
})
export class TemplateBodyEditorComponent implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('editorHost') editorHost!: ElementRef<HTMLDivElement>;
  @ViewChild(TemplateImageLibraryComponent) library?: TemplateImageLibraryComponent;

  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private imageService = inject(TemplateImageService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  private editor?: Editor;
  private pendingContent = '';
  private disabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  isBold = signal(false);
  isItalic = signal(false);
  isUnderline = signal(false);
  isBulletList = signal(false);
  isOrderedList = signal(false);
  currentFont = signal('');
  currentSize = signal('');
  uploading = signal(false);
  panelTab = signal<'variables' | 'images'>('variables');
  /** Afbeelding-URL's die nu in de (mogelijk nog niet opgeslagen) tekst staan. */
  usedImageUrls = signal<string[]>([]);

  /** De variabelen die in het paneel getoond worden (bepaald door de gebruiker van de editor). */
  readonly variableGroups = input<TemplateVariableGroup[]>([]);
  /** De lijsten waarvoor een herhaalde tabel ingevoegd kan worden; leeg = geen herhaalde tabellen. */
  readonly repeatTables = input<RepeatTableDefinition[]>([]);

  /** True als de cursor in een herhaalde tabel staat (dan kan de herhaling uitgezet worden). */
  inRepeatTable = signal(false);

  readonly imageAccept = TEMPLATE_IMAGE_TYPES.join(',');

  readonly fonts = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  ];
  readonly sizes = ['12px', '14px', '16px', '18px', '24px', '32px'];

  ngAfterViewInit() {
    this.editor = new Editor({
      element: this.editorHost.nativeElement,
      extensions: [
        StarterKit,
        TextStyle,
        FontFamily,
        FontSize,
        RepeatableTable.configure({ resizable: true, HTMLAttributes: { style: TABLE_STYLE } }),
        TableRow,
        TableHeader.configure({ HTMLAttributes: { style: TABLE_HEADER_STYLE } }),
        TableCell.configure({ HTMLAttributes: { style: TABLE_CELL_STYLE } }),
        // base64 uit: een afbeelding hoort geüpload te worden (zie insertUploadedImage).
        Image.configure({
          allowBase64: false,
          HTMLAttributes: { style: IMAGE_STYLE },
          resize: { enabled: true, directions: ['bottom-right'], minWidth: 40, minHeight: 40, alwaysPreserveAspectRatio: true },
        }),
      ],
      content: this.pendingContent,
      editable: !this.disabled,
      editorProps: {
        handleDrop: (view, event) => {
          const dragEvent = event as DragEvent;
          const pos = view.posAtCoords({ left: dragEvent.clientX, top: dragEvent.clientY })?.pos;

          // Een afbeelding uit de bibliotheek. De payload komt van buiten (een sleepactie kan van
          // elke pagina komen), dus alleen een publiek afbeeldingspad van ons wordt geaccepteerd.
          const libraryImage = dragEvent.dataTransfer?.getData(TEMPLATE_IMAGE_DRAG_MIME);
          if (libraryImage) {
            const { url, alt } = this.parseLibraryDrag(libraryImage);
            if (url) this.insertImage(url, alt, pos);
            return true; // nooit de standaard-afhandeling (die zou de HTML van de <img> overnemen)
          }

          // Een afbeeldingsbestand dat in de editor wordt gesleept: uploaden i.p.v. de
          // browser het bestand te laten openen.
          const images = this.imageFiles(dragEvent.dataTransfer?.files);
          if (images.length > 0) {
            images.forEach(file => this.uploadAndInsert(file, pos));
            return true;
          }

          const token = dragEvent.dataTransfer?.getData(VAR_MIME);
          if (!token) return false; // gewone drops laten we TipTap zelf afhandelen
          if (pos == null) return false;
          view.dispatch(view.state.tr.insertText(token, pos));
          return true;
        },
        handlePaste: (_view, event) => {
          // Alleen een los afbeeldingsbestand (bv. schermafbeelding). Gekopieerde HTML met
          // een <img> laten we de standaard-afhandeling doen.
          const clipboard = (event as ClipboardEvent).clipboardData;
          if (!clipboard || clipboard.types.includes('text/html')) return false;
          const images = this.imageFiles(clipboard.files);
          if (images.length === 0) return false;
          images.forEach(file => this.uploadAndInsert(file));
          return true;
        },
      },
      onUpdate: ({ editor }) => this.zone.run(() => {
        this.onChange(editor.getHTML());
        this.syncToolbar();
        this.syncUsedImages();
      }),
      onSelectionUpdate: () => this.zone.run(() => this.syncToolbar()),
      onCreate: () => this.zone.run(() => {
        this.syncToolbar();
        this.syncUsedImages();
      }),
    });
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }

  // --- ControlValueAccessor ---
  writeValue(value: string): void {
    this.pendingContent = value ?? '';
    this.editor?.commands.setContent(this.pendingContent, { emitUpdate: false });
    this.syncUsedImages();
  }
  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.editor?.setEditable(!isDisabled);
  }

  onBlur() { this.onTouched(); }

  // --- Toolbar-acties ---
  toggleBold() { this.editor?.chain().focus().toggleBold().run(); }
  toggleItalic() { this.editor?.chain().focus().toggleItalic().run(); }
  toggleUnderline() { this.editor?.chain().focus().toggleUnderline().run(); }
  toggleBullet() { this.editor?.chain().focus().toggleBulletList().run(); }
  toggleOrdered() { this.editor?.chain().focus().toggleOrderedList().run(); }

  setFont(value: string) {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    (value ? chain.setFontFamily(value) : chain.unsetFontFamily()).run();
  }

  setSize(value: string) {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    (value ? chain.setFontSize(value) : chain.unsetFontSize()).run();
  }

  insertTable() { this.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }
  addRow() { this.editor?.chain().focus().addRowAfter().run(); }
  addColumn() { this.editor?.chain().focus().addColumnAfter().run(); }
  deleteRow() { this.editor?.chain().focus().deleteRow().run(); }
  deleteColumn() { this.editor?.chain().focus().deleteColumn().run(); }
  deleteTable() { this.editor?.chain().focus().deleteTable().run(); }

  insertVariable(token: string) { this.editor?.chain().focus().insertContent(token).run(); }

  /**
   * Voegt een herhaalde tabel in: een kopregel en één rij met de velden, die voor elk element van de lijst
   * herhaald wordt. De kopteksten volgen de taal van de gebruiker op het moment van invoegen.
   */
  insertRepeatTable(definition: RepeatTableDefinition) {
    if (!this.editor) return;
    const header = definition.columns.map(c => `<th>${this.escapeHtml(this.translate.instant(c.labelKey))}</th>`).join('');
    const row = definition.columns.map(c => `<td>${this.escapeHtml(c.token)}</td>`).join('');
    const html = `<table data-repeat="${definition.list}" data-item="${definition.item}"><tbody><tr>${header}</tr><tr>${row}</tr></tbody></table>`;
    this.editor.chain().focus().insertContent(html).run();
  }

  /** Maakt van de tabel waar de cursor in staat weer een gewone tabel. */
  turnOffRepeat() {
    this.editor?.chain().focus().updateAttributes('table', { repeat: null, item: null }).run();
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Afbeeldingen ---
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // zodat hetzelfde bestand opnieuw gekozen kan worden
    if (file) this.uploadAndInsert(file);
  }

  /** Alleen de afbeeldingsbestanden uit een drop/paste. */
  private imageFiles(files: FileList | null | undefined): File[] {
    return Array.from(files ?? []).filter(f => f.type.startsWith('image/'));
  }

  /** Uploadt de afbeelding en voegt hem (na succes) in, op `pos` of op de cursor. */
  private uploadAndInsert(file: File, pos?: number) {
    const problem = validateTemplateImage(file);
    if (problem) {
      this.notify(templateImageProblemKey(problem));
      return;
    }

    this.uploading.set(true);
    this.imageService.upload(file).subscribe({
      next: (image) => {
        this.uploading.set(false);
        this.insertImage(image.url, templateImageAlt(image.originalFilename), pos);
        this.library?.reload(); // de nieuwe afbeelding hoort ook in de bibliotheek te staan
      },
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        this.notify(templateImageErrorKey(err));
      },
    });
  }

  /** Een afbeelding uit de bibliotheek is aangeklikt: invoegen op de cursor. */
  onLibraryImageChosen(image: TemplateImageItem) {
    this.insertImage(image.url, templateImageAlt(image.originalFilename));
  }

  /** Voegt een (reeds geüploade) afbeelding in, op `pos` of op de cursor. */
  private insertImage(url: string, alt: string, pos?: number) {
    if (!this.editor || !isTemplateImageUrl(url)) return;
    const content = { type: 'image', attrs: { src: url, alt } };
    const chain = this.editor.chain().focus();
    if (pos == null) {
      chain.insertContent(content).run();
    } else {
      // De positie kan intussen buiten het document vallen (er is ondertussen getypt/gewist).
      chain.insertContentAt(Math.min(pos, this.editor.state.doc.content.size), content).run();
    }
  }

  /** Leest de gesleepte bibliotheek-payload; onbruikbaar of vreemd -> geen url. */
  private parseLibraryDrag(raw: string): { url: string | null; alt: string } {
    try {
      const data = JSON.parse(raw) as { url?: unknown; alt?: unknown };
      return {
        url: isTemplateImageUrl(data.url) ? data.url : null,
        alt: typeof data.alt === 'string' ? data.alt : '',
      };
    } catch {
      return { url: null, alt: '' };
    }
  }

  /** Welke afbeeldingen staan nu in de tekst? De bibliotheek kan die niet verwijderen. */
  private syncUsedImages() {
    const html = this.editor?.getHTML() ?? this.pendingContent;
    const urls = Array.from(html.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/gi), m => m[1]);
    this.usedImageUrls.set(Array.from(new Set(urls)));
  }

  private notify(messageKey: string) {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), { duration: 5000 });
  }

  onVarDragStart(event: DragEvent, token: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData(VAR_MIME, token);
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  private syncToolbar() {
    const e = this.editor;
    if (!e) return;
    this.isBold.set(e.isActive('bold'));
    this.isItalic.set(e.isActive('italic'));
    this.isUnderline.set(e.isActive('underline'));
    this.isBulletList.set(e.isActive('bulletList'));
    this.isOrderedList.set(e.isActive('orderedList'));
    this.inRepeatTable.set(e.isActive('table') && !!e.getAttributes('table')['repeat']);
    const attrs = e.getAttributes('textStyle');
    this.currentFont.set(attrs['fontFamily'] ?? '');
    this.currentSize.set(attrs['fontSize'] ?? '');
    this.cdr.markForCheck();
  }
}
