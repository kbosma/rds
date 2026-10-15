
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BookerDialogComponent, BookerDialogData } from './booker-dialog.component';
import { BookerService } from './booker.service';
import { BookerAddressService } from './booker-address.service';
import { AddressService } from '../accommodations/address.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { Address, Booker } from '../../shared/models';

/*
 * BookerDialogComponent bewerkt een booker. Voor een prospect (status 'prospect')
 * verschijnt de 'Maak boeker'-knop, die de status op 'active' zet. We verifiëren
 * die promotie en dat gewoon opslaan de status niet wijzigt.
 */
describe('BookerDialogComponent', () => {
  let serviceSpy: jasmine.SpyObj<BookerService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BookerDialogComponent>>;
  let bookerAddressService: jasmine.SpyObj<BookerAddressService>;
  let addressService: jasmine.SpyObj<AddressService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let allowed: Set<string>;

  const prospect: Booker = {
    bookerId: 'p-1', status: 'prospect',
    firstname: 'Pros', prefix: '', lastname: 'Pect', callsign: '', telephone: '',
    emailaddress: 'pros@example.com', gender: '', birthdate: '', initials: '',
    createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1',
  };
  const base = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: 'org-1' };
  const address: Address = { addressId: 'ad-1', street: 'Straat', housenumber: 1, housenumberAddition: null, postalcode: '1000', city: 'Amsterdam', country: 'NL', addressrole: 'woon', ...base } as Address;
  const otherAddress: Address = { ...address, addressId: 'ad-9', street: 'Andere' };

  function setup(booker: Booker | undefined, readOnly = false) {
    serviceSpy = jasmine.createSpyObj('BookerService', ['update', 'create']);
    serviceSpy.update.and.returnValue(of(booker ?? prospect));
    serviceSpy.create.and.returnValue(of({ ...prospect, bookerId: 'b-new', status: 'active' }));
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    bookerAddressService = jasmine.createSpyObj('BookerAddressService', ['getAll', 'create', 'delete']);
    bookerAddressService.getAll.and.returnValue(of([{ bookerId: 'p-1', addressId: 'ad-1' }, { bookerId: 'x', addressId: 'ad-9' }]));
    bookerAddressService.create.and.callFake(l => of(l));
    bookerAddressService.delete.and.returnValue(of(void 0));
    addressService = jasmine.createSpyObj('AddressService', ['getAll', 'create', 'update', 'delete']);
    addressService.getAll.and.returnValue(of([address, otherAddress]));
    addressService.create.and.returnValue(of({ ...address, addressId: 'ad-new' }));
    addressService.update.and.returnValue(of(address));
    addressService.delete.and.returnValue(of(void 0));
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [BookerDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: BookerService, useValue: serviceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { booker, readOnly } as BookerDialogData },
        { provide: BookerAddressService, useValue: bookerAddressService },
        { provide: AddressService, useValue: addressService },
        { provide: ConfirmService, useValue: confirmSpy },
        { provide: AuthService, useValue: { hasAuthority: (a: string) => allowed.has(a) } },
      ],
    });

    const fixture = TestBed.createComponent(BookerDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => { allowed = new Set(['BOOKING_UPDATE']); });

  it('should create', () => {
    const { component } = setup(prospect);
    expect(component).toBeTruthy();
  });

  it('makeBooker() should set status to "active" and close with true', () => {
    const { component } = setup(prospect);

    component.makeBooker();

    expect(serviceSpy.update).toHaveBeenCalledWith('p-1', jasmine.objectContaining({ status: 'active' }));
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('onSubmit() should save without changing the status', () => {
    const { component } = setup(prospect);

    component.onSubmit();

    expect(serviceSpy.update).toHaveBeenCalledTimes(1);
    const payload = serviceSpy.update.calls.mostRecent().args[1] as Partial<Booker>;
    expect(payload.status).toBeUndefined();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  describe('nieuwe booker (aanmaakmodus)', () => {
    it('maakt een actieve booker aan en sluit met de aangemaakte booker', () => {
      const { component, fixture } = setup(undefined);
      component.form.patchValue({ firstname: 'Nieuw', lastname: 'Persoon', emailaddress: 'nieuw@example.com' });

      component.onSubmit();

      expect(serviceSpy.update).not.toHaveBeenCalled();
      expect(serviceSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ firstname: 'Nieuw', status: 'active' }));
      expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({ bookerId: 'b-new' }));
      expect(fixture.nativeElement.querySelector('app-address-editor')).toBeNull(); // adressen pas na het aanmaken
    });

    it('slaat een ongeldig formulier niet op', () => {
      const { component } = setup(undefined);

      component.onSubmit();

      expect(serviceSpy.create).not.toHaveBeenCalled();
    });
  });

  describe('adressen', () => {
    it('toont alleen de adressen van deze booker', () => {
      const { component, fixture } = setup(prospect);

      expect(component.addresses().map(a => a.addressId)).toEqual(['ad-1']);
      expect(fixture.nativeElement.textContent).toContain('Straat 1');
      expect(fixture.nativeElement.textContent).not.toContain('Andere');
    });

    it('nieuw adres: aanmaken én aan de booker koppelen, daarna de lijst verversen', fakeAsync(() => {
      const { component } = setup(prospect);

      component.createAddress({ street: 'Nieuw', addressrole: 'woon' });
      tick();

      expect(addressService.create).toHaveBeenCalledWith({ street: 'Nieuw', addressrole: 'woon' });
      expect(bookerAddressService.create).toHaveBeenCalledOnceWith({ bookerId: 'p-1', addressId: 'ad-new' });
      expect(bookerAddressService.getAll).toHaveBeenCalledTimes(2);
    }));

    it('adres bewerken werkt het adres bij en maakt geen nieuwe koppeling', fakeAsync(() => {
      const { component } = setup(prospect);

      component.updateAddress('ad-1', { city: 'Rotterdam' });
      tick();

      expect(addressService.update).toHaveBeenCalledOnceWith('ad-1', { city: 'Rotterdam' });
      expect(bookerAddressService.create).not.toHaveBeenCalled();
    }));

    it('adres verwijderen: bevestigen, ontkoppelen, dan het adres zelf verwijderen', fakeAsync(() => {
      const { component } = setup(prospect);

      component.removeAddress(address);
      tick();

      expect(bookerAddressService.delete).toHaveBeenCalledOnceWith('p-1', 'ad-1');
      expect(addressService.delete).toHaveBeenCalledOnceWith('ad-1');
    }));

    it('adres verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
      const { component } = setup(prospect);
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.removeAddress(address);
      tick();

      expect(bookerAddressService.delete).not.toHaveBeenCalled();
      expect(addressService.delete).not.toHaveBeenCalled();
    }));

    it('een mislukte koppeling laat het adres niet verweesd achter in de lijst', fakeAsync(() => {
      const { component } = setup(prospect);
      bookerAddressService.create.and.returnValue(throwError(() => new Error('nee')));

      component.createAddress({ street: 'Nieuw' });
      tick();

      expect(bookerAddressService.getAll).toHaveBeenCalledTimes(1); // geen verversing na de fout
    }));

    it('beheerknoppen verschijnen met BOOKING_UPDATE', () => {
      expect(setup(prospect).component.canManageAddresses()).toBeTrue();
    });

    it('zonder BOOKING_UPDATE zijn er geen beheerknoppen', () => {
      allowed = new Set();
      expect(setup(prospect).component.canManageAddresses()).toBeFalse();
    });

    it('in alleen-inzien zijn er geen beheerknoppen', () => {
      expect(setup(prospect, true).component.canManageAddresses()).toBeFalse();
    });
  });

  it('alleen-inzien: opslaan doet niets', () => {
    const { component } = setup(prospect, true);

    component.onSubmit();
    component.makeBooker();

    expect(serviceSpy.update).not.toHaveBeenCalled();
    expect(component.form.disabled).toBeTrue();
  });
});
