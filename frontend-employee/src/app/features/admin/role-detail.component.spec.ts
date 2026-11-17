import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { RoleDetailComponent } from './role-detail.component';
import { RoleService } from './role.service';
import { RoleAuthorityService } from './role-authority.service';
import { AuthorityService } from './authority.service';
import { AuthorizationLogService } from './authorization-log.service';
import { AuthService } from '../../core/auth/auth.service';
import { Authority, Role, RoleAuthority } from '../../shared/models';

/*
 * Rolscherm: naam, startpunt (kopie) en de rechten als matrix. Wat mag, bepaalt de server; het scherm toont wat kan
 * en geeft de uitleg van de server door.
 */
describe('RoleDetailComponent', () => {
  const authorities: Authority[] = [
    { authorityId: 'a-1', description: 'BOOKING_READ', domain: 'BOOKING', requires: [] },
    { authorityId: 'a-2', description: 'BOOKING_UPDATE', domain: 'BOOKING', requires: ['BOOKING_READ'] },
    { authorityId: 'a-3', description: 'PAYMENT_READ', domain: 'PAYMENT', requires: ['BOOKING_READ'] },
    { authorityId: 'a-4', description: 'ORGANIZATION_READ', domain: 'ORGANIZATION', requires: [] },
  ];
  const grantable = authorities.slice(0, 3); // ORGANIZATION_READ mag een klant niet uitdelen
  const ownRole: Role = { roleId: 'r-1', description: 'Boekhouder', systemKey: null, editable: true, accountCount: 2 };
  const employeeRole: Role = { roleId: 'r-2', description: 'EMPLOYEE', systemKey: 'EMPLOYEE', editable: false };
  const managerRole: Role = { roleId: 'r-3', description: 'MANAGER', systemKey: 'MANAGER', editable: false };
  const links: RoleAuthority[] = [
    { role: ownRole, authority: authorities[0] },
    { role: employeeRole, authority: authorities[0] },
    { role: managerRole, authority: authorities[3] }, // bevat iets dat de gebruiker niet mag uitdelen
  ];

  let role: Role;
  let allowed: Set<string>;
  let roleService: jasmine.SpyObj<RoleService>;
  let roleAuthorityService: jasmine.SpyObj<RoleAuthorityService>;

  function setup(id: string | null) {
    roleService = jasmine.createSpyObj('RoleService', ['getById', 'getAll', 'create', 'update', 'getNewAuthorities']);
    roleService.getById.and.callFake(() => of(role));
    roleService.getAll.and.returnValue(of([ownRole, employeeRole, managerRole]));
    roleService.create.and.returnValue(of({ ...ownRole, roleId: 'r-new' }));
    roleService.update.and.callFake((_id: string, r: Partial<Role>) => of({ ...role, ...r } as Role));
    roleService.getNewAuthorities.and.returnValue(of([authorities[2]]));
    roleAuthorityService = jasmine.createSpyObj('RoleAuthorityService', ['getAll', 'create', 'delete']);
    roleAuthorityService.getAll.and.returnValue(of(links));
    roleAuthorityService.create.and.returnValue(of({ role: ownRole, authority: authorities[1] }));
    roleAuthorityService.delete.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [RoleDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: RoleService, useValue: roleService },
        { provide: RoleAuthorityService, useValue: roleAuthorityService },
        { provide: AuthorityService, useValue: { getAll: () => of(authorities), getGrantable: () => of(grantable) } },
        { provide: AuthorizationLogService, useValue: { getForRole: () => of([]) } },
        { provide: AuthService, useValue: { hasAuthority: (a: string) => allowed.has(a) } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => id } } } },
      ],
    });
    const fixture = TestBed.createComponent(RoleDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const checkbox = (el: HTMLElement, name: string) =>
    el.querySelector(`mat-checkbox[data-authority="${name}"] input`) as HTMLInputElement | null;

  beforeEach(() => {
    role = ownRole;
    allowed = new Set(['ROLE_READ', 'ROLE_UPDATE', 'AUTHORITY_READ', 'ROLEAUTHORITY_READ', 'ROLEAUTHORITY_CREATE', 'ROLEAUTHORITY_DELETE']);
  });

  it('toont de rechten van deze rol in de matrix; wat je niet mag uitdelen staat er niet in', fakeAsync(() => {
    const { component, el } = setup('r-1');

    expect([...component.assigned()]).toEqual(['BOOKING_READ']);
    expect(checkbox(el, 'BOOKING_READ')!.checked).toBe(true);
    expect(checkbox(el, 'BOOKING_UPDATE')!.checked).toBe(false);
    expect(checkbox(el, 'BOOKING_UPDATE')!.disabled).toBe(false);
    expect(checkbox(el, 'ORGANIZATION_READ')).toBeNull(); // onderwerp zonder uitdeelbare rechten verdwijnt
    expect(el.textContent).toContain('2'); // gebruikt door 2 accounts
  }));

  it('aanvinken voegt het recht toe en haalt de matrix opnieuw op (de server zet vereisten mee aan)', fakeAsync(() => {
    const { component } = setup('r-1');
    roleAuthorityService.getAll.calls.reset();

    component.onToggle({ authority: authorities[1], checked: true });
    tick();

    expect(roleAuthorityService.create).toHaveBeenCalledOnceWith('r-1', 'a-2');
    expect(roleAuthorityService.getAll).toHaveBeenCalled();
  }));

  it('uitvinken haalt het recht weg', fakeAsync(() => {
    const { component } = setup('r-1');

    component.onToggle({ authority: authorities[0], checked: false });
    tick();

    expect(roleAuthorityService.delete).toHaveBeenCalledOnceWith('r-1', 'a-1');
  }));

  it('een weigering van de server (409) laat de uitleg van de server zien', fakeAsync(() => {
    const { component, fixture } = setup('r-1');
    // MatSnackBarModule in de component zelf levert de snackbar: die bespioneren we.
    const open = spyOn(fixture.debugElement.injector.get(MatSnackBar), 'open');
    roleAuthorityService.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409, error: { message: 'Het recht BOOKING_READ is nodig voor [BOOKING_UPDATE]' },
    })));

    component.onToggle({ authority: authorities[0], checked: false });
    tick();

    expect(open).toHaveBeenCalledWith('Het recht BOOKING_READ is nodig voor [BOOKING_UPDATE]', jasmine.anything(), jasmine.anything());
  }));

  it('een systeemrol is alleen te bekijken: geen opslaan en een grijze matrix', fakeAsync(() => {
    role = managerRole;
    const { component, el } = setup('r-3');

    expect(component.editable()).toBe(false);
    expect(component.form.disabled).toBe(true);
    expect(el.querySelector('button[type="submit"]')).toBeNull();
    expect(checkbox(el, 'BOOKING_READ')!.disabled).toBe(true);
    expect(el.querySelector('.locked-note')).not.toBeNull();

    component.onToggle({ authority: authorities[1], checked: true });
    expect(roleAuthorityService.create).not.toHaveBeenCalled();
  }));

  it('zonder ROLEAUTHORITY_READ geen matrix en worden de koppelingen niet opgehaald', fakeAsync(() => {
    allowed = new Set(['ROLE_READ']);
    const { el } = setup('r-1');

    expect(roleAuthorityService.getAll).not.toHaveBeenCalled();
    expect(el.querySelector('app-role-authority-matrix')).toBeNull();
  }));

  it('een nieuwe rol: alleen rollen die je helemaal mag uitdelen zijn een startpunt; opslaan gaat naar de nieuwe rol', fakeAsync(() => {
    const { component } = setup(null);

    expect(component.copyCandidates().map((r) => r.roleId)).toEqual(['r-1', 'r-2']); // MANAGER bevat ORGANIZATION_READ

    component.form.setValue({ description: 'Stagiair', copyFrom: 'r-2' });
    component.save();
    tick();

    expect(roleService.create).toHaveBeenCalledOnceWith({ description: 'Stagiair' }, 'r-2');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/admin/roles', 'r-new']);
  }));
});
