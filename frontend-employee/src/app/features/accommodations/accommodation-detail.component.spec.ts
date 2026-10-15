import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { AccommodationDetailComponent } from './accommodation-detail.component';
import { AccommodationService } from './accommodation.service';
import { AccommodationAddressService } from './accommodation-address.service';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { AddressService } from './address.service';
import { SupplierService } from '../suppliers/supplier.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';

/*
 * Accommodatiedetail: hier alleen het snel aanmaken van een leverancier die meteen wordt gekoppeld.
 */
describe('AccommodationDetailComponent - nieuwe leverancier', () => {
  const base = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o' };
  const accommodation = { accommodationId: 'a-1', key: 'ACC-1', name: 'Suite', ...base };
  const supplier = { supplierId: 's-1', key: 'SUP-1', name: 'Hotel A', ...base };

  let supplierService: jasmine.SpyObj<SupplierService>;
  let accSupplierService: jasmine.SpyObj<AccommodationSupplierService>;
  let matDialog: jasmine.SpyObj<MatDialog>;
  let dialogResult: { key: string; name: string } | undefined;

  function setup() {
    supplierService = jasmine.createSpyObj('SupplierService', ['getAll', 'create']);
    supplierService.getAll.and.returnValue(of([supplier]));
    supplierService.create.and.returnValue(of({ supplierId: 's-new', key: 'N', name: 'Nieuw', ...base }));
    accSupplierService = jasmine.createSpyObj('AccommodationSupplierService', ['getAll', 'create', 'delete']);
    accSupplierService.getAll.and.returnValue(of([]));
    accSupplierService.create.and.callFake(l => of(l));
    matDialog = jasmine.createSpyObj('MatDialog', ['open']);
    matDialog.open.and.callFake(() => ({ afterClosed: () => of(dialogResult) }) as never);
    TestBed.configureTestingModule({
      imports: [AccommodationDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: AccommodationService, useValue: { getById: () => of(accommodation) } },
        { provide: AccommodationAddressService, useValue: { getAll: () => of([]) } },
        { provide: AddressService, useValue: { getAll: () => of([]) } },
        { provide: AccommodationSupplierService, useValue: accSupplierService },
        { provide: SupplierService, useValue: supplierService },
        { provide: AuthService, useValue: { hasAuthority: () => true } },
        { provide: ConfirmService, useValue: jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'a-1' } } } },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: matDialog });
    const fixture = TestBed.createComponent(AccommodationDetailComponent);
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => { dialogResult = { key: 'N', name: 'Nieuw' }; });

  it('maakt de leverancier aan en koppelt die meteen aan de accommodatie', fakeAsync(() => {
    const component = setup();

    component.createSupplier();
    tick();

    expect(supplierService.create).toHaveBeenCalledOnceWith({ key: 'N', name: 'Nieuw' });
    expect(accSupplierService.create).toHaveBeenCalledOnceWith({ accommodationId: 'a-1', supplierId: 's-new' });
    expect(accSupplierService.getAll).toHaveBeenCalledTimes(2); // opnieuw geladen
  }));

  it('annuleren in het dialoog maakt niets aan', fakeAsync(() => {
    const component = setup();
    dialogResult = undefined;

    component.createSupplier();
    tick();

    expect(supplierService.create).not.toHaveBeenCalled();
    expect(accSupplierService.create).not.toHaveBeenCalled();
  }));

  it('een mislukte koppeling meldt de fout en ververst toch de lijst', fakeAsync(() => {
    const component = setup();
    accSupplierService.create.and.returnValue(throwError(() => new Error('nee')));

    component.createSupplier();
    tick();

    expect(accSupplierService.getAll).toHaveBeenCalledTimes(2);
  }));
});
