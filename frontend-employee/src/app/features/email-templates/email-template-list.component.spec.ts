import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { EmailTemplateListComponent } from './email-template-list.component';
import { EmailTemplateDialogComponent } from './email-template-dialog.component';
import { EmailTemplateService } from './email-template.service';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { EmailTemplate } from '../../shared/models';

/*
 * EmailTemplateListComponent laadt de e-mailtemplates en filtert client-side.
 * We mocken EmailTemplateService en AuthService (hasAuthority bepaalt canEdit).
 */
describe('EmailTemplateListComponent', () => {
  let component: EmailTemplateListComponent;
  let fixture: ComponentFixture<EmailTemplateListComponent>;
  let serviceSpy: jasmine.SpyObj<EmailTemplateService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const mockTemplates: EmailTemplate[] = [
    {
      emailTemplateId: '1', name: 'Welkom', description: 'Welkomstmail',
      subject: 'Welkom', bodyHtml: '<p>Hallo</p>',
      createdAt: '2026-01-01T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
    },
    {
      emailTemplateId: '2', name: 'Herinnering', description: 'Betaalherinnering',
      subject: 'Betaling', bodyHtml: '<p>Betaal</p>',
      createdAt: '2026-01-02T10:00:00', createdBy: 'u', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
    },
  ];

  function createComponent() {
    fixture = TestBed.createComponent(EmailTemplateListComponent);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('EmailTemplateService', ['getAll', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockTemplates));
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [EmailTemplateListComponent, NoopAnimationsModule],
      providers: [
        { provide: EmailTemplateService, useValue: serviceSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should load templates on init', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();

    expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
    expect(component.allTemplates().length).toBe(2);
    expect(component.filtered().length).toBe(2);
    expect(component.loading()).toBe(false);
  }));

  it('should set loading false on error', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('boom')));
    createComponent();
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
  }));

  it('applyFilter() should filter on name, description and subject', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    tick();

    component.applyFilter({ target: { value: 'herinner' } } as unknown as Event);
    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].name).toBe('Herinnering');

    component.applyFilter({ target: { value: 'betaling' } } as unknown as Event);
    expect(component.filtered().length).toBe(1);

    component.applyFilter({ target: { value: '' } } as unknown as Event);
    expect(component.filtered().length).toBe(2);
  }));

  it('canCreate should be false when the user lacks TEMPLATE_CREATE', () => {
    authSpy.hasAuthority.and.returnValue(false);
    createComponent();

    expect(authSpy.hasAuthority).toHaveBeenCalledWith('TEMPLATE_CREATE');
    expect(component.canCreate).toBe(false);
  });

  describe('actie-iconen', () => {
    const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
    const dialog = () => (component as unknown as { dialog: MatDialog }).dialog;
    const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

    it('toont een tabel met per regel inzien, bewerken en verwijderen (TEMPLATE_READ/UPDATE/DELETE)', fakeAsync(() => {
      createComponent();
      load();

      expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(2);
      expect(buttons('action-delete').length).toBe(2);
      for (const a of ['TEMPLATE_READ', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE']) {
        expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
      }
    }));

    it('een EMPLOYEE (alleen TEMPLATE_READ) ziet alleen het inzien-icoon en geen nieuw-knop', fakeAsync(() => {
      authSpy.hasAuthority.and.callFake((a: string) => a === 'TEMPLATE_READ');
      createComponent();
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
      expect(buttons('new-btn').length).toBe(0);
    }));

    it('inzien opent de template alleen-lezen (geen voorbeeld en geen verzenden)', fakeAsync(() => {
      createComponent();
      load();
      const open = spyOn(dialog(), 'open');

      component.viewTemplate(mockTemplates[1]);

      const data = (open.calls.mostRecent().args[1] as { data: { template: EmailTemplate; readOnly: boolean } }).data;
      expect(open.calls.mostRecent().args[0]).toBe(EmailTemplateDialogComponent);
      expect(data.template).toBe(mockTemplates[1]);
      expect(data.readOnly).toBe(true);
    }));

    it('bewerken opent het editor-dialoog en laadt de lijst opnieuw na opslaan', fakeAsync(() => {
      createComponent();
      load();
      const open = spyOn(dialog(), 'open').and.returnValue({ afterClosed: () => of(true) } as never);
      serviceSpy.getAll.calls.reset();

      component.openDialog(mockTemplates[0]);
      tick();

      expect((open.calls.mostRecent().args[1] as { data: { template: EmailTemplate } }).data.template).toBe(mockTemplates[0]);
      expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
    }));

    it('verwijderen: bevestigen, service aanroepen en de lijst verversen', fakeAsync(() => {
      createComponent();
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(of(void 0));
      serviceSpy.getAll.calls.reset();

      component.confirmDelete(mockTemplates[0]);
      tick();

      expect(serviceSpy.delete).toHaveBeenCalledWith('1');
      expect(serviceSpy.getAll).toHaveBeenCalledTimes(1);
    }));

    it('verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
      createComponent();
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.confirmDelete(mockTemplates[0]);
      tick();

      expect(serviceSpy.delete).not.toHaveBeenCalled();
    }));

    it('de regel zelf is niet klikbaar', fakeAsync(() => {
      createComponent();
      load();
      const open = spyOn(dialog(), 'open');

      (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

      expect(open).not.toHaveBeenCalled();
    }));
  });
});
