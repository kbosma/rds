import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SupplierListComponent } from './supplier-list.component';
import { SupplierService } from './supplier.service';
import { SupplierAddressService } from '../accommodations/supplier-address.service';
import { AddressService } from '../accommodations/address.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';

/*
 * De leverancierslijst is een tabel met per regel inzien / bewerken / verwijderen (authorities
 * SUPPLIER_READ / UPDATE / DELETE); inzien en bewerken gebeuren in een dialoog.
 */
describe('SupplierListComponent', () => {
  let fixture: ComponentFixture<SupplierListComponent>;
  let component: SupplierListComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let supplierServiceSpy: jasmine.SpyObj<SupplierService>;

  const base = { createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' };
  const suppliers = [
    { supplierId: 's-1', key: 'SUP-HR', name: 'Hotel Adriatic', ...base },
    { supplierId: 's-2', key: 'SUP-SI', name: 'Villa Bled', ...base },
  ];
  const addresses = [
    { addressId: 'ad-1', street: 'Ulica', housenumber: 5, housenumberAddition: 'b', postalcode: '1', city: 'Split', country: 'HR', addressrole: 'leverancier', ...base },
  ];

  const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
  const router = () => (component as unknown as { router: Router }).router;
  const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    supplierServiceSpy = jasmine.createSpyObj('SupplierService', ['getAll', 'delete']);
    supplierServiceSpy.getAll.and.returnValue(of(suppliers));

    await TestBed.configureTestingModule({
      imports: [SupplierListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: SupplierService, useValue: supplierServiceSpy },
        { provide: SupplierAddressService, useValue: { getAll: () => of([{ supplierId: 's-1', addressId: 'ad-1' }]) } },
        { provide: AddressService, useValue: { getAll: () => of(addresses) } },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplierListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toont de leveranciers als tabelregels met adres', fakeAsync(() => {
    load();

    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Hotel Adriatic');
    expect(component.allViews()[0].addressLine).toBe('Ulica 5b Split');
    expect(component.allViews()[1].addressLine).toBeNull();
  }));

  it('toont per regel de drie iconen met SUPPLIER_READ/UPDATE/DELETE', fakeAsync(() => {
    load();

    expect(buttons('action-view').length).toBe(2);
    expect(buttons('action-edit').length).toBe(2);
    expect(buttons('action-delete').length).toBe(2);
    for (const a of ['SUPPLIER_READ', 'SUPPLIER_UPDATE', 'SUPPLIER_DELETE', 'SUPPLIER_CREATE']) {
      expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
    }
  }));

  it('verbergt iconen en de nieuw-knop zonder de bijbehorende authorities', fakeAsync(() => {
    authSpy.hasAuthority.and.returnValue(false);
    fixture = TestBed.createComponent(SupplierListComponent);
    component = fixture.componentInstance;
    load();

    expect(buttons('action-view').length).toBe(0);
    expect(buttons('action-edit').length).toBe(0);
    expect(buttons('action-delete').length).toBe(0);
    expect(buttons('new-btn').length).toBe(0);
  }));

  it('filtert op naam en code', fakeAsync(() => {
    load();

    component.applyFilter({ target: { value: 'bled' } } as unknown as Event);
    expect(component.filtered().map(v => v.supplier.supplierId)).toEqual(['s-2']);

    component.applyFilter({ target: { value: 'sup-hr' } } as unknown as Event);
    expect(component.filtered().map(v => v.supplier.supplierId)).toEqual(['s-1']);
  }));

  it('inzien opent de detailpagina alleen-lezen', fakeAsync(() => {
    load();
    const navigate = spyOn(router(), 'navigate');

    component.viewSupplier(suppliers[0]);

    expect(navigate).toHaveBeenCalledWith(['/suppliers', 's-1'], { queryParams: { readonly: 'true' } });
  }));

  it('bewerken opent de detailpagina', fakeAsync(() => {
    load();
    const navigate = spyOn(router(), 'navigate');

    component.editSupplier(suppliers[1]);

    expect(navigate).toHaveBeenCalledWith(['/suppliers', 's-2']);
  }));

  it('nieuw opent de detailpagina voor een nieuwe leverancier', fakeAsync(() => {
    load();
    const navigate = spyOn(router(), 'navigate');

    component.newSupplier();

    expect(navigate).toHaveBeenCalledWith(['/suppliers', 'new']);
  }));

  it('de regel zelf is niet klikbaar', fakeAsync(() => {
    load();
    const navigate = spyOn(router(), 'navigate');

    (fixture.nativeElement.querySelector('tr.mat-mdc-row') as HTMLElement).click();

    expect(navigate).not.toHaveBeenCalled();
  }));

  it('verwijderen: bevestiging (met waarschuwing), service en daarna een verse lijst', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    supplierServiceSpy.delete.and.returnValue(of(void 0));
    supplierServiceSpy.getAll.calls.reset();

    component.deleteSupplier(suppliers[0]);
    tick();

    expect(confirmSpy.confirmDelete.calls.mostRecent().args[0]).toContain('Hotel Adriatic');
    expect(supplierServiceSpy.delete).toHaveBeenCalledWith('s-1');
    expect(supplierServiceSpy.getAll).toHaveBeenCalledTimes(1);
  }));

  it('verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

    component.deleteSupplier(suppliers[0]);
    tick();

    expect(supplierServiceSpy.delete).not.toHaveBeenCalled();
  }));

  it('verwijderen: een serverfout laat de lijst ongewijzigd', fakeAsync(() => {
    load();
    confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));
    supplierServiceSpy.delete.and.returnValue(throwError(() => new Error('nee')));
    supplierServiceSpy.getAll.calls.reset();

    component.deleteSupplier(suppliers[0]);
    tick();

    expect(supplierServiceSpy.getAll).not.toHaveBeenCalled();
    expect(component.allViews().length).toBe(2);
  }));

  it('paginering toont maximaal één pagina tegelijk', fakeAsync(() => {
    load();
    component.pageSize.set(1);

    expect(component.paged().length).toBe(1);
    component.onPage({ pageIndex: 1, pageSize: 1, length: 2 });
    expect(component.paged()[0].supplier.supplierId).toBe('s-2');
  }));
});
