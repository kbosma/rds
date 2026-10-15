import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { Router, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { of, throwError } from 'rxjs';
import { AccommodationListComponent } from './accommodation-list.component';
import { AccommodationService } from './accommodation.service';
import { AccommodationSupplierService } from './accommodation-supplier.service';
import { AccommodationAddressService } from './accommodation-address.service';
import { AddressService } from './address.service';
import { SupplierAddressService } from './supplier-address.service';
import { SupplierService } from '../suppliers/supplier.service';

describe('AccommodationListComponent', () => {
  let component: AccommodationListComponent;
  let fixture: ComponentFixture<AccommodationListComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let confirmSpy: jasmine.SpyObj<ConfirmService>;
  let accommodationServiceStub: { getAll: () => unknown; delete: jasmine.Spy };

  const mockAccommodations = [
    { accommodationId: 'a-1', key: 'ACC-DUB-001', name: 'Dubrovnik Suite', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
    { accommodationId: 'a-2', key: 'ACC-SPL-001', name: 'Split Appartement', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
  ];
  const mockSuppliers = [
    { supplierId: 's-1', key: 'SUP-HR', name: 'Hotel Adriatic', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
  ];
  const mockAccSuppliers = [{ accommodationId: 'a-1', supplierId: 's-1' }];
  const mockAddresses = [
    { addressId: 'addr-1', street: 'Ulica Frana', housenumber: 5, housenumberAddition: null, postalcode: '20000', city: 'Dubrovnik', country: 'Kroatie', addressrole: 'accommodatie', createdAt: '', createdBy: '', modifiedAt: '', modifiedBy: '', tenantOrganization: '' },
  ];
  const mockAccAddresses = [{ accommodationId: 'a-1', addressId: 'addr-1' }];
  const mockSupAddresses = [{ supplierId: 's-1', addressId: 'addr-1' }];

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['hasAuthority']);
    authSpy.hasAuthority.and.returnValue(true);
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm', 'confirmDelete']);
    accommodationServiceStub = { getAll: () => of(mockAccommodations), delete: jasmine.createSpy('delete').and.returnValue(of(void 0)) };
    await TestBed.configureTestingModule({
      imports: [AccommodationListComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AccommodationService, useValue: accommodationServiceStub },
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
        { provide: AccommodationSupplierService, useValue: { getAll: () => of(mockAccSuppliers) } },
        { provide: SupplierService, useValue: { getAll: () => of(mockSuppliers) } },
        { provide: AccommodationAddressService, useValue: { getAll: () => of(mockAccAddresses) } },
        { provide: AddressService, useValue: { getAll: () => of(mockAddresses) } },
        { provide: SupplierAddressService, useValue: { getAll: () => of(mockSupAddresses) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccommodationListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load and enrich accommodation data via forkJoin', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.allViews().length).toBe(2);
    expect(component.loading()).toBe(false);

    // Eerste accommodatie moet gekoppelde supplier hebben
    const dubrovnik = component.allViews().find(v => v.accommodation.accommodationId === 'a-1');
    expect(dubrovnik?.supplierName).toBe('Hotel Adriatic');
    expect(dubrovnik?.addressLine).toContain('Dubrovnik');

    // Tweede heeft geen koppeling
    const split = component.allViews().find(v => v.accommodation.accommodationId === 'a-2');
    expect(split?.supplierName).toBeNull();
  }));

  it('should filter by accommodation name', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const event = { target: { value: 'dubrovnik' } as HTMLInputElement } as unknown as Event;
    component.applyFilter(event);

    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].accommodation.name).toBe('Dubrovnik Suite');
  }));

  it('should filter by supplier name', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const event = { target: { value: 'adriatic' } as HTMLInputElement } as unknown as Event;
    component.applyFilter(event);

    expect(component.filtered().length).toBe(1);
  }));

  it('should reset filter on empty input', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    // Eerst filteren
    component.applyFilter({ target: { value: 'dubrovnik' } as HTMLInputElement } as unknown as Event);
    expect(component.filtered().length).toBe(1);

    // Dan leeg maken
    component.applyFilter({ target: { value: '' } as HTMLInputElement } as unknown as Event);
    expect(component.filtered().length).toBe(2);
  }));

  describe('actie-iconen', () => {
    const buttons = (cls: string) => fixture.nativeElement.querySelectorAll('button.' + cls);
    const load = () => { fixture.detectChanges(); tick(); fixture.detectChanges(); };

    it('toont een tabel met per regel inzien, bewerken en verwijderen (ACCOMMODATION_READ/UPDATE/DELETE)', fakeAsync(() => {
      load();

      expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(2);
      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(2);
      expect(buttons('action-delete').length).toBe(2);
      for (const a of ['ACCOMMODATION_READ', 'ACCOMMODATION_UPDATE', 'ACCOMMODATION_DELETE']) {
        expect(authSpy.hasAuthority).toHaveBeenCalledWith(a);
      }
    }));

    it('verbergt iconen zonder de bijbehorende authority', fakeAsync(() => {
      authSpy.hasAuthority.and.callFake((a: string) => a === 'ACCOMMODATION_READ');
      fixture = TestBed.createComponent(AccommodationListComponent);
      component = fixture.componentInstance;
      load();

      expect(buttons('action-view').length).toBe(2);
      expect(buttons('action-edit').length).toBe(0);
      expect(buttons('action-delete').length).toBe(0);
    }));

    it('inzien opent het detail-dialoog met de gegevens van de regel', fakeAsync(() => {
      load();
      const open = spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open');

      component.openDetails(component.filtered()[0]);

      const data = (open.calls.mostRecent().args[1] as { data: { accommodation: { accommodationId: string } } }).data;
      expect(data.accommodation.accommodationId).toBe('a-1');
    }));

    it('bewerken gaat naar de bewerkpagina van die accommodatie', fakeAsync(() => {
      load();
      const navigate = spyOn((component as unknown as { router: Router }).router, 'navigate');

      component.editAccommodation(component.filtered()[1]);

      expect(navigate).toHaveBeenCalledWith(['/accommodations', 'a-2']);
    }));

    it('verwijderen: bevestiging met waarschuwing, daarna de service en de regel verdwijnt', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(true));

      component.deleteAccommodation(component.filtered()[0]);
      tick();

      expect(confirmSpy.confirmDelete).toHaveBeenCalled();
      expect(accommodationServiceStub.delete).toHaveBeenCalledWith('a-1');
      expect(component.filtered().map(v => v.accommodation.accommodationId)).toEqual(['a-2']);
      expect(component.allViews().length).toBe(1);
    }));

    it('verwijderen: geweigerde bevestiging laat alles staan', fakeAsync(() => {
      load();
      confirmSpy.confirmDelete.and.returnValue(Promise.resolve(false));

      component.deleteAccommodation(component.filtered()[0]);
      tick();

      expect(accommodationServiceStub.delete).not.toHaveBeenCalled();
      expect(component.filtered().length).toBe(2);
    }));

    it('paginering: toont maximaal één pagina tegelijk', fakeAsync(() => {
      load();
      component.pageSize.set(1);

      expect(component.paged().length).toBe(1);
      component.onPage({ pageIndex: 1, pageSize: 1, length: 2 });
      expect(component.paged()[0].accommodation.accommodationId).toBe('a-2');
    }));
  });

  it('should handle forkJoin errors gracefully', fakeAsync(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AccommodationListComponent, NoopAnimationsModule],
      providers: [
        provideTranslateService(), // deze test reset de TestBed en verliest de globale provider
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: ConfirmService, useValue: confirmSpy },
        { provide: AccommodationService, useValue: { getAll: () => throwError(() => new Error('fail')) } },
        { provide: AccommodationSupplierService, useValue: { getAll: () => of([]) } },
        { provide: SupplierService, useValue: { getAll: () => of([]) } },
        { provide: AccommodationAddressService, useValue: { getAll: () => of([]) } },
        { provide: AddressService, useValue: { getAll: () => of([]) } },
        { provide: SupplierAddressService, useValue: { getAll: () => of([]) } },
      ],
    });
    fixture = TestBed.createComponent(AccommodationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    // De component vangt de fout af: loading terug naar false en geen verrijkte data.
    expect(component.loading()).toBe(false);
    expect(component.allViews().length).toBe(0);
  }));
});
