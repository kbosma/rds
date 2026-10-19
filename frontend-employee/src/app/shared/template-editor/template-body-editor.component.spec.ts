import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { TemplateBodyEditorComponent } from './template-body-editor.component';
import {
  BOOKING_REPEAT_TABLES,
  DOCUMENT_VARIABLE_GROUPS,
  EMAIL_VARIABLE_GROUPS,
  REPEAT_TRAVELERS,
} from './template-variables';
import { Editor } from '@tiptap/core';
import { TemplateImageService, TEMPLATE_IMAGE_MAX_BYTES } from './template-image.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../services/confirm.service';
import { TemplateImage, TemplateImageItem } from '../models';

/*
 * TemplateBodyEditorComponent is de TipTap WYSIWYG met een drag-drop variabelenlijst
 * en afbeelding-upload. De editor zelf (TipTap/ProseMirror) laten we met rust; we
 * borgen de onderdelen die logica/afspraken bevatten: de exacte variabele-tokens,
 * het drag-datatype en het uploadgedrag (validatie, invoegen, foutmeldingen).
 */
describe('TemplateBodyEditorComponent', () => {
  let component: TemplateBodyEditorComponent;
  let fixture: ComponentFixture<TemplateBodyEditorComponent>;
  let imageServiceSpy: jasmine.SpyObj<TemplateImageService>;
  let snackBarOpenSpy: jasmine.Spy;
  let changeSpy: jasmine.Spy;

  const uploaded: TemplateImage = {
    emailImageId: 'img-1', url: '/api/public/email-images/aaaaaaaa-1111-2222-3333-444444444444',
    originalFilename: 'mijn-logo.png', contentType: 'image/png', sizeBytes: 10,
  };

  const png = () => new File([new Uint8Array(10)], 'mijn-logo.png', { type: 'image/png' });

  /** Simuleert de keuze van een bestand via de verborgen file-input. */
  function select(file: File) {
    const target = { files: [file], value: 'C:\\fakepath\\x' };
    component.onImageSelected({ target } as unknown as Event);
    return target;
  }

  beforeEach(async () => {
    imageServiceSpy = jasmine.createSpyObj('TemplateImageService', ['upload', 'list']);
    imageServiceSpy.list.and.returnValue(of([]));
    // De bibliotheek-component (tab 'Afbeeldingen') injecteert deze twee.
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    const confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [TemplateBodyEditorComponent, NoopAnimationsModule],
      providers: [
        { provide: TemplateImageService, useValue: imageServiceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplateBodyEditorComponent);
    component = fixture.componentInstance;
    // MatSnackBar komt uit de module-providers van de component zelf; spioneer op die instance.
    snackBarOpenSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    changeSpy = jasmine.createSpy('onChange');
    component.registerOnChange(changeSpy);
    fixture.detectChanges(); // triggert ngAfterViewInit → TipTap-editor
  });

  it('should create and initialise the editor', () => {
    expect(component).toBeTruthy();
  });

  describe('variabelen', () => {
    const tokens = () => component.variableGroups().flatMap(g => g.variables.map(v => v.token));

    it('toont niets zolang de gebruiker van de editor geen variabelen opgeeft', () => {
      expect(component.variableGroups()).toEqual([]);
      expect(fixture.nativeElement.querySelectorAll('.var-item').length).toBe(0);
    });

    it('e-mail: de ontvanger (prospect.*) met de exacte velden, incl. fullName-casing', () => {
      fixture.componentRef.setInput('variableGroups', EMAIL_VARIABLE_GROUPS);
      expect(tokens()).toContain('${prospect.firstname}');
      expect(tokens()).toContain('${prospect.fullName}'); // camelCase, niet 'fullname'
      expect(tokens()).toContain('${prospect.emailaddress}');
      expect(tokens().some(t => t.includes('fullname'))).toBe(false);
    });

    it('e-mail: ook de boeking, met de uitleg dat die alleen bij een boeking werken', () => {
      fixture.componentRef.setInput('variableGroups', EMAIL_VARIABLE_GROUPS);
      expect(tokens()).toContain('${booking.bookingNumber}');
      const booking = component.variableGroups().find(g => g.labelKey === 'templateEditor.groups.booking');
      expect(booking?.hintKey).toBe('templateEditor.groups.bookingOnlyHint');
    });

    it('Word-template: de boeking en de hoofdboeker, en geen prospect.* (daar bestaat die niet)', () => {
      fixture.componentRef.setInput('variableGroups', DOCUMENT_VARIABLE_GROUPS);
      expect(tokens()).toContain('${booking.bookingNumber}');
      expect(tokens()).toContain('${booking.booker.fullName}');
      expect(tokens().some(t => t.startsWith('${prospect.'))).toBe(false);
    });

    it('bedragen krijgen twee decimalen en dubbele aanhalingstekens (een enkele geeft een syntaxfout in Word)', () => {
      fixture.componentRef.setInput('variableGroups', DOCUMENT_VARIABLE_GROUPS);
      expect(tokens()).toContain('${booking.totalSum?string("#,##0.00")}');
      expect(tokens().some(t => t.includes("'"))).toBe(false);
    });

    it('toont per groep een kop en de variabelen', () => {
      fixture.componentRef.setInput('variableGroups', DOCUMENT_VARIABLE_GROUPS);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.var-group').length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('.var-item').length).toBe(tokens().length);
    });

    it('klikken op een variabele voegt het token in op de cursor', () => {
      component.insertVariable('${booking.bookingNumber}');
      expect(changeSpy.calls.mostRecent().args[0]).toContain('${booking.bookingNumber}');
    });
  });

  describe('herhaalde tabellen', () => {
    const lastHtml = () => changeSpy.calls.mostRecent().args[0] as string;

    it('de lijsten en velden bestaan in het model van de backend (geen verzonnen velden)', () => {
      const lists = BOOKING_REPEAT_TABLES.map(d => d.list);
      expect(lists).toEqual(['booking.travelers', 'booking.bookingLines', 'booking.bookingActivities']);
      const tokens = BOOKING_REPEAT_TABLES.flatMap(d => d.columns.map(c => c.token));
      expect(tokens).toContain('${t.firstname}');
      expect(tokens).toContain('${l.accommodation.name}');
      expect(tokens).toContain('${a.activityName}');
      // elke kolom gebruikt het itemnaam van zijn eigen definitie
      BOOKING_REPEAT_TABLES.forEach(d =>
        d.columns.forEach(c => expect(c.token.startsWith('${' + d.item + '.')).toBe(true)));
    });

    it('voegt een tabel in met data-repeat/data-item, een kopregel en één rij met de velden', () => {
      component.insertRepeatTable(REPEAT_TRAVELERS);

      const html = lastHtml();
      expect(html).toContain('data-repeat="booking.travelers"');
      expect(html).toContain('data-item="t"');
      expect(html).toContain('${t.firstname}');
      expect(html).toContain('${t.lastname}');
      expect((html.match(/<tr/g) ?? []).length).toBe(2);
      expect(html).toContain('<th');
    });

    it('de kolomkoppen zijn de vertaalde labels', () => {
      component.insertRepeatTable(REPEAT_TRAVELERS);

      // De test-setup laadt de echte vertalingen (nl).
      expect(lastHtml()).toContain('<p>Voornaam</p>');
      expect(lastHtml()).toContain('<p>Achternaam</p>');
    });

    it('een bedrag in een kolom blijft correct (aanhalingstekens niet ge-escaped in de opgeslagen HTML)', () => {
      component.insertRepeatTable(BOOKING_REPEAT_TABLES[1]);

      expect(lastHtml()).toContain('${l.price?string("#,##0.00")}');
    });

    it('een opgeslagen herhaalde tabel komt ongewijzigd terug uit de editor (attributen blijven)', () => {
      const html = '<table data-repeat="booking.travelers" data-item="t"><tbody>'
        + '<tr><th><p>Naam</p></th></tr><tr><td><p>${t.firstname}</p></td></tr></tbody></table>';

      component.writeValue(html);
      component.insertVariable('x'); // forceert een onChange met de actuele HTML

      expect(lastHtml()).toContain('data-repeat="booking.travelers"');
      expect(lastHtml()).toContain('data-item="t"');
    });

    it('een gewone tabel krijgt geen data-repeat', () => {
      component.writeValue('<table><tbody><tr><td><p>x</p></td></tr></tbody></table>');
      component.insertVariable('x');

      expect(lastHtml()).not.toContain('data-repeat');
      expect(lastHtml()).not.toContain('data-item');
    });

    it('de herhaling kan uitgezet worden: het blijft dan een gewone tabel', () => {
      component.insertRepeatTable(REPEAT_TRAVELERS);
      expect(lastHtml()).toContain('data-repeat');

      component.turnOffRepeat();

      expect(lastHtml()).not.toContain('data-repeat');
      expect(lastHtml()).not.toContain('data-item');
      expect(lastHtml()).toContain('<table');
    });

    it('weet of de cursor in een herhaalde tabel staat', () => {
      expect(component.inRepeatTable()).toBe(false);

      component.insertRepeatTable(REPEAT_TRAVELERS);

      expect(component.inRepeatTable()).toBe(true);
    });

    it('het tabelmenu biedt herhaalde tabellen alleen aan als de gebruiker ze opgeeft', () => {
      expect(component.repeatTables()).toEqual([]);

      fixture.componentRef.setInput('repeatTables', BOOKING_REPEAT_TABLES);

      expect(component.repeatTables().length).toBe(3);
    });
  });

  it('onVarDragStart zet het custom drag-datatype met het token', () => {
    const setData = jasmine.createSpy('setData');
    const dataTransfer = { setData, effectAllowed: '' } as unknown as DataTransfer;
    const event = { dataTransfer } as unknown as DragEvent;

    component.onVarDragStart(event, '${prospect.fullName}');

    expect(setData).toHaveBeenCalledWith('application/x-rds-var', '${prospect.fullName}');
    expect(dataTransfer.effectAllowed).toBe('copy');
  });

  it('writeValue should not throw and accepts HTML', () => {
    expect(() => component.writeValue('<p>Hallo ${prospect.firstname}</p>')).not.toThrow();
  });

  describe('afbeeldingen', () => {
    it('uploads the chosen file and inserts it as a relative public URL with inline sizing', () => {
      imageServiceSpy.upload.and.returnValue(of(uploaded));

      select(png());

      expect(imageServiceSpy.upload).toHaveBeenCalledTimes(1);
      const html = changeSpy.calls.mostRecent().args[0] as string;
      expect(html).toContain('src="/api/public/email-images/aaaaaaaa-1111-2222-3333-444444444444"');
      // inline (niet via component-CSS), zodat het ook in de verstuurde mail werkt
      expect(html).toMatch(/style="[^"]*max-width:\s*100%/);
      // bestandsnaam zonder extensie als alt-tekst
      expect(html).toContain('alt="mijn-logo"');
      expect(component.uploading()).toBe(false);
    });

    it('resets the file input so the same file can be chosen again', () => {
      imageServiceSpy.upload.and.returnValue(of(uploaded));

      const target = select(png());

      expect(target.value).toBe('');
    });

    it('does nothing when no file was chosen', () => {
      component.onImageSelected({ target: { files: [], value: '' } } as unknown as Event);

      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
      expect(snackBarOpenSpy).not.toHaveBeenCalled();
    });

    it('rejects an unsupported type (e.g. SVG) without uploading', () => {
      select(new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }));

      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
      expect(snackBarOpenSpy).toHaveBeenCalled();
      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toContain('PNG');
    });

    it('rejects a file over the size limit without uploading', () => {
      select(new File([new Uint8Array(TEMPLATE_IMAGE_MAX_BYTES + 1)], 'groot.png', { type: 'image/png' }));

      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toContain('2 MB');
    });

    it('shows a translated message (not the server text) when the server says 413', () => {
      imageServiceSpy.upload.and.returnValue(throwError(() =>
        new HttpErrorResponse({ status: 413, error: { message: 'The uploaded file is too large.' } })));

      select(png());

      const message = snackBarOpenSpy.calls.mostRecent().args[0] as string;
      expect(message).toContain('2 MB');
      expect(message).not.toContain('The uploaded file');
      expect(component.uploading()).toBe(false);
    });

    it('shows the invalid-image message when the server says 400', () => {
      imageServiceSpy.upload.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));

      select(png());

      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toContain('PNG');
    });

    it('shows a generic upload error for other failures and inserts nothing', () => {
      imageServiceSpy.upload.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      select(png());

      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toContain('mislukt');
      expect(changeSpy).not.toHaveBeenCalled();
      expect(component.uploading()).toBe(false);
    });
  });

  describe('bibliotheek in de editor', () => {
    const libraryUrl = '/api/public/email-images/11111111-1111-1111-1111-111111111111';
    const libraryItem: TemplateImageItem = {
      emailImageId: 'img-9', url: libraryUrl, originalFilename: 'banner.png',
      contentType: 'image/png', sizeBytes: 10, createdAt: '2026-10-13T12:00:00', inUse: false,
    };

    const proseMirror = () => fixture.nativeElement.querySelector('.ProseMirror') as HTMLElement;

    /** Een echt drop-event op de editor, midden in de eerste regel. */
    function dropOnEditor(dataTransfer: DataTransfer): DragEvent {
      const rect = proseMirror().getBoundingClientRect();
      const event = new DragEvent('drop', {
        dataTransfer, clientX: rect.left + 10, clientY: rect.top + 10, bubbles: true, cancelable: true,
      });
      proseMirror().dispatchEvent(event);
      return event;
    }

    const lastHtml = () => changeSpy.calls.mostRecent().args[0] as string;

    it('shows the image library on the images tab and loads it', () => {
      expect(fixture.nativeElement.querySelector('app-template-image-library')).toBeNull();

      component.panelTab.set('images');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-template-image-library')).not.toBeNull();
      expect(imageServiceSpy.list).toHaveBeenCalled();
    });

    it('inserts a library image on the cursor when it is chosen', () => {
      component.onLibraryImageChosen(libraryItem);

      expect(lastHtml()).toContain(`src="${libraryUrl}"`);
      expect(lastHtml()).toContain('alt="banner"');
    });

    it('refuses a chosen image whose URL is not one of our public image paths', () => {
      component.onLibraryImageChosen({ ...libraryItem, url: 'https://evil.example/pixel.png' });

      expect(changeSpy).not.toHaveBeenCalled();
    });

    it('inserts a library image that is dropped on the editor', () => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-rds-image', JSON.stringify({ url: libraryUrl, alt: 'banner' }));

      const event = dropOnEditor(dataTransfer);

      expect(lastHtml()).toContain(`src="${libraryUrl}"`);
      expect(event.defaultPrevented).toBeTrue();
    });

    it('ignores a forged drop payload that points to an external URL', () => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-rds-image',
        JSON.stringify({ url: 'https://evil.example/track.gif', alt: 'x' }));

      const event = dropOnEditor(dataTransfer);

      expect(changeSpy).not.toHaveBeenCalled();
      // en de standaardafhandeling (die de <img> van buiten zou overnemen) is geblokkeerd
      expect(event.defaultPrevented).toBeTrue();
    });

    it('ignores a drop payload that is not valid JSON', () => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/x-rds-image', 'geen json');

      dropOnEditor(dataTransfer);

      expect(changeSpy).not.toHaveBeenCalled();
    });

    it('uploads and inserts an image FILE that is dropped on the editor', () => {
      imageServiceSpy.upload.and.returnValue(of(uploaded));
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(png());

      dropOnEditor(dataTransfer);

      expect(imageServiceSpy.upload).toHaveBeenCalledTimes(1);
      expect(lastHtml()).toContain('src="/api/public/email-images/aaaaaaaa-1111-2222-3333-444444444444"');
    });

    it('does not upload a dropped file that is not an image', () => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['x'], 'notities.txt', { type: 'text/plain' }));

      dropOnEditor(dataTransfer);

      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
    });

    /**
     * Roept de paste-handler van de editor direct aan. Een synthetisch ClipboardEvent geeft in
     * Firefox nooit bestanden door (files: 0), dus de browser-plak-keten is niet na te bootsen;
     * wat hier telt is onze beslislogica.
     */
    function paste(clipboardData: { types: string[]; files: File[] }): boolean {
      const view = (component as unknown as {
        editor: { view: { someProp: (name: string, run: (handler: (...args: unknown[]) => boolean) => boolean) => boolean | undefined } }
      }).editor.view;
      // Andere plugins (die na de onze aan de beurt zijn) lezen ook uit het klembord.
      const fakeClipboard = { ...clipboardData, getData: () => '' };
      return !!view.someProp('handlePaste', handler => handler(view, { clipboardData: fakeClipboard }, null));
    }

    it('uploads and inserts an image that is pasted from the clipboard (e.g. a screenshot)', () => {
      imageServiceSpy.upload.and.returnValue(of(uploaded));

      const handled = paste({ types: ['Files'], files: [png()] });

      expect(handled).toBeTrue();
      expect(imageServiceSpy.upload).toHaveBeenCalledTimes(1);
      expect(lastHtml()).toContain('src="/api/public/email-images/aaaaaaaa-1111-2222-3333-444444444444"');
    });

    it('leaves pasted HTML (even with an image in it) to the default paste handling', () => {
      const handled = paste({ types: ['text/html', 'Files'], files: [png()] });

      expect(handled).toBeFalse();
      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
    });

    it('does not handle a paste without image files', () => {
      expect(paste({ types: ['text/plain'], files: [] })).toBeFalse();
      expect(paste({ types: ['Files'], files: [new File(['x'], 'a.txt', { type: 'text/plain' })] })).toBeFalse();
      expect(imageServiceSpy.upload).not.toHaveBeenCalled();
    });

    it('reports which images are in the text, so the library will not delete them', () => {
      expect(component.usedImageUrls()).toEqual([]);

      component.writeValue(`<p>Hoi</p><img src="${libraryUrl}" alt="x">`);

      expect(component.usedImageUrls()).toEqual([libraryUrl]);

      // Na writeValue is de afbeelding geselecteerd en een nieuwe vervangt die selectie:
      // de lijst volgt dus de actuele tekst.
      const other = '/api/public/email-images/22222222-2222-2222-2222-222222222222';
      component.onLibraryImageChosen({ ...libraryItem, url: other });

      expect(component.usedImageUrls()).toContain(other);
    });

    it('keeps the chosen image size (width/height) in the HTML, also after reopening the template', () => {
      component.writeValue(`<p>Hoi</p><img src="${libraryUrl}" alt="x" width="169" height="85">`);
      // writeValue selecteert de afbeelding; een variabele zou die vervangen. Daarom de cursor naar het begin.
      (component as unknown as { editor: Editor }).editor.commands.setTextSelection(1);
      component.insertVariable('x'); // forceert een onChange met de actuele HTML

      expect(lastHtml()).toMatch(/<img[^>]*width="169"/);
      expect(lastHtml()).toMatch(/<img[^>]*height="85"/);
      // de vaste inline-stijl blijft: nooit breder dan de mail
      expect(lastHtml()).toMatch(/<img[^>]*style="[^"]*max-width:\s*100%/);
    });

    it('writes the new size to the HTML after resizing an image', () => {
      component.writeValue(`<img src="${libraryUrl}" alt="x">`);
      const editor = (component as unknown as { editor: Editor }).editor;

      editor.commands.updateAttributes('image', { width: 120, height: 60 });

      expect(lastHtml()).toMatch(/<img[^>]*width="120"/);
      expect(lastHtml()).toMatch(/<img[^>]*height="60"/);
    });

    it('shows a visible resize handle on the selected image only', () => {
      component.writeValue(`<img src="${libraryUrl}" alt="x" width="100" height="50">`);
      const handle = () => proseMirror().querySelector('[data-resize-handle]') as HTMLElement;

      expect(handle()).not.toBeNull();
      expect(getComputedStyle(handle()).display).toBe('block');
      expect(handle().getBoundingClientRect().width).toBeGreaterThan(6);

      (component as unknown as { editor: Editor }).editor.commands.setTextSelection(1);

      expect(getComputedStyle(handle()).display).toBe('none');
    });

    it('refreshes the library after an upload through the toolbar', () => {
      imageServiceSpy.upload.and.returnValue(of(uploaded));
      component.panelTab.set('images');
      fixture.detectChanges();
      imageServiceSpy.list.calls.reset();

      select(png());

      expect(imageServiceSpy.list).toHaveBeenCalledTimes(1);
    });
  });
});
