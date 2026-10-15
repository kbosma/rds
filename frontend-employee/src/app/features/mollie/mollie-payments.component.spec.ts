import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MolliePaymentsComponent } from './mollie-payments.component';
import { MolliePaymentService } from './mollie-payment.service';
import { MolliePayment } from '../../shared/models';

describe('MolliePaymentsComponent', () => {
  let component: MolliePaymentsComponent;
  let fixture: ComponentFixture<MolliePaymentsComponent>;
  let serviceSpy: jasmine.SpyObj<MolliePaymentService>;

  const mockPayments: MolliePayment[] = [
    {
      molliePaymentId: 'mp-1', molliePaymentExternalId: 'tr_001',
      method: 'ideal', amount: 2450, currency: 'EUR', description: 'Betaling 1',
      checkoutUrl: '', createdAt: '2026-04-11T10:00:00', createdBy: 'u-1',
      modifiedAt: '2026-04-11T10:00:00', modifiedBy: 'u-1', tenantOrganization: 'o-1',
    },
    {
      molliePaymentId: 'mp-2', molliePaymentExternalId: 'tr_002',
      method: null, amount: 1875.50, currency: 'EUR', description: 'Betaling 2',
      checkoutUrl: 'https://checkout', createdAt: '2026-04-16T09:00:00', createdBy: 'u-1',
      modifiedAt: '2026-04-16T09:00:00', modifiedBy: 'u-1', tenantOrganization: 'o-1',
    },
  ];

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('MolliePaymentService', ['getAll', 'getStatusEntries']);
    serviceSpy.getAll.and.returnValue(of(mockPayments));
    // mp-1 betaald (2450), mp-2 open (1875.50) → paid=2450, open=1875.50
    serviceSpy.getStatusEntries.and.callFake((id: string) =>
      of([{
        molliePaymentStatusEntryId: 'se-' + id, molliePaymentId: id,
        status: id === 'mp-1' ? 'paid' : 'open',
        createdAt: '2026-04-11T10:00:00', createdBy: null, modifiedAt: null, modifiedBy: null,
      }]));

    await TestBed.configureTestingModule({
      imports: [MolliePaymentsComponent, NoopAnimationsModule],
      providers: [
        { provide: MolliePaymentService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b-1' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MolliePaymentsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load payments and calculate amounts on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.payments().length).toBe(2);
    expect(component.totalAmount()).toBe(4325.50);
    expect(component.paidAmount()).toBe(2450);
    expect(component.openAmount()).toBe(1875.50);
    expect(component.loading()).toBe(false);
  }));

  it('should render payment rows in the table', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    // Eén hoofd-datarij per betaling (detailrijen hebben class 'detail-row' en tellen niet mee)
    const dataRows = fixture.nativeElement.querySelectorAll('tr.clickable-row');
    expect(dataRows.length).toBe(2);

    // en beide betalingen tonen hun gegevens
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('tr_001');
    expect(text).toContain('Betaling 1');
    expect(text).toContain('tr_002');
    expect(text).toContain('Betaling 2');
  }));

  it('should handle errors gracefully', fakeAsync(() => {
    serviceSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(MolliePaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();

    expect(component.loading()).toBe(false);
    expect(component.payments().length).toBe(0);
  }));
});