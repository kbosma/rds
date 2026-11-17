import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { RoleListComponent } from './role-list.component';
import { RoleService } from './role.service';
import { AuthService } from '../../core/auth/auth.service';
import { Role } from '../../shared/models';

describe('RoleListComponent', () => {
  const roles: Role[] = [
    { roleId: 'r-1', description: 'Boekhouder', systemKey: null, editable: true, accountCount: 2 },
    { roleId: 'r-2', description: 'MANAGER', systemKey: 'MANAGER', editable: false, accountCount: 1 },
  ];
  let roleService: jasmine.SpyObj<RoleService>;

  function setup(authorities: string[]) {
    roleService = jasmine.createSpyObj('RoleService', ['getAll', 'getNewAuthorities', 'markNewAuthoritiesSeen', 'delete']);
    roleService.getAll.and.returnValue(of(roles));
    roleService.getNewAuthorities.and.returnValue(of([{ authorityId: 'a-1', description: 'USER_SCOPE_ORGANIZATION' }]));
    roleService.markNewAuthoritiesSeen.and.returnValue(of(void 0));
    TestBed.configureTestingModule({
      imports: [RoleListComponent, NoopAnimationsModule],
      providers: [
        { provide: RoleService, useValue: roleService },
        { provide: AuthService, useValue: { hasAuthority: (a: string) => authorities.includes(a) } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
    });
    const fixture = TestBed.createComponent(RoleListComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('meldt nieuwe rechten; Gezien laat de melding verdwijnen', fakeAsync(() => {
    const { fixture, el } = setup(['ROLE_READ', 'ROLE_UPDATE']);
    expect(el.querySelector('.new-rights')?.textContent).toContain('USER_SCOPE_ORGANIZATION');

    (el.querySelector('.seen-btn') as HTMLButtonElement).click();
    tick();
    fixture.detectChanges();

    expect(roleService.markNewAuthoritiesSeen).toHaveBeenCalled();
    expect(el.querySelector('.new-rights')).toBeNull();
  }));

  it('zonder ROLE_UPDATE geen knop Gezien', fakeAsync(() => {
    const { el } = setup(['ROLE_READ']);
    expect(el.querySelector('.new-rights')).not.toBeNull();
    expect(el.querySelector('.seen-btn')).toBeNull();
  }));

  it('een systeemrol heeft een slotje en alleen een inzien-knop; een eigen rol is te bewerken', fakeAsync(() => {
    const { el } = setup(['ROLE_READ', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE']);
    const rows = el.querySelectorAll('tr.mat-mdc-row');
    expect(rows[0].textContent).toContain('Boekhouder');
    expect(rows[0].querySelector('.act-update')).not.toBeNull();
    expect(rows[1].querySelector('.lock')).not.toBeNull();
    expect(rows[1].querySelector('.act-update')).toBeNull();
    expect(rows[1].querySelector('.act-view, .act-info')).not.toBeNull();
  }));
});
