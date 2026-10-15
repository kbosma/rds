import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { of } from 'rxjs';
import { TravelerDialogComponent, TravelerDialogData } from './traveler-dialog.component';
import { TravelerService } from './traveler.service';
import { Traveler } from '../../shared/models';

/*
 * TravelerDialogComponent maakt/bewerkt een reiziger. Regressie: de geslacht-opties
 * stuurden 'M'/'F', terwijl de backend (Gender-enum, JSON in lowercase) alleen
 * 'man' / 'vrouw' / 'anders' accepteert -> 400 "No enum constant ...Gender.F".
 */
describe('TravelerDialogComponent', () => {
  /** Waarden die de backend-enum Gender accepteert (lowercase JSON). */
  const BACKEND_GENDERS = ['man', 'vrouw', 'anders'];

  let fixture: ComponentFixture<TravelerDialogComponent>;
  let component: TravelerDialogComponent;
  let serviceSpy: jasmine.SpyObj<TravelerService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TravelerDialogComponent>>;

  const existing: Traveler = {
    travelerId: 't-1', bookingId: 'b-1', firstname: 'Wendy', prefix: '', lastname: 'Vos',
    initials: 'HWJ', gender: 'vrouw', birthdate: '1965-01-06',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };

  async function setup(data: TravelerDialogData) {
    serviceSpy = jasmine.createSpyObj('TravelerService', ['create', 'update']);
    serviceSpy.create.and.returnValue(of(existing));
    serviceSpy.update.and.returnValue(of(existing));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [TravelerDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: TravelerService, useValue: serviceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const genderSelect = () => fixture.debugElement.query(By.directive(MatSelect)).componentInstance as MatSelect;

  it('offers only gender values that the backend accepts', async () => {
    await setup({ bookingId: 'b-1' });

    const values = genderSelect().options.map(o => o.value as string);

    expect(values.length).toBeGreaterThan(0);
    values.forEach(v => expect(BACKEND_GENDERS).toContain(v));
  });

  it('create: sends the selected gender in the backend format', async () => {
    await setup({ bookingId: 'b-1' });
    component.form.patchValue({
      firstname: 'Wendy', lastname: 'Vos', initials: 'HWJ', gender: 'vrouw', birthdate: '1965-01-06',
    });

    component.save();

    expect(serviceSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({
      bookingId: 'b-1', firstname: 'Wendy', gender: 'vrouw',
    }));
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('edit: preselects the traveler\'s gender (backend format) in the dropdown', async () => {
    await setup({ bookingId: 'b-1', traveler: existing });

    expect(component.isNew()).toBe(false);
    expect(genderSelect().value).toBe('vrouw');
    // en dat is ook echt een van de aangeboden opties
    expect(genderSelect().options.map(o => o.value)).toContain('vrouw');
  });

  it('edit: saves via update with the traveler id', async () => {
    await setup({ bookingId: 'b-1', traveler: existing });

    component.save();

    expect(serviceSpy.update).toHaveBeenCalledWith('t-1', jasmine.objectContaining({ gender: 'vrouw' }));
    expect(serviceSpy.create).not.toHaveBeenCalled();
  });
});
