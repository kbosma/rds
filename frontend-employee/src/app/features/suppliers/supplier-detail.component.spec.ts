import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { SupplierDetailComponent } from './supplier-detail.component';
import { SupplierService } from './supplier.service';
import { SupplierAddressService } from '../accommodations/supplier-address.service';
import { AddressService } from '../accommodations/address.service';
import { AccommodationService } from '../accommodations/accommodation.service';
import { AccommodationSupplierService } from '../accommodations/accommodation-supplier.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Supplier } from '../../shared/models';

/*
 * De leveranciersdetailpagina: gegevens, adressen en gekoppelde accommodaties; nieuw, bewerken of
 * alleen-inzien (?readonly=true).
 */
describe('SupplierDetailComponent', () => {
  const base = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'o' };
  const supplier = { supplierId: 's-1', key: 'SUP-HR', name: 'Hotel Adriatic', ...base };
  const address = { addressId: 'ad-1', street: 'Ulica', housenumber: 5, housenumberAddition: 'b', postalcode: '2000', city: 'Split', country: 'HR', addressrole: 'leverancier', ...base };
  const otherAddress = { ...address, addressId: 'ad-9', street: 'Andere' };
  const accommodations = [
    { accommodationId: 'a-1', key: 'ACC-1', name: 'Suite', ...base },
    { accommodationId: 'a-2', key: 'ACC-2', name: 'Villa', ...base },
  ];

  let supplierService: jasmine.SpyObj<SupplierService>;
  let supplierAddressService: jasmine.SpyObj<SupplierAddressService>;
  let addressService: jasmine.SpyObj<AddressService>;
  let accommodationSupplierService: jasmine.SpyObj<AccommodationSupplierService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let accommodationService: jasmine.SpyObj<AccommodationService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let dialogResult: { key: string; name: string } | undefined;
  let authAllowed: Set<string> | 'all';

  function setup(id: string | null, readonly: string | null = null) {
    supplierService = jasmine.createSpyObj('SupplierService', ['getById', 'create', 'update']);
    supplierService.getById.and.returnValue(of(supplier));
    supplierService.create.and.returnValue(of({ ...supplier, supplierId: 's-new' }));
    supplierService.update.and.callFake((_id, body) => of({ ...supplier, ...body } as unknown as Supplier));
    supplierAddressService = jasmine.createSpyObj('SupplierAddressService', ['getAll', 'create', 'delete']);
    supplierAddressService.getAll.and.returnValue(of([{ supplierId: 's-1', addressId: 'ad-1' }, { supplierId: 's-2', addressId: 'ad-9' }]));
    supplierAddressService.create.and.returnValue(of({ supplierId: 's-1', addressId: 'ad-new' }));
    supplierAddressService.delete.and.returnValue(of(void 0));
    addressService = jasmine.createSpyObj('AddressService', ['getAll', 'create', 'update', 'delete']);
    addressService.getAll.and.returnValue(of([address, otherAddress]));
    addressService.create.and.returnValue(of({ ...address, addressId: 'ad-new' }));
    addressService.update.and.returnValue(of(address));
    addressService.delete.and.returnValue(of(void 0));
    accommodationSupplierService = jasmine.createSpyObj('AccommodationSupplierService', ['getAll', 'create', 'delete']);
    accommodationSupplierService.getAll.and.returnValue(of([{ accommodationId: 'a-1', supplierId: 's-1' }]));
    accommodationSupplierService.create.and.returnValue(of({ accommodationId: 'a-2', supplierId: 's-1' }));
    accommodationSupplierService.delete.and.returnValue(of(void 0));
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    accommodationService = jasmine.createSpyObj('AccommodationService', ['getAll', 'create']);
    accommodationService.getAll.and.returnValue(of(accommodations));
    accommodationService.create.and.returnValue(of({ accommodationId: 'a-new', key: 'NEW', name: 'Nieuw', ...base }));
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.callFake(() => ({ afterClosed: () => of(dialogResult) }) as never);
    const auth = { hasAuthority: (a: string) => authAllowed === 'all' || authAllowed.has(a) };

    TestBed.configureTestingModule({
      imports: [SupplierDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: SupplierService, useValue: supplierService },
        { provide: SupplierAddressService, useValue: supplierAddressService },
        { provide: AddressService, useValue: addressService },
        { provide: AccommodationService, useValue: accommodationService },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: AccommodationSupplierService, useValue: accommodationSupplierService },
        { provide: AuthService, useValue: auth },
        { provide: ConfirmService, useValue: confirmSpy },
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: { get: () => id },
          queryParamMap: { get: (k: string) => (k === 'readonly' ? readonly : null) },
        } } },
      ],
    });
    const fixture = TestBed.createComponent(SupplierDetailComponent);
    const component = fixture.componentInstance;
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate');
    const snack = spyOn((component as unknown as { snackBar: MatSnackBar }).snackBar, 'open');
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    return { fixture, component, navigate, snack };
  }

  beforeEach(() => { authAllowed = 'all'; dialogResult = { key: 'NEW', name: 'Nieuw' }; });

  describe('bestaande leverancier', () => {
    it('toont gegevens, alleen de eigen adressen en de gekoppelde accommodaties', fakeAsync(() => {
      const { component } = setup('s-1');

      expect(component.supplierForm.getRawValue()).toEqual({ key: 'SUP-HR', name: 'Hotel Adriatic' });
      expect(component.addresses().map(a => a.addressId)).toEqual(['ad-1']); // niet het adres van s-2
      expect(component.linkedAccommodations().map(a => a.accommodationId)).toEqual(['a-1']);
      expect(component.availableAccommodations().map(a => a.accommodationId)).toEqual(['a-2']);
    }));

    it('opslaan werkt de leverancier bij met behoud van de overige velden', fakeAsync(() => {
      const { component } = setup('s-1');
      component.supplierForm.patchValue({ name: 'Nieuwe naam' });

      component.onSaveSupplier();
      tick();

      expect(supplierService.update).toHaveBeenCalledOnceWith('s-1', jasmine.objectContaining({
        supplierId: 's-1', key: 'SUP-HR', name: 'Nieuwe naam', tenantOrganization: 'o',
      }));
      expect(component.currentName()).toBe('Nieuwe naam');
    }));

    it('een onbekende leverancier stuurt terug naar de lijst', fakeAsync(() => {
      supplierService = jasmine.createSpyObj('SupplierService', ['getById']);
      TestBed.resetTestingModule();
      authAllowed = 'all';
      // opnieuw opzetten met een getById die faalt
      TestBed.configureTestingModule({
        imports: [SupplierDetailComponent, NoopAnimationsModule],
        providers: [
          provideTranslateService(), // resetTestingModule verliest de globale provider
          { provide: SupplierService, useValue: { getById: () => throwError(() => new Error('404')) } },
          { provide: SupplierAddressService, useValue: { getAll: () => of([]) } },
          { provide: AddressService, useValue: { getAll: () => of([]) } },
          { provide: AccommodationService, useValue: { getAll: () => of([]) } },
          { provide: AccommodationSupplierService, useValue: { getAll: () => of([]) } },
          { provide: AuthService, useValue: { hasAuthority: () => true } },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'x' }, queryParamMap: { get: () => null } } } },
        ],
      });
      const fixture = TestBed.createComponent(SupplierDetailComponent);
      const navigate = spyOn(TestBed.inject(Router), 'navigate');
      fixture.detectChanges();
      tick();

      expect(navigate).toHaveBeenCalledWith(['/suppliers']);
    }));
  });

  describe('nieuwe leverancier', () => {
    it('toont alleen het formulier (nog geen adressen of accommodaties) en maakt aan', fakeAsync(() => {
      const { fixture, component, navigate } = setup(null);
      expect(component.isNew()).toBe(true);
      expect(fixture.nativeElement.querySelector('.add-address-btn')).toBeNull();

      component.supplierForm.setValue({ key: 'SUP-X', name: 'Nieuw' });
      component.onSaveSupplier();
      tick();

      expect(supplierService.create).toHaveBeenCalledOnceWith({ key: 'SUP-X', name: 'Nieuw' });
      expect(navigate).toHaveBeenCalledWith(['/suppliers', 's-new']);
    }));

    it('weigert opslaan zonder code en naam', fakeAsync(() => {
      const { component } = setup(null);

      component.onSaveSupplier();

      expect(supplierService.create).not.toHaveBeenCalled();
    }));
  });

  describe('alleen inzien', () => {
    it('schakelt het formulier uit en verbergt alle wijzig-knoppen', fakeAsync(() => {
      const { fixture, component } = setup('s-1', 'true');

      expect(component.readOnly()).toBe(true);
      expect(component.supplierForm.disabled).toBe(true);
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('button[type="submit"]')).toBeNull();
      for (const cls of ['.add-address-btn', '.edit-address-btn', '.delete-address-btn', '.link-btn', '.unlink-btn']) {
        expect(el.querySelector(cls)).withContext(cls).toBeNull();
      }
      expect(el.textContent).toContain('Ulica'); // maar de gegevens zijn wel zichtbaar
    }));

    it('opslaan en alle wijzigingen doen niets', fakeAsync(() => {
      const { component } = setup('s-1', 'true');

      component.onSaveSupplier();
      component.onSaveAddress();
      component.linkAccommodation();
      component.deleteAddress(address);
      component.unlinkAccommodation(accommodations[0]);
      tick();

      expect(supplierService.update).not.toHaveBeenCalled();
      expect(addressService.create).not.toHaveBeenCalled();
      expect(accommodationSupplierService.create).not.toHaveBeenCalled();
      expect(addressService.delete).not.toHaveBeenCalled();
      expect(accommodationSupplierService.delete).not.toHaveBeenCalled();
    }));
  });

  describe('rechten', () => {
    it('zonder SUPPLIER_UPDATE zijn er geen wijzig-knoppen', fakeAsync(() => {
      authAllowed = new Set(['SUPPLIER_READ']);
      const { component } = setup('s-1');

      expect(component.canManage()).toBe(false);
      expect(component.canLinkAccommodations()).toBe(false);
    }));

    it('accommodaties koppelen vraagt ook ACCOMMODATION_CREATE en _DELETE', fakeAsync(() => {
      authAllowed = new Set(['SUPPLIER_UPDATE']);
      const { component } = setup('s-1');

      expect(component.canManage()).toBe(true);
      expect(component.canLinkAccommodations()).toBe(false);
    }));
  });

  describe('adressen', () => {
    it('nieuw adres: aanmaken én aan de leverancier koppelen, daarna de lijst verversen', fakeAsync(() => {
      const { component } = setup('s-1');
      component.startAddAddress();
      expect(component.addressForm.value.addressrole).toBe('leverancier');
      component.addressForm.patchValue({ street: 'Nieuwe straat', housenumber: 12, postalcode: '1000', city: 'Zagreb', country: 'HR' });

      component.onSaveAddress();
      tick();

      expect(addressService.create).toHaveBeenCalledWith(jasmine.objectContaining({ street: 'Nieuwe straat', housenumber: 12, addressrole: 'leverancier' }));
      expect(supplierAddressService.create).toHaveBeenCalledWith({ supplierId: 's-1', addressId: 'ad-new' });
      expect(component.showAddressForm()).toBe(false);
    }));

    it('adres bewerken werkt het bestaande adres bij (geen nieuwe koppeling)', fakeAsync(() => {
      const { component } = setup('s-1');
      component.startEditAddress(address);
      component.addressForm.patchValue({ city: 'Zadar' });

      component.onSaveAddress();
      tick();

      expect(addressService.update).toHaveBeenCalledWith('ad-1', jasmine.objectContaining({ city: 'Zadar' }));
      expect(supplierAddressService.create).not.toHaveBeenCalled();
    }));

    it('adres verwijderen: bevestigen, ontkoppelen, dan het adres zelf verwijderen', fakeAsync(() => {
      const { component } = setup('s-1');
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));

      component.deleteAddress(address);
      tick();

      expect(supplierAddressService.delete).toHaveBeenCalledWith('s-1', 'ad-1');
      expect(addressService.delete).toHaveBeenCalledWith('ad-1');
    }));

    it('adres verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
      const { component } = setup('s-1');
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.deleteAddress(address);
      tick();

      expect(supplierAddressService.delete).not.toHaveBeenCalled();
    }));

    it('een ongeldig adresformulier wordt niet opgeslagen', fakeAsync(() => {
      const { component } = setup('s-1');
      component.startAddAddress();

      component.onSaveAddress();

      expect(addressService.create).not.toHaveBeenCalled();
    }));

    it('formatAddress zet straat, nummer en toevoeging samen', fakeAsync(() => {
      const { component } = setup('s-1');

      expect(component.formatAddress(address)).toBe('Ulica 5b');
    }));
  });

  describe('accommodaties koppelen', () => {
    it('koppelen: legt de koppeling en ververst de lijsten', fakeAsync(() => {
      const { component } = setup('s-1');
      component.accommodationControl.setValue('a-2');

      component.linkAccommodation();
      tick();

      expect(accommodationSupplierService.create).toHaveBeenCalledWith({ accommodationId: 'a-2', supplierId: 's-1' });
      expect(component.accommodationControl.value).toBeNull();
    }));

    it('koppelen zonder keuze doet niets', fakeAsync(() => {
      const { component } = setup('s-1');

      component.linkAccommodation();

      expect(accommodationSupplierService.create).not.toHaveBeenCalled();
    }));

    it('ontkoppelen: bevestigen en de koppeling verwijderen', fakeAsync(() => {
      const { component } = setup('s-1');
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));

      component.unlinkAccommodation(accommodations[0] as never);
      tick();

      expect(accommodationSupplierService.delete).toHaveBeenCalledWith('a-1', 's-1');
    }));

    it('nieuwe accommodatie: aanmaken en meteen aan de leverancier koppelen', fakeAsync(() => {
      const { component } = setup('s-1');

      component.createAccommodation();
      tick();

      expect(accommodationService.create).toHaveBeenCalledOnceWith({ key: 'NEW', name: 'Nieuw' });
      expect(accommodationSupplierService.create).toHaveBeenCalledOnceWith({ accommodationId: 'a-new', supplierId: 's-1' });
    }));

    it('nieuwe accommodatie: annuleren in het dialoog maakt niets aan', fakeAsync(() => {
      const { component } = setup('s-1');
      dialogResult = undefined;

      component.createAccommodation();
      tick();

      expect(accommodationService.create).not.toHaveBeenCalled();
      expect(accommodationSupplierService.create).not.toHaveBeenCalled();
    }));

    it('nieuwe accommodatie: zonder de accommodatie-authorities gebeurt er niets', fakeAsync(() => {
      authAllowed = new Set(['SUPPLIER_UPDATE']);
      const { component } = setup('s-1');

      component.createAccommodation();
      tick();

      expect(dialogSpy.open).not.toHaveBeenCalled();
    }));

    it('een mislukte koppeling meldt de fout', fakeAsync(() => {
      const { component, snack } = setup('s-1');
      accommodationSupplierService.create.and.returnValue(throwError(() => new Error('nee')));
      component.accommodationControl.setValue('a-2');

      component.linkAccommodation();
      tick();

      expect(snack).toHaveBeenCalled();
    }));
  });
});
