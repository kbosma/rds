import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { DocumentViewDialogComponent } from './document-view-dialog.component';
import { DocumentEditDialogComponent } from './document-edit-dialog.component';
import { DocumentService } from './document.service';
import { Document } from '../../shared/models';

describe('Documentdialogen', () => {
  const doc: Document = {
    documentId: 'd-1', bookingId: 'b-1', displayname: 'Offerte - BK-1.docx', mimeType: 'application/x',
    createdAt: '2026-05-01T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o',
  };

  describe('DocumentViewDialogComponent', () => {
    async function setup() {
      const service = jasmine.createSpyObj('DocumentService', ['getContent']);
      await TestBed.configureTestingModule({
        imports: [DocumentViewDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: DocumentService, useValue: service },
          { provide: MAT_DIALOG_DATA, useValue: { document: doc, bookingNumber: 'BK-1' } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(DocumentViewDialogComponent);
      const component = fixture.componentInstance;
      const snack = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
      fixture.detectChanges();
      return { fixture, component, service, snack };
    }

    it('toont naam, boekingsnummer en type', async () => {
      const { fixture } = await setup();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Offerte - BK-1.docx');
      expect(text).toContain('BK-1');
      expect(text).toContain('application/x');
    });

    it('downloaden haalt de inhoud op en start een download met de documentnaam', async () => {
      const { component, service } = await setup();
      service.getContent.and.returnValue(of(new Blob(['x'])));
      const link = document.createElement('a');
      const click = spyOn(link, 'click');
      spyOn(document, 'createElement').and.returnValue(link);
      spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
      spyOn(URL, 'revokeObjectURL');

      component.download();

      expect(service.getContent).toHaveBeenCalledWith('d-1');
      expect(link.download).toBe('Offerte - BK-1.docx');
      expect(click).toHaveBeenCalled();
      expect(component.downloading()).toBe(false);
    });

    it('een mislukte download meldt de fout', async () => {
      const { component, service, snack } = await setup();
      service.getContent.and.returnValue(throwError(() => new Error('nee')));

      component.download();

      expect(snack).toHaveBeenCalled();
      expect(component.downloading()).toBe(false);
    });
  });

  describe('DocumentEditDialogComponent', () => {
    const full = { ...doc, document: [1, 2, 3] } as unknown as Document;

    async function setup() {
      const service = jasmine.createSpyObj('DocumentService', ['getById', 'update']);
      service.getById.and.returnValue(of(full));
      service.update.and.returnValue(of(full));
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
      await TestBed.configureTestingModule({
        imports: [DocumentEditDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: DocumentService, useValue: service },
          { provide: MatDialogRef, useValue: dialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { document: doc } },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(DocumentEditDialogComponent);
      const component = fixture.componentInstance;
      const snack = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
      fixture.detectChanges();
      return { component, service, dialogRef, snack };
    }

    it('hernoemt: haalt het volledige document op en stuurt het met de nieuwe naam (inhoud blijft mee)', async () => {
      const { component, service, dialogRef } = await setup();
      component.form.setValue({ displayname: '  Nieuwe naam.docx ' });

      component.save();

      expect(service.getById).toHaveBeenCalledWith('d-1');
      expect(service.update).toHaveBeenCalledOnceWith('d-1', jasmine.objectContaining({
        displayname: 'Nieuwe naam.docx', document: [1, 2, 3],
      }));
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('slaat NIETS op als de inhoud in het opgehaalde document ontbreekt (nooit de inhoud wissen)', async () => {
      const { component, service, dialogRef, snack } = await setup();
      service.getById.and.returnValue(of(doc)); // zonder bytes
      component.form.setValue({ displayname: 'Nieuw' });

      component.save();

      expect(service.update).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(snack).toHaveBeenCalled();
    });

    it('een lege naam is ongeldig', async () => {
      const { component, service } = await setup();
      component.form.setValue({ displayname: '' });

      component.save();

      expect(service.getById).not.toHaveBeenCalled();
    });

    it('een serverfout bij opslaan sluit het dialoog niet', async () => {
      const { component, service, dialogRef } = await setup();
      service.update.and.returnValue(throwError(() => new Error('boom')));

      component.save();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    });
  });
});
