import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { OrganizationSettingsComponent } from './organization-settings.component';
import { OrganizationSettingsService } from './organization-settings.service';
import { TemplateService } from '../templates/template.service';
import { EmailTemplateService } from '../email-templates/email-template.service';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentTemplate, EmailTemplate, OrganizationSettings } from '../../shared/models';

/*
 * Organisatie-instellingen: kies de offertetemplate en de offertemail. Alleen met ORGANIZATION_SETTINGS_UPDATE kun je
 * opslaan; zonder die authority zie je de keuzes alleen.
 */
describe('OrganizationSettingsComponent', () => {
  let fixture: ComponentFixture<OrganizationSettingsComponent>;
  let component: OrganizationSettingsComponent;
  let settingsSpy: jasmine.SpyObj<OrganizationSettingsService>;

  const settings: OrganizationSettings = {
    organizationId: 'o-1', quoteDocumentTemplateId: 'dt-1', quoteEmailTemplateId: null, modifiedAt: null, modifiedBy: null,
  };
  const documentTemplates = [{ documentTemplateId: 'dt-1', name: 'Offerte' }, { documentTemplateId: 'dt-2', name: 'Voucher' }] as DocumentTemplate[];
  const emailTemplates = [{ emailTemplateId: 'et-1', name: 'Offertemail' }] as EmailTemplate[];

  function setup(authorities: string[]) {
    settingsSpy = jasmine.createSpyObj('OrganizationSettingsService', ['getMine', 'updateMine']);
    settingsSpy.getMine.and.returnValue(of(settings));
    settingsSpy.updateMine.and.callFake((s) => of({ ...settings, ...s, modifiedAt: '2026-11-11T10:00:00' }));
    const templateSpy = jasmine.createSpyObj('TemplateService', ['getAll']);
    templateSpy.getAll.and.returnValue(of(documentTemplates));
    const emailTemplateSpy = jasmine.createSpyObj('EmailTemplateService', ['getAll']);
    emailTemplateSpy.getAll.and.returnValue(of(emailTemplates));
    const authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority', 'currentUser']);
    authSpy.currentUser.and.returnValue({ roles: [] });
    authSpy.hasAuthority.and.callFake((a: string) => authorities.includes(a));

    TestBed.configureTestingModule({
      imports: [OrganizationSettingsComponent, NoopAnimationsModule],
      providers: [
        { provide: OrganizationSettingsService, useValue: settingsSpy },
        { provide: TemplateService, useValue: templateSpy },
        { provide: EmailTemplateService, useValue: emailTemplateSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    });
    fixture = TestBed.createComponent(OrganizationSettingsComponent);
    component = fixture.componentInstance;
    spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }

  it('laadt de huidige keuzes en de templates', fakeAsync(() => {
    setup(['ORGANIZATION_SETTINGS_READ', 'ORGANIZATION_SETTINGS_UPDATE']);

    expect(component.loading()).toBeFalse();
    expect(component.documentTemplates().length).toBe(2);
    expect(component.emailTemplates().length).toBe(1);
    expect(component.form.getRawValue()).toEqual({ quoteDocumentTemplateId: 'dt-1', quoteEmailTemplateId: null });
  }));

  it('slaat de gekozen templates op', fakeAsync(() => {
    setup(['ORGANIZATION_SETTINGS_READ', 'ORGANIZATION_SETTINGS_UPDATE']);
    component.form.patchValue({ quoteEmailTemplateId: 'et-1' });
    component.form.markAsDirty();

    component.save();
    tick();

    expect(settingsSpy.updateMine).toHaveBeenCalledWith({ quoteDocumentTemplateId: 'dt-1', quoteEmailTemplateId: 'et-1' });
    expect(component.form.pristine).toBeTrue();
    expect(component.modifiedAt()).toBe('2026-11-11T10:00:00');
  }));

  it('is alleen-lezen zonder ORGANIZATION_SETTINGS_UPDATE', fakeAsync(() => {
    setup(['ORGANIZATION_SETTINGS_READ']);
    const el = fixture.nativeElement as HTMLElement;

    expect(component.form.disabled).toBeTrue();
    expect(el.querySelector('.save-btn')).toBeNull();
    expect(el.querySelector('.read-only-note')).not.toBeNull();
    component.save();
    expect(settingsSpy.updateMine).not.toHaveBeenCalled();
  }));
});
