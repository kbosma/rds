import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TemplateListComponent } from './template-list.component';
import { TemplateService } from './template.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DocumentTemplate } from '../../shared/models';

/*
 * De Word-templatelijst is een tabel met per regel inzien / bewerken / verwijderen (TEMPLATE_READ /
 * UPDATE / DELETE) en een extra download-icoon. Inzien opent het dialoog alleen-lezen.
 */
describe('TemplateListComponent', () => {
  let fixture: ComponentFixture<TemplateListComponent>;
  let component: TemplateListComponent;
  let serviceSpy: jasmine.SpyObj<TemplateService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const base = { tenantOrganization: 'o', createdAt: '2026-01-01T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '' };
  const templates: DocumentTemplate[] = [
    { documentTemplateId: 't-1', name: 'Offerte', description: 'Standaard offerte', sourceHtml: '<p>x</p>', ...base },
    { documentTemplateId: 't-2', name: 'Factuur', description: 'Upload', sourceHtml: null, ...base },
  ];

  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
  const dialog = () => (component as unknown as { dialog: MatDialog }).dialog;
  const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TemplateService', ['getAll', 'delete', 'getContent']);
    serviceSpy.getAll.and.returnValue(of(templates));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [TemplateListComponent, NoopAnimationsModule],
      providers: [
        { provide: TemplateService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TemplateListComponent);
    component = fixture.componentInstance;
  });

  it('toont de templates als tabelregels met het soort (editor of upload)', fakeAsync(() => {
    load();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Offerte');
    expect(text).toContain('Factuur');
  }));

  it('toont per regel de drie iconen en een download-icoon', fakeAsync(() => {
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(2);
    expect(buttons('action-delete').length).toBe(2);
    expect(buttons('action-download').length).toBe(2);
    for (const a of ['TEMPLATE_READ', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE', 'TEMPLATE_CREATE']) {
      expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
    }
  }));

  it('zonder authorities zijn er geen iconen en geen nieuw-knop', fakeAsync(() => {
    authSpy.hasAuthority.and.returnValue(false);
    fixture = TestBed.createComponent(TemplateListComponent);
    component = fixture.componentInstance;
    load();

    for (const cls of ['action-view', 'action-edit', 'action-delete', 'action-download', 'new-btn']) {
      expect(buttons(cls).length).withContext(cls).toBe(0);
    }
  }));

  it('inzien opent het dialoog alleen-lezen met de template', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    component.viewTemplate(templates[0]);

    const config = open.calls.mostRecent().args[1] as { data: { template: DocumentTemplate; readOnly: boolean }; width: string };
    expect(config.data.readOnly).toBe(true);
    expect(config.data.template).toBe(templates[0]);
    expect(config.width).toBe('980px'); // een template uit de editor krijgt de brede dialoog
  }));

  it('inzien van een geüploade template gebruikt de smalle dialoog', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    component.viewTemplate(templates[1]);

    expect((open.calls.mostRecent().args[1] as { width: string }).width).toBe('500px');
  }));

  it('bewerken opent het dialoog niet-alleen-lezen en ververst na opslaan', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open').and.returnValue({ afterClosed: () => of(true) } as never);
    serviceSpy.getAll.calls.reset();

    component.openDialog(templates[1]);
    tick();

    const config = open.calls.mostRecent().args[1] as { data: { readOnly?: boolean; template: DocumentTemplate } };
    expect(config.data.readOnly).toBeUndefined();
    expect(config.data.template).toBe(templates[1]);
    expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
  }));

  it('verwijderen: bevestigen, service aanroepen, verversen', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    serviceSpy.delete.and.returnValue(of(void 0));
    serviceSpy.getAll.calls.reset();

    component.confirmDelete(templates[0]);
    tick();

    expect(serviceSpy.delete).toHaveBeenCalledWith('t-1');
    expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
  }));

  it('verwijderen: geweigerd of mislukt laat de lijst ongewijzigd', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));
    component.confirmDelete(templates[0]);
    tick();
    expect(serviceSpy.delete).not.toHaveBeenCalled();

    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    serviceSpy.delete.and.returnValue(throwError(() => new Error('nee')));
    serviceSpy.getAll.calls.reset();
    component.confirmDelete(templates[0]);
    tick();
    expect(serviceSpy.getAll).not.toHaveBeenCalled();
  }));

  it('de regel zelf is niet klikbaar', fakeAsync(() => {
    load();
    const open = spyOn(dialog(), 'open');

    (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

    expect(open).not.toHaveBeenCalled();
  }));

  it('filtert op naam en omschrijving', fakeAsync(() => {
    load();

    component.applyFilter({ target: { value: 'factuur' } } as unknown as Event);

    expect(component.filtered().map(t => t.documentTemplateId)).toEqual(['t-2']);
  }));
});
