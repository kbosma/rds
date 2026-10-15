import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DocumentListComponent } from './document-list.component';
import { DocumentService } from './document.service';
import { BookingService } from '../bookings/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { Document } from '../../shared/models';

/*
 * Documenten zijn geschiedenis: per regel inzien (dialoog met downloaden) en hernoemen, maar bewust
 * GEEN verwijderen.
 */
describe('DocumentListComponent', () => {
  let fixture: ComponentFixture<DocumentListComponent>;
  let component: DocumentListComponent;
  let documentServiceSpy: jasmine.SpyObj<DocumentService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const docs: Document[] = [
    { documentId: 'd-1', bookingId: 'b-1', displayname: 'Offerte - BK-1.docx', mimeType: 'application/x', createdAt: '2026-05-01T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o' },
    { documentId: 'd-2', bookingId: 'b-1', displayname: 'Factuur - BK-1.pdf', mimeType: 'application/pdf', createdAt: '2026-05-02T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o' },
  ];

  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
  const dialog = () => (component as unknown as { dialog: MatDialog }).dialog;
  const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

  beforeEach(async () => {
    documentServiceSpy = jasmine.createSpyObj('DocumentService', ['getAll']);
    documentServiceSpy.getAll.and.returnValue(of(docs));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [DocumentListComponent, NoopAnimationsModule],
      providers: [
        { provide: DocumentService, useValue: documentServiceSpy },
        { provide: BookingService, useValue: { getAll: () => of([{ bookingId: 'b-1', bookingNumber: 'BK-1' }]) } },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentListComponent);
    component = fixture.componentInstance;
  });

  it('toont de documenten met boekingsnummer', fakeAsync(() => {
    load();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('BK-1');
  }));

  it('toont inzien en bewerken (DOCUMENT_READ/UPDATE) maar nooit verwijderen', fakeAsync(() => {
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(2);
    expect(buttons('action-delete').length).toBe(0);
    expect(authSpy.hasAuthority).toHaveBeenCalledWith('DOCUMENT_READ');
    expect(authSpy.hasAuthority).toHaveBeenCalledWith('DOCUMENT_UPDATE');
    expect(authSpy.hasAuthority).not.toHaveBeenCalledWith('DOCUMENT_DELETE');
  }));

  it('verbergt iconen zonder de bijbehorende authority', fakeAsync(() => {
    authSpy.hasAuthority.and.callFake((a: string) => a === 'DOCUMENT_READ');
    fixture = TestBed.createComponent(DocumentListComponent);
    component = fixture.componentInstance;
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(0);
  }));

  it('inzien opent het documentdialoog met boekingsnummer', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    component.viewDocument(docs[0]);

    const data = (open.calls.mostRecent().args[1] as { data: { document: Document; bookingNumber?: string } }).data;
    expect(data.document).toBe(docs[0]);
    expect(data.bookingNumber).toBe('BK-1');
  }));

  it('hernoemen opent het dialoog en ververst de lijst na opslaan', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open').and.returnValue({ afterClosed: () => of(true) } as never);
    documentServiceSpy.getAll.calls.reset();

    component.editDocument(docs[1]);
    tick();

    expect((open.calls.mostRecent().args[1] as { data: { document: Document } }).data.document).toBe(docs[1]);
    expect(documentServiceSpy.getAll).toHaveBeenCalledTimes(1);
  }));

  it('annuleren van het hernoemen ververst niets', fakeAsync(() => {
    load();
    spyOn(dialog(), 'open').and.returnValue({ afterClosed: () => of(undefined) } as never);
    documentServiceSpy.getAll.calls.reset();

    component.editDocument(docs[0]);
    tick();

    expect(documentServiceSpy.getAll).not.toHaveBeenCalled();
  }));

  it('de regel zelf is niet klikbaar', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

    expect(open).not.toHaveBeenCalled();
  }));
});
