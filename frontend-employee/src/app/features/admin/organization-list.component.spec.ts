import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { OrganizationListComponent } from './organization-list.component';
import { OrganizationService } from './organization.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Organization } from '../../shared/models';

describe('OrganizationListComponent', () => {
  let component: OrganizationListComponent;
  let fixture: ComponentFixture<OrganizationListComponent>;
  let serviceSpy: jasmine.SpyObj<OrganizationService>;
  let authStub: { hasAuthority: jasmine.Spy };
  let confirmSpy: jasmine.SpyObj<ConfirmService>;

  const mockOrganizations: Organization[] = [
    { organizationId: 'o-1', name: 'Puurkroatie', createdAt: '2026-01-01T09:00:00', createdBy: '', modifiedAt: '', modifiedBy: '' },
    { organizationId: 'o-2', name: 'TechPartner BV', createdAt: '2026-01-01T09:00:00', createdBy: '', modifiedAt: '', modifiedBy: '' },
  ];

  const ADMIN_AUTHORITIES = [
    'ORGANIZATION_READ', 'ORGANIZATION_CREATE', 'ORGANIZATION_UPDATE', 'ORGANIZATION_DELETE',
    'PERSON_CREATE', 'ACCOUNT_CREATE', 'ACCOUNTROLE_CREATE',
  ];

  const grant = (authorities: string[]) =>
    authStub.hasAuthority.and.callFake((a: string) => authorities.includes(a));

  const create = () => {
    fixture = TestBed.createComponent(OrganizationListComponent);
    component = fixture.componentInstance;
  };

  const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };
  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('OrganizationService', ['getAll', 'delete']);
    serviceSpy.getAll.and.returnValue(of(mockOrganizations));
    authStub = { hasAuthority: jasmine.createSpy('hasAuthority') };
    grant(ADMIN_AUTHORITIES);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);

    await TestBed.configureTestingModule({
      imports: [OrganizationListComponent, NoopAnimationsModule],
      providers: [
        { provide: OrganizationService, useValue: serviceSpy },
        { provide: AuthService, useValue: authStub },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();

    create();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('laadt de organisaties bij init', fakeAsync(() => {
    load();

    expect(serviceSpy.getAll).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Organisaties');
  }));

  describe('knoppen volgen de authorities van OrganizationController (nooit de rol)', () => {
    it('met alle ORGANIZATION-authorities: bewerken en verwijderen per regel, nieuw en wizard in de kop', fakeAsync(() => {
      load();

      expect(buttons('action-edit').length).toBe(2);
      expect(buttons('action-delete').length).toBe(2);
      expect(buttons('new-btn').length).toBe(1);
      expect(buttons('onboarding-btn').length).toBe(1);
      for (const a of ['ORGANIZATION_CREATE', 'ORGANIZATION_UPDATE', 'ORGANIZATION_DELETE']) {
        expect(authStub.hasAuthority).toHaveBeenCalledWith(a);
      }
    }));

    it('zonder ORGANIZATION_DELETE geen prullenbak (de backend zou 403 geven)', fakeAsync(() => {
      grant(ADMIN_AUTHORITIES.filter(a => a !== 'ORGANIZATION_DELETE'));
      create();
      load();

      expect(buttons('action-delete').length).toBe(0);
      expect(buttons('action-edit').length).toBe(2);
    }));

    it('zonder ORGANIZATION_UPDATE geen bewerkknop', fakeAsync(() => {
      grant(ADMIN_AUTHORITIES.filter(a => a !== 'ORGANIZATION_UPDATE'));
      create();
      load();

      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(2);
    }));

    it('alleen ORGANIZATION_READ: lijst zonder acties, nieuw of wizard', fakeAsync(() => {
      grant(['ORGANIZATION_READ']);
      create();
      load();

      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
      expect(buttons('new-btn').length).toBe(0);
      expect(buttons('onboarding-btn').length).toBe(0);
    }));

    it('wizard alleen als ook persoon, account en rolkoppeling aangemaakt mogen worden', fakeAsync(() => {
      grant(ADMIN_AUTHORITIES.filter(a => a !== 'ACCOUNTROLE_CREATE'));
      create();
      load();

      expect(buttons('onboarding-btn').length).toBe(0);
      expect(buttons('new-btn').length).toBe(1);
    }));
  });

  describe('verwijderen', () => {
    let snackSpy: jasmine.Spy;
    let translate: TranslateService;

    beforeEach(() => {
      // De snackbar die het component zelf injecteert (MatSnackBarModule in de imports kan een eigen instantie geven).
      snackSpy = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
      translate = TestBed.inject(TranslateService);
    });

    it('bevestigen, service aanroepen en de regel verdwijnt', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(of(void 0));

      component.deleteOrganization(mockOrganizations[1]);
      tick();

      expect(serviceSpy.delete).toHaveBeenCalledWith('o-2');
      expect(component.dataSource.data.map(o => o.organizationId)).toEqual(['o-1']);
    }));

    it('geweigerde bevestiging laat alles staan', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.deleteOrganization(mockOrganizations[1]);
      tick();

      expect(serviceSpy.delete).not.toHaveBeenCalled();
      expect(component.dataSource.data.length).toBe(2);
    }));

    it('409 (organisatie heeft nog gegevens): specifieke melding en de regel blijft', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

      component.deleteOrganization(mockOrganizations[1]);
      tick();

      expect(snackSpy.calls.mostRecent().args[0]).toBe(translate.instant('organizations.deleteBlocked'));
      expect(component.dataSource.data.length).toBe(2);
    }));

    it('andere fout: algemene melding', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
      serviceSpy.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

      component.deleteOrganization(mockOrganizations[1]);
      tick();

      expect(snackSpy.calls.mostRecent().args[0]).toBe(translate.instant('organizations.removeError'));
      expect(component.dataSource.data.length).toBe(2);
    }));
  });
});
