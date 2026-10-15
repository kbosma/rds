import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { PersonListComponent } from './person-list.component';
import { PersonService } from './person.service';
import { OrganizationService } from './organization.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Person } from '../../shared/models';

/*
 * De personenlijst: tabel met per regel inzien / bewerken / verwijderen (PERSON_READ / UPDATE / DELETE).
 */
describe('PersonListComponent', () => {
  let fixture: ComponentFixture<PersonListComponent>;
  let component: PersonListComponent;
  let personServiceSpy: jasmine.SpyObj<PersonService>;
  let authStub: { hasAuthority: jasmine.Spy };
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let organizationsSpy: jasmine.Spy;

  const persons = [
    { persoonId: 'p-1', firstname: 'Jan', prefix: 'de', lastname: 'Vries', organizationId: 'o-1' },
    { persoonId: 'p-2', firstname: 'Piet', prefix: '', lastname: 'Jansen', organizationId: 'o-1' },
  ];

  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
  const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

  beforeEach(async () => {
    personServiceSpy = jasmine.createSpyObj('PersonService', ['getAll', 'delete']);
    personServiceSpy.getAll.and.returnValue(of(persons as unknown as Person[]));
    authStub = { hasAuthority: jasmine.createSpy('hasAuthority').and.returnValue(true) };
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    organizationsSpy = jasmine.createSpy('getAll').and.returnValue(of([{ organizationId: 'o-1', name: 'Puur Kroatië' }]));

    await TestBed.configureTestingModule({
      imports: [PersonListComponent, NoopAnimationsModule],
      providers: [
        { provide: PersonService, useValue: personServiceSpy },
        { provide: OrganizationService, useValue: { getAll: organizationsSpy } },
        { provide: AuthService, useValue: authStub },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PersonListComponent);
    component = fixture.componentInstance;
  });

  it('should create and show the title', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Personen');
  });

  it('toont per regel inzien, bewerken en verwijderen met PERSON_READ/UPDATE/DELETE', fakeAsync(() => {
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(2);
    expect(buttons('action-delete').length).toBe(2);
    for (const a of ['PERSON_READ', 'PERSON_UPDATE', 'PERSON_DELETE']) {
      expect(authStub.hasAuthority).toHaveBeenCalledWith(a);
    }
  }));

  it('verbergt iconen zonder de bijbehorende authority', fakeAsync(() => {
    authStub.hasAuthority.and.callFake((a: string) => a === 'PERSON_READ');
    fixture = TestBed.createComponent(PersonListComponent);
    component = fixture.componentInstance;
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(0);
    expect(buttons('action-delete').length).toBe(0);
  }));

  it('inzien opent de detailpagina alleen-lezen', fakeAsync(() => {
    load();
    const navigate = spyOn((component as unknown as { router: Router }).router, 'navigate');

    component.viewPerson(component.dataSource.data[0]);

    expect(navigate).toHaveBeenCalledWith(['/admin/persons', 'p-1'], { queryParams: { readonly: 'true' } });
  }));

  it('bewerken opent de detailpagina zonder readonly', fakeAsync(() => {
    load();
    const navigate = spyOn((component as unknown as { router: Router }).router, 'navigate');

    component.navigateToEdit(component.dataSource.data[1]);

    expect(navigate).toHaveBeenCalledWith(['/admin/persons', 'p-2']);
  }));

  it('verwijderen: bevestigen, service aanroepen en de regel verdwijnt', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    personServiceSpy.delete.and.returnValue(of(void 0));

    component.deletePerson(component.dataSource.data[0]);
    tick();

    expect(personServiceSpy.delete).toHaveBeenCalledWith('p-1');
    expect(component.dataSource.data.map(p => p.persoonId)).toEqual(['p-2']);
  }));

  it('verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

    component.deletePerson(component.dataSource.data[0]);
    tick();

    expect(personServiceSpy.delete).not.toHaveBeenCalled();
  }));

  describe('organisaties tonen (ORGANIZATION_READ, geen rol)', () => {
    it('met ORGANIZATION_READ: organisatiekolom en organisatiefilter', fakeAsync(() => {
      load();

      expect(organizationsSpy).toHaveBeenCalled();

      expect(authStub.hasAuthority).toHaveBeenCalledWith('ORGANIZATION_READ');
      expect(component.displayedColumns).toContain('organization');
    }));

    it('zonder ORGANIZATION_READ: geen organisatiekolom, en de organisaties worden niet eens opgehaald', fakeAsync(() => {
      authStub.hasAuthority.and.callFake((a: string) => a !== 'ORGANIZATION_READ');
      fixture = TestBed.createComponent(PersonListComponent);
      component = fixture.componentInstance;
      load();

      expect(component.displayedColumns).not.toContain('organization');
      expect(organizationsSpy).not.toHaveBeenCalled();
    }));
  });
});
