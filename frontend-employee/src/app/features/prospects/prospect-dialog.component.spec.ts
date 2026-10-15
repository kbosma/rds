import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ProspectDialogComponent } from './prospect-dialog.component';
import { BookerService } from '../bookers/booker.service';
import { Booker } from '../../shared/models';

/*
 * ProspectDialogComponent registreert een potentiële booker. We verifiëren dat
 * onSubmit() de BookerService.create() aanroept met status 'prospect' en het
 * dialoog sluit met 'true'.
 */
describe('ProspectDialogComponent', () => {
  let component: ProspectDialogComponent;
  let bookerServiceSpy: jasmine.SpyObj<BookerService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ProspectDialogComponent>>;

  const mockBooker: Booker = {
    bookerId: 'p-1', firstname: 'Pros', prefix: '', lastname: 'Pect',
    callsign: '', telephone: '', emailaddress: 'prospect@example.com',
    gender: '', birthdate: '', initials: '', status: 'prospect',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };

  beforeEach(async () => {
    bookerServiceSpy = jasmine.createSpyObj('BookerService', ['create']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ProspectDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: BookerService, useValue: bookerServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProspectDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onSubmit() should create a booker with status "prospect" and close with true', () => {
    bookerServiceSpy.create.and.returnValue(of(mockBooker));

    component.form.patchValue({
      firstname: 'Pros',
      lastname: 'Pect',
      emailaddress: 'prospect@example.com',
    });

    component.onSubmit();

    expect(bookerServiceSpy.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        firstname: 'Pros',
        lastname: 'Pect',
        emailaddress: 'prospect@example.com',
        status: 'prospect',
      })
    );
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('onSubmit() should not call create when the form is invalid', () => {
    // leeg formulier → required velden ontbreken
    component.onSubmit();
    expect(bookerServiceSpy.create).not.toHaveBeenCalled();
  });
});
