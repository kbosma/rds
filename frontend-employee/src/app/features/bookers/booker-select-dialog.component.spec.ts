import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { BookerSelectDialogComponent } from './booker-select-dialog.component';
import { BookerService } from './booker.service';
import { Booker } from '../../shared/models';

describe('BookerSelectDialogComponent', () => {
  const booker = (id: string, firstname: string, lastname: string): Booker => ({
    bookerId: id, status: 'active', firstname, prefix: '', lastname, callsign: '', telephone: '',
    emailaddress: `${id}@example.com`, gender: '', birthdate: '', initials: '',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o',
  });
  const bookers = [booker('b-1', 'Anna', 'Jansen'), booker('b-2', 'Piet', 'Pietersen')];

  let dialogRef: jasmine.SpyObj<MatDialogRef<BookerSelectDialogComponent>>;

  function setup() {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [BookerSelectDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: BookerService, useValue: { getAll: () => of(bookers) } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    const fixture = TestBed.createComponent(BookerSelectDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('toont de bestaande bookers en kiest er een', () => {
    const { fixture, component } = setup();
    expect(fixture.nativeElement.textContent).toContain('Anna');

    component.select('b-2');

    expect(dialogRef.close).toHaveBeenCalledOnceWith('b-2');
  });

  it('filtert op naam', () => {
    const { component } = setup();

    component.filter({ target: { value: 'piet' } } as unknown as Event);

    expect(component.filtered().map(b => b.bookerId)).toEqual(['b-2']);
  });

  it('heeft geen knop "Nieuwe boeker": een boeking ontstaat alleen vanuit een bestaande boeker', () => {
    const { fixture } = setup();

    expect(fixture.nativeElement.querySelector('.new-booker-btn')).toBeNull();
  });
});
