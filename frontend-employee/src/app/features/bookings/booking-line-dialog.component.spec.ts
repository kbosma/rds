import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { BookingLineDialogComponent } from './booking-line-dialog.component';
import { BookingLineService } from './booking-line.service';
import { AccommodationService } from '../accommodations/accommodation.service';
import { AccommodationSupplierService } from '../accommodations/accommodation-supplier.service';
import { SupplierService } from '../suppliers/supplier.service';
import { AuthService } from '../../core/auth/auth.service';
import { BookingLine } from '../../shared/models';

/*
 * Boekingsregel toevoegen: accommodatie kiezen (of nieuw aanmaken); de leverancier volgt uit de koppeling
 * en is anders te kiezen of nieuw aan te maken, waarna de koppeling bij opslaan wordt vastgelegd.
 */
describe('BookingLineDialogComponent', () => {
  const base = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o' };
  const acc1 = { accommodationId: 'a-1', key: 'ACC-1', name: 'Suite', ...base };
  const sup1 = { supplierId: 's-1', key: 'SUP-1', name: 'Hotel A', ...base };
  const sup2 = { supplierId: 's-2', key: 'SUP-2', name: 'Hotel B', ...base };

  let dialogRef: jasmine.SpyObj<MatDialogRef<BookingLineDialogComponent>>;
  let accommodationService: jasmine.SpyObj<AccommodationService>;
  let supplierService: jasmine.SpyObj<SupplierService>;
  let accSupplierService: jasmine.SpyObj<AccommodationSupplierService>;
  let bookingLineService: jasmine.SpyObj<BookingLineService>;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let dialogResult: { key: string; name: string } | undefined;
  let allowed: Set<string>;

  function setup(links: { accommodationId: string; supplierId: string }[]) {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    accommodationService = jasmine.createSpyObj('AccommodationService', ['getAll', 'create']);
    accommodationService.getAll.and.returnValue(of([acc1]));
    accommodationService.create.and.returnValue(of({ accommodationId: 'a-new', key: 'N', name: 'Nieuw', ...base }));
    supplierService = jasmine.createSpyObj('SupplierService', ['getAll', 'create']);
    supplierService.getAll.and.returnValue(of([sup1, sup2]));
    supplierService.create.and.returnValue(of({ supplierId: 's-new', key: 'NS', name: 'Nieuwe lev', ...base }));
    accSupplierService = jasmine.createSpyObj('AccommodationSupplierService', ['getAll', 'create']);
    accSupplierService.getAll.and.returnValue(of(links));
    accSupplierService.create.and.callFake(l => of(l));
    bookingLineService = jasmine.createSpyObj('BookingLineService', ['create', 'update']);
    bookingLineService.create.and.returnValue(of({ bookingLineId: 'bl-1' } as BookingLine));
    matDialog = jasmine.createSpyObj('MatDialog', ['open']);
    matDialog.open.and.callFake(() => ({ afterClosed: () => of(dialogResult) }) as never);

    TestBed.configureTestingModule({
      imports: [BookingLineDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { bookingId: 'bk-1', existingLines: [] } },
        { provide: AccommodationService, useValue: accommodationService },
        { provide: SupplierService, useValue: supplierService },
        { provide: AccommodationSupplierService, useValue: accSupplierService },
        { provide: BookingLineService, useValue: bookingLineService },
        { provide: AuthService, useValue: { hasAuthority: (a: string) => allowed.has(a) } },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: matDialog });
    const fixture = TestBed.createComponent(BookingLineDialogComponent);
    const component = fixture.componentInstance;
    spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    return { fixture, component };
  }

  function fillDates(component: BookingLineDialogComponent) {
    component.form.patchValue({ fromDate: '2026-07-01', untilDate: '2026-07-08', price: 500 });
  }

  beforeEach(() => {
    allowed = new Set(['ACCOMMODATION_CREATE', 'SUPPLIER_CREATE']);
    dialogResult = { key: 'N', name: 'Nieuw' };
  });

  it('een gekoppelde leverancier wordt vanzelf gekozen', () => {
    const { component } = setup([{ accommodationId: 'a-1', supplierId: 's-1' }]);

    component.form.patchValue({ accommodationId: 'a-1' });
    component.onAccommodationChange();

    expect(component.form.value.supplierId).toBe('s-1');
    expect(component.unlinked()).toBeFalse();
  });

  it('nieuwe accommodatie: aanmaken, kiezen en (zonder leverancier) de leverancierkeuze tonen', () => {
    const { component } = setup([]);

    component.createAccommodation();

    expect(accommodationService.create).toHaveBeenCalledOnceWith({ key: 'N', name: 'Nieuw' });
    expect(component.accommodations().map(a => a.accommodationId)).toContain('a-new');
    expect(component.form.value.accommodationId).toBe('a-new');
    expect(component.unlinked()).toBeTrue();
    expect(component.resolvedSuppliers().map(s => s.supplierId)).toEqual(['s-1', 's-2']);
  });

  it('nieuwe accommodatie: annuleren maakt niets aan', () => {
    const { component } = setup([]);
    dialogResult = undefined;

    component.createAccommodation();

    expect(accommodationService.create).not.toHaveBeenCalled();
  });

  it('nieuwe leverancier: aanmaken en kiezen', () => {
    const { component } = setup([]);
    component.form.patchValue({ accommodationId: 'a-1' });
    component.onAccommodationChange();
    dialogResult = { key: 'NS', name: 'Nieuwe lev' };

    component.createSupplier();

    expect(supplierService.create).toHaveBeenCalledOnceWith({ key: 'NS', name: 'Nieuwe lev' });
    expect(component.form.value.supplierId).toBe('s-new');
    expect(component.resolvedSuppliers().map(s => s.supplierId)).toContain('s-new');
  });

  it('opslaan met een nog niet gekoppelde leverancier legt eerst de koppeling vast', () => {
    const { component } = setup([]);
    component.form.patchValue({ accommodationId: 'a-1' });
    component.onAccommodationChange();
    component.form.patchValue({ supplierId: 's-2' });
    fillDates(component);

    component.onSubmit();

    expect(accSupplierService.create).toHaveBeenCalledOnceWith({ accommodationId: 'a-1', supplierId: 's-2' });
    expect(bookingLineService.create).toHaveBeenCalledWith(jasmine.objectContaining({
      bookingId: 'bk-1', accommodationId: 'a-1', supplierId: 's-2', price: 500,
    }));
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('opslaan met een al gekoppelde leverancier maakt geen nieuwe koppeling', () => {
    const { component } = setup([{ accommodationId: 'a-1', supplierId: 's-1' }]);
    component.form.patchValue({ accommodationId: 'a-1' });
    component.onAccommodationChange();
    fillDates(component);

    component.onSubmit();

    expect(accSupplierService.create).not.toHaveBeenCalled();
    expect(bookingLineService.create).toHaveBeenCalled();
  });

  it('een mislukte koppeling voorkomt dat de regel wordt aangemaakt', () => {
    const { component } = setup([]);
    component.form.patchValue({ accommodationId: 'a-1' });
    component.onAccommodationChange();
    component.form.patchValue({ supplierId: 's-2' });
    fillDates(component);
    accSupplierService.create.and.returnValue(throwError(() => new Error('nee')));

    component.onSubmit();

    expect(bookingLineService.create).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBeFalse();
  });

  it('zonder ACCOMMODATION_CREATE/SUPPLIER_CREATE zijn de "Nieuw"-knoppen verborgen', () => {
    allowed = new Set();
    const { fixture, component } = setup([]);
    component.form.patchValue({ accommodationId: 'a-1' });
    component.onAccommodationChange();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.new-accommodation-btn')).toBeNull();
    expect(fixture.nativeElement.querySelector('.new-supplier-btn')).toBeNull();
  });
});
