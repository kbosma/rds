import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService } from '@ngx-translate/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject, of } from 'rxjs';
import { DocumentUploadDialogComponent } from './document-upload-dialog.component';
import { DocumentService } from './document.service';
import { TemplateService } from '../templates/template.service';
import { Document } from '../../shared/models';

describe('DocumentUploadDialogComponent', () => {
  async function setup() {
    const documents = jasmine.createSpyObj<DocumentService>('DocumentService', ['generate', 'create']);
    documents.generate.and.returnValue(of({} as Document));
    documents.create.and.returnValue(of({} as Document));
    const templates = jasmine.createSpyObj<TemplateService>('TemplateService', ['getAll']);
    templates.getAll.and.returnValue(of([]));
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [DocumentUploadDialogComponent, NoopAnimationsModule],
      providers: [
        provideTranslateService(), provideHttpClient(), provideHttpClientTesting(),
        { provide: DocumentService, useValue: documents },
        { provide: TemplateService, useValue: templates },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { bookingId: 'b-1' } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentUploadDialogComponent);
    spyOn((fixture.componentInstance as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, documents, dialogRef, el: fixture.nativeElement as HTMLElement };
  }

  it('toont de optie zichtbaar in het portaal, standaard uit', async () => {
    const { component, el } = await setup();

    expect(el.querySelector('.portal-option')).not.toBeNull();
    expect(component.visibleInPortal).toBeFalse();
  });

  it('genereert standaard niet zichtbaar in het portaal', async () => {
    const { component, documents } = await setup();
    component.selectedTemplateId = 't-1';

    component.generate();

    expect(documents.generate).toHaveBeenCalledOnceWith('t-1', 'b-1', 'pdf', false);
  });

  it('geeft de gekozen zichtbaarheid mee bij genereren', async () => {
    const { component, documents } = await setup();
    component.selectedTemplateId = 't-1';
    component.visibleInPortal = true;

    component.generate();

    expect(documents.generate).toHaveBeenCalledOnceWith('t-1', 'b-1', 'pdf', true);
  });

  it('geeft de gekozen zichtbaarheid mee bij uploaden', async () => {
    const { component, documents } = await setup();
    component.fileData.set([1, 2]);
    component.displayname = 'Offerte.pdf';
    component.fileMimeType.set('application/pdf');
    component.visibleInPortal = true;

    component.upload();

    expect(documents.create.calls.mostRecent().args[0] as unknown as { visibleInPortal: boolean }).toEqual(jasmine.objectContaining({ visibleInPortal: true }));
  });

  it('twee keer kort na elkaar genereren maakt maar één document', async () => {
    const { component, documents } = await setup();
    component.selectedTemplateId = 't-1';
    documents.generate.and.returnValue(new Subject<Document>());

    component.generate();
    component.generate();

    expect(documents.generate).toHaveBeenCalledTimes(1);
  });
});
