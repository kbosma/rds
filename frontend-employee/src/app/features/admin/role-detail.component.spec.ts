import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoleDetailComponent } from './role-detail.component';
import { RoleService } from './role.service';
import { RoleAuthorityService } from './role-authority.service';
import { AuthorityService } from './authority.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { RoleAuthority } from '../../shared/models';

/*
 * Rolscherm: beschrijving bewerken én de authorities van de rol beheren (koppelen/ontkoppelen).
 */
describe('RoleDetailComponent', () => {
  const role = { roleId: 'r-1', description: 'MANAGER' };
  const authorities = [
    { authorityId: 'a-1', description: 'BOOKING_READ' },
    { authorityId: 'a-2', description: 'BOOKING_CREATE' },
    { authorityId: 'a-3', description: 'SUPPLIER_READ' },
  ];
  const links: RoleAuthority[] = [
    { role, authority: authorities[0] },
    { role: { roleId: 'r-2', description: 'EMPLOYEE' }, authority: authorities[1] }, // andere rol
  ];

  let roleAuthorityService: jasmine.SpyObj<RoleAuthorityService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let allowed: Set<string>;

  function setup(id: string | null) {
    roleAuthorityService = jasmine.createSpyObj('RoleAuthorityService', ['getAll', 'create', 'delete']);
    roleAuthorityService.getAll.and.returnValue(of(links));
    roleAuthorityService.create.and.returnValue(of({ role, authority: authorities[2] }));
    roleAuthorityService.delete.and.returnValue(of(void 0));
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmSpy.confirm.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({
      imports: [RoleDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: RoleService, useValue: { getById: () => of(role), create: () => of(role), update: () => of(role) } },
        { provide: RoleAuthorityService, useValue: roleAuthorityService },
        { provide: AuthorityService, useValue: { getAll: () => of(authorities) } },
        { provide: AuthService, useValue: { hasAuthority: (a: string) => allowed.has(a) } },
        { provide: ConfirmService, useValue: confirmSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => id } } } },
      ],
    });
    const fixture = TestBed.createComponent(RoleDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => {
    allowed = new Set(['ROLEAUTHORITY_READ', 'ROLEAUTHORITY_CREATE', 'ROLEAUTHORITY_DELETE']);
  });

  it('toont alleen de authorities van deze rol en biedt de overige aan', fakeAsync(() => {
    const { component, fixture } = setup('r-1');

    expect(component.assigned().map(a => a.authorityId)).toEqual(['a-1']);
    expect(component.availableAuthorities().map(a => a.authorityId)).toEqual(['a-2', 'a-3']);
    expect(fixture.nativeElement.textContent).toContain('BOOKING_READ');
  }));

  it('een nieuwe rol heeft nog geen authorities-kaart', fakeAsync(() => {
    const { fixture } = setup(null);

    expect(roleAuthorityService.getAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.authorities-card')).toBeNull();
  }));

  it('koppelen legt de koppeling en ververst de lijst', fakeAsync(() => {
    const { component } = setup('r-1');
    component.authorityControl.setValue('a-3');

    component.addAuthority();
    tick();

    expect(roleAuthorityService.create).toHaveBeenCalledOnceWith('r-1', 'a-3');
    expect(component.authorityControl.value).toBeNull();
    expect(roleAuthorityService.getAll).toHaveBeenCalledTimes(2);
  }));

  it('koppelen zonder keuze doet niets', fakeAsync(() => {
    const { component } = setup('r-1');

    component.addAuthority();

    expect(roleAuthorityService.create).not.toHaveBeenCalled();
  }));

  it('koppelen zonder ROLEAUTHORITY_CREATE doet niets', fakeAsync(() => {
    allowed.delete('ROLEAUTHORITY_CREATE');
    const { component } = setup('r-1');
    component.authorityControl.setValue('a-3');

    component.addAuthority();

    expect(roleAuthorityService.create).not.toHaveBeenCalled();
  }));

  it('ontkoppelen: na bevestiging de koppeling verwijderen', fakeAsync(() => {
    const { component } = setup('r-1');

    component.removeAuthority(authorities[0]);
    tick();

    expect(confirmSpy.confirm).toHaveBeenCalled();
    expect(roleAuthorityService.delete).toHaveBeenCalledOnceWith('r-1', 'a-1');
  }));

  it('ontkoppelen: een geweigerde bevestiging laat alles staan', fakeAsync(() => {
    const { component } = setup('r-1');
    confirmSpy.confirm.and.returnValue(Promise.resolve(false));

    component.removeAuthority(authorities[0]);
    tick();

    expect(roleAuthorityService.delete).not.toHaveBeenCalled();
  }));

  it('een mislukte koppeling laat de lijst ongewijzigd', fakeAsync(() => {
    const { component } = setup('r-1');
    roleAuthorityService.create.and.returnValue(throwError(() => new Error('nee')));
    component.authorityControl.setValue('a-3');

    component.addAuthority();
    tick();

    expect(component.assigned().map(a => a.authorityId)).toEqual(['a-1']);
  }));

  it('zonder ROLEAUTHORITY_READ is de kaart verborgen en worden de koppelingen niet opgehaald', fakeAsync(() => {
    allowed = new Set();
    const { fixture } = setup('r-1');

    expect(roleAuthorityService.getAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.authorities-card')).toBeNull();
  }));

  it('met alleen lezen zijn er geen koppel- en ontkoppelknoppen', fakeAsync(() => {
    allowed = new Set(['ROLEAUTHORITY_READ']);
    const { fixture } = setup('r-1');

    expect(fixture.nativeElement.querySelector('.add-authority-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.remove-authority-btn')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('BOOKING_READ');
  }));
});
