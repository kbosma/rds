import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { EmailTemplateDialogComponent, EmailTemplateDialogData } from './email-template-dialog.component';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplate } from '../../shared/models';

/*
 * EmailTemplateDialogComponent maakt/bewerkt een template. We verifiëren de
 * canSave()-validatie en dat save() de juiste service-call doet (create vs
 * update) met getrimde waarden en het dialoog sluit met 'true'.
 */
describe('EmailTemplateDialogComponent', () => {
  let serviceSpy: jasmine.SpyObj<EmailTemplateService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EmailTemplateDialogComponent>>;

  const mockTemplate: EmailTemplate = {
    emailTemplateId: 'tpl-1', name: 'Welkom', description: 'desc',
    subject: 'Onderwerp', bodyHtml: '<p>body</p>',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };

  async function setup(data: EmailTemplateDialogData) {
    serviceSpy = jasmine.createSpyObj('EmailTemplateService', ['create', 'update']);
    serviceSpy.create.and.returnValue(of(mockTemplate));
    serviceSpy.update.and.returnValue(of(mockTemplate));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [EmailTemplateDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: EmailTemplateService, useValue: serviceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmailTemplateDialogComponent);
    return fixture.componentInstance;
  }

  it('should create (new mode) with empty fields', async () => {
    const component = await setup({});
    expect(component).toBeTruthy();
    expect(component.isEdit).toBe(false);
    expect(component.canSave()).toBe(false);
  });

  it('canSave() should require name, subject and bodyHtml', async () => {
    const component = await setup({});
    component.name = 'Welkom';
    expect(component.canSave()).toBe(false);
    component.subject = 'Onderwerp';
    expect(component.canSave()).toBe(false);
    component.bodyHtml = '<p>x</p>';
    expect(component.canSave()).toBe(true);
  });

  it('save() in new mode should call create with trimmed values and close with true', async () => {
    const component = await setup({});
    component.name = '  Welkom  ';
    component.description = '  desc  ';
    component.subject = '  Onderwerp  ';
    component.bodyHtml = '<p>body</p>';

    component.save();

    expect(serviceSpy.create).toHaveBeenCalledWith({
      name: 'Welkom',
      description: 'desc',
      subject: 'Onderwerp',
      bodyHtml: '<p>body</p>',
    });
    expect(serviceSpy.update).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('save() should not call the service when invalid', async () => {
    const component = await setup({});
    component.save();
    expect(serviceSpy.create).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('edit mode should prefill fields and save() should call update with the id', async () => {
    const component = await setup({ template: mockTemplate });
    expect(component.isEdit).toBe(true);
    expect(component.name).toBe('Welkom');
    expect(component.subject).toBe('Onderwerp');
    expect(component.bodyHtml).toBe('<p>body</p>');

    component.save();

    expect(serviceSpy.update).toHaveBeenCalledWith('tpl-1', {
      name: 'Welkom',
      description: 'desc',
      subject: 'Onderwerp',
      bodyHtml: '<p>body</p>',
    });
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });
});
