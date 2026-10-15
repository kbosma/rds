import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { TemplateDialogComponent, TemplateDialogData } from './template-dialog.component';
import { TemplateService } from './template.service';
import { TemplateImageService } from '../../shared/template-editor/template-image.service';
import { BOOKING_REPEAT_TABLES, DOCUMENT_VARIABLE_GROUPS } from '../../shared/template-editor/template-variables';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DocumentTemplate } from '../../shared/models';

/*
 * Een Word-template wordt geüpload (.docx) of in de editor gemaakt (de backend bouwt het .docx bij het
 * opslaan en bewaart de HTML, zodat de template opnieuw in de editor te openen is).
 */
describe('TemplateDialogComponent', () => {
  let serviceSpy: jasmine.SpyObj<TemplateService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TemplateDialogComponent>>;
  let snackBarOpenSpy: jasmine.Spy;

  const saved: DocumentTemplate = {
    documentTemplateId: 'tpl-1', name: 'Offerte', description: '', tenantOrganization: 'org-1',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '',
  };
  const uploadedTemplate: DocumentTemplate = { ...saved, sourceHtml: null };
  const editorTemplate: DocumentTemplate = { ...saved, sourceHtml: '<p>Boeking ${booking.bookingNumber}</p>' };

  async function setup(data: TemplateDialogData) {
    serviceSpy = jasmine.createSpyObj('TemplateService', ['create', 'update']);
    serviceSpy.create.and.returnValue(of(saved));
    serviceSpy.update.and.returnValue(of(saved));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close', 'updateSize']);
    const imageSpy = jasmine.createSpyObj('TemplateImageService', ['upload', 'list']);
    imageSpy.list.and.returnValue(of([]));
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [TemplateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: TemplateService, useValue: serviceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: TemplateImageService, useValue: imageSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']) },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TemplateDialogComponent);
    const component = fixture.componentInstance;
    snackBarOpenSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    return { fixture, component };
  }

  describe('nieuwe template', () => {
    it('start als upload, en vraagt naam én bestand', async () => {
      const { component } = await setup({});

      expect(component.mode()).toBe('upload');
      component.name = 'Offerte';
      expect(component.canSave()).toBe(false);

      component.fileData.set([1, 2, 3]);
      expect(component.canSave()).toBe(true);
    });

    it('wisselen naar de editor maakt de dialoog breder (en terug weer smaller)', async () => {
      const { component } = await setup({});

      component.setMode('editor');
      expect(dialogRefSpy.updateSize).toHaveBeenCalledWith('980px');

      component.setMode('upload');
      expect(dialogRefSpy.updateSize).toHaveBeenCalledWith('500px');
    });

    it('in de editor is een naam en inhoud nodig; een bestand niet', async () => {
      const { component } = await setup({});
      component.setMode('editor');
      component.name = 'Offerte';

      expect(component.canSave()).toBe(false);

      component.sourceHtml = '<p>Hallo</p>';
      expect(component.canSave()).toBe(true);
    });

    it('een lege editor telt niet als inhoud', async () => {
      const { component } = await setup({});
      component.setMode('editor');
      component.name = 'Offerte';

      for (const empty of ['', '<p></p>', '<p> </p>', '<p><br></p>', '<h1></h1>']) {
        component.sourceHtml = empty;
        expect(component.canSave()).withContext(empty).toBe(false);
      }
    });

    it('een afbeelding of tabel zonder tekst telt wel als inhoud', async () => {
      const { component } = await setup({});
      component.setMode('editor');
      component.name = 'Offerte';

      component.sourceHtml = '<p><img src="/api/public/email-images/aaaaaaaa-1111-2222-3333-444444444444"></p>';
      expect(component.canSave()).toBe(true);

      component.sourceHtml = '<table><tbody><tr><td></td></tr></tbody></table>';
      expect(component.canSave()).toBe(true);
    });

    it('opslaan vanuit de editor stuurt de HTML (en geen bestand)', async () => {
      const { component } = await setup({});
      component.setMode('editor');
      component.name = 'Offerte';
      component.description = 'omschrijving';
      component.sourceHtml = '<p>Boeking ${booking.bookingNumber}</p>';
      component.fileData.set([9, 9]); // eerder gekozen bestand mag niet meegestuurd worden

      component.save();

      expect(serviceSpy.create).toHaveBeenCalledOnceWith({
        name: 'Offerte', description: 'omschrijving', sourceHtml: '<p>Boeking ${booking.bookingNumber}</p>',
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it('opslaan als upload stuurt het bestand (en geen HTML)', async () => {
      const { component } = await setup({});
      component.name = 'Offerte';
      component.sourceHtml = '<p>oud</p>'; // eerder in de editor getypt; hoort bij de upload niet mee
      component.fileData.set([1, 2, 3]);

      component.save();

      expect(serviceSpy.create).toHaveBeenCalledOnceWith({ name: 'Offerte', description: '', templateData: [1, 2, 3] });
    });

    it('save() doet niets zolang het formulier niet geldig is', async () => {
      const { component } = await setup({});

      component.save();

      expect(serviceSpy.create).not.toHaveBeenCalled();
    });

    it('geeft de variabelen en herhaalde tabellen van een Word-template aan de editor', async () => {
      const { component } = await setup({});

      expect(component.variableGroups).toBe(DOCUMENT_VARIABLE_GROUPS);
      expect(component.repeatTables).toBe(BOOKING_REPEAT_TABLES);
    });

    it('toont de editor in editor-modus en het uploadformulier in upload-modus', async () => {
      const { fixture, component } = await setup({});
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-template-body-editor')).toBeNull();
      expect(fixture.nativeElement.querySelector('.dropzone')).not.toBeNull();

      component.setMode('editor');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-template-body-editor')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.dropzone')).toBeNull();
    });
  });

  describe('bestaande template uit de editor', () => {
    it('opent in de editor met de bewaarde HTML, en zonder keuze tussen de soorten', async () => {
      const { fixture, component } = await setup({ template: editorTemplate });
      fixture.detectChanges();

      expect(component.isEdit).toBe(true);
      expect(component.mode()).toBe('editor');
      expect(component.sourceHtml).toBe('<p>Boeking ${booking.bookingNumber}</p>');
      expect(fixture.nativeElement.querySelector('mat-button-toggle-group')).toBeNull();
    });

    it('kan niet terug naar upload (geen keuze, geen waarschuwing)', async () => {
      const { fixture, component } = await setup({ template: editorTemplate });
      fixture.detectChanges();

      expect(component.canSwitchToEditor).toBe(false);
      expect(fixture.nativeElement.querySelector('.switch-warning')).toBeNull();
    });

    it('opslaan werkt de template bij met de HTML', async () => {
      const { component } = await setup({ template: editorTemplate });
      component.sourceHtml = '<p>nieuw</p>';

      component.save();

      expect(serviceSpy.update).toHaveBeenCalledOnceWith('tpl-1', {
        name: 'Offerte', description: '', sourceHtml: '<p>nieuw</p>',
      });
    });

    it('toont de servermelding als opslaan mislukt (bv. een afbeelding die niet in Word kan)', async () => {
      const { component } = await setup({ template: editorTemplate });
      const message = "Images of type 'image/webp' cannot be used in a Word template; use PNG, JPEG or GIF.";
      serviceSpy.update.and.returnValue(throwError(() => ({ error: { message } })));

      component.save();

      expect(snackBarOpenSpy.calls.mostRecent().args[0]).toBe(message);
      expect(component.saving()).toBe(false);
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('bestaande geüploade template', () => {
    it('opent als upload (de editor kan een geüpload bestand niet lezen)', async () => {
      const { component } = await setup({ template: uploadedTemplate });

      expect(component.mode()).toBe('upload');
      expect(component.sourceHtml).toBe('');
    });

    it('alleen de naam wijzigen stuurt geen bestand en geen HTML mee (de inhoud blijft staan)', async () => {
      const { component } = await setup({ template: uploadedTemplate });
      component.name = 'Nieuwe naam';

      component.save();

      expect(serviceSpy.update).toHaveBeenCalledOnceWith('tpl-1', { name: 'Nieuwe naam', description: '' });
    });

    it('een nieuw bestand kiezen stuurt dat bestand mee', async () => {
      const { component } = await setup({ template: uploadedTemplate });
      component.fileData.set([7, 7]);

      component.save();

      expect(serviceSpy.update.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({ templateData: [7, 7] }));
    });

    it('kan omgeschakeld worden naar de editor, met een waarschuwing dat het bestand wordt vervangen', async () => {
      const { fixture, component } = await setup({ template: uploadedTemplate });
      fixture.detectChanges();
      expect(component.canSwitchToEditor).toBe(true);
      expect(fixture.nativeElement.querySelector('mat-button-toggle-group')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.switch-warning')).toBeNull();

      component.setMode('editor');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-template-body-editor')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.switch-warning')).not.toBeNull();
      expect(dialogRefSpy.updateSize).toHaveBeenCalledWith('980px');
    });

    it('opslaan vanuit de editor vervangt het bestand: stuurt de HTML en geen bytes', async () => {
      const { component } = await setup({ template: uploadedTemplate });
      component.setMode('editor');
      component.sourceHtml = '<p>nieuw</p>';

      component.save();

      expect(serviceSpy.update).toHaveBeenCalledOnceWith('tpl-1', { name: 'Offerte', description: '', sourceHtml: '<p>nieuw</p>' });
    });

    it('toont een algemene melding (niet de servertekst) als opslaan mislukt', async () => {
      const { component } = await setup({ template: uploadedTemplate });
      serviceSpy.update.and.returnValue(throwError(() => ({ error: { message: 'interne details' } })));

      component.save();

      expect(snackBarOpenSpy.calls.mostRecent().args[0]).not.toBe('interne details');
    });
  });

  describe('bestand kiezen', () => {
    it('weigert een bestand dat geen .docx is', async () => {
      const { component } = await setup({});
      const input = { files: [new File(['x'], 'brief.pdf')] } as unknown as HTMLInputElement;

      component.onFileSelected({ target: input } as unknown as Event);

      expect(component.errorMessage()).not.toBe('');
      expect(component.selectedFileName()).toBe('');
    });

    it('neemt een .docx aan', async () => {
      const { component } = await setup({});
      const input = { files: [new File(['x'], 'brief.docx')] } as unknown as HTMLInputElement;

      component.onFileSelected({ target: input } as unknown as Event);

      expect(component.errorMessage()).toBe('');
      expect(component.selectedFileName()).toBe('brief.docx');
    });
  });

  describe('alleen inzien', () => {
    it('een template uit de editor: editor uitgeschakeld, formulier niet bewerkbaar en geen opslaan-knop', async () => {
      const { fixture, component } = await setup({ template: editorTemplate, readOnly: true });
      fixture.detectChanges();

      expect(component.readOnly).toBe(true);
      expect(component.canSwitchToEditor).toBe(false);
      expect(fixture.nativeElement.querySelector('app-template-body-editor')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.editor-hint')).toBeNull();
      expect(fixture.nativeElement.querySelector('mat-button-toggle-group')).toBeNull();
      expect(Array.from(fixture.nativeElement.querySelectorAll('button')).some(
        (b) => /save|Opslaan/i.test((b as HTMLElement).textContent ?? ''))).toBe(false);
    });

    it('een geüploade template: een download-knop en geen uploadformulier', async () => {
      const { fixture } = await setup({ template: uploadedTemplate, readOnly: true });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.download-btn')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.dropzone')).toBeNull();
    });

    it('opslaan doet niets in alleen-inzien', async () => {
      const { component } = await setup({ template: editorTemplate, readOnly: true });
      component.sourceHtml = '<p>gewijzigd</p>';

      component.save();

      expect(serviceSpy.update).not.toHaveBeenCalled();
      expect(serviceSpy.create).not.toHaveBeenCalled();
    });

    it('readOnly zonder template (nieuw) wordt genegeerd', async () => {
      const { component } = await setup({ readOnly: true });

      expect(component.readOnly).toBe(false);
    });
  });
});
