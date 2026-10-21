import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { BookerSelectDialogComponent } from './booker-select-dialog.component';
import { BookerService } from './booker.service';
import { AuthService } from '../../core/auth/auth.service';
import { Booker } from '../../shared/models';

describe('BookerSelectDialogComponent', () => {
  const booker = (id: string, firstname: string, lastname: string): Booker => ({
    bookerId: id, status: 'active', firstname, prefix: '', lastname, callsign: '', telephone: '',
    emailaddress: `${id}@example.com`, gender: '', birthdate: '', initials: '',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o',
  });
  const bookers = [booker('b-1', 'Anna', 'Jansen'), booker('b-2', 'Piet', 'Pietersen')];

  let dialogRef: jasmine.SpyObj<MatDialogRef<BookerSelectDialogComponent>>;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let dialogResult: Booker | boolean | undefined;

  function setup(canCreate: boolean) {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    matDialog = jasmine.createSpyObj('MatDialog', ['open']);
    matDialog.open.and.callFake(() => ({ afterClosed: () => of(dialogResult) }) as never);
    TestBed.configureTestingModule({
      imports: [BookerSelectDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: BookerService, useValue: { getAll: () => of(bookers) } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: AuthService, useValue: { hasAuthority: (a: string) => canCreate && a === 'BOOKING_CREATE' } },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: matDialog });
    const fixture = TestBed.createComponent(BookerSelectDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('toont de bestaande bookers en kiest er een', () => {
    const { fixture, component } = setup(true);
    expect(fixture.nativeElement.textContent).toContain('Anna');

    component.select('b-2');

    expect(dialogRef.close).toHaveBeenCalledOnceWith('b-2');
  });

  it('"Nieuwe boeker" opent het boekerdialoog in aanmaakmodus en kiest de nieuwe boeker', () => {
    const { fixture, component } = setup(true);
    dialogResult = booker('b-new', 'Nieuw', 'Persoon');
    expect(fixture.nativeElement.querySelector('.new-booker-btn')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.new-booker-btn').classList).toContain('act-create');

    component.createNew();

    const config = matDialog.open.calls.mostRecent().args[1] as { data: { readOnly: boolean; booker?: Booker } };
    expect(config.data).toEqual({ readOnly: false });
    expect(dialogRef.close).toHaveBeenCalledOnceWith('b-new');
  });

  it('annuleren in het boekerdialoog kiest niets', () => {
    const { component } = setup(true);
    dialogResult = undefined;

    component.createNew();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('zonder BOOKING_CREATE is er geen "Nieuwe boeker"-knop', () => {
    const { fixture } = setup(false);

    expect(fixture.nativeElement.querySelector('.new-booker-btn')).toBeNull();
  });
});
