import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { DocumentPortalDialogComponent } from './document-portal-dialog.component';
import { DocumentService } from './document.service';
import { Document } from '../../shared/models';

describe('DocumentPortalDialogComponent', () => {
  const doc = { documentId: 'd-1', displayname: 'Bevestiging.pdf', visibleInPortal: false } as Document;

  async function setup() {
    const service = jasmine.createSpyObj<DocumentService>('DocumentService', ['setPortalVisibility']);
    service.setPortalVisibility.and.returnValue(of(doc));
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [DocumentPortalDialogComponent, NoopAnimationsModule],
      providers: [
        provideTranslateService(),
        { provide: DocumentService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { document: doc } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DocumentPortalDialogComponent);
    spyOn((fixture.componentInstance as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, service, dialogRef };
  }

  it('begint met de huidige zichtbaarheid van het document', async () => {
    const { component } = await setup();

    expect(component.visibleInPortal).toBeFalse();
  });

  it('slaat alleen de zichtbaarheid op en sluit met true', async () => {
    const { component, service, dialogRef } = await setup();
    component.visibleInPortal = true;

    component.save();

    expect(service.setPortalVisibility).toHaveBeenCalledOnceWith('d-1', true);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('twee keer kort na elkaar opslaan verstuurt maar één wijziging', async () => {
    const { component, service } = await setup();
    service.setPortalVisibility.and.returnValue(new Subject<Document>());

    component.save();
    component.save();

    expect(service.setPortalVisibility).toHaveBeenCalledTimes(1);
  });

  it('na een fout kan opnieuw geprobeerd worden', async () => {
    const { component, service, dialogRef } = await setup();
    service.setPortalVisibility.and.returnValues(throwError(() => new Error('x')), of(doc));

    component.save();
    expect(component.saving()).toBeFalse();
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
