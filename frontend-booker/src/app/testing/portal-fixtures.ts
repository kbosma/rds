import { Provider } from '@angular/core';
import { of } from 'rxjs';
import { PortalService } from '../core/portal/portal.service';
import { PORTAL_NOW, PORTAL_REDIRECT, PORTAL_SAVE_FILE } from '../core/portal/portal.tokens';
import { PortalStore } from '../core/portal/portal.store';
import {
  PortalActivity, PortalDocument, PortalMessage, PortalMessageContent, PortalOverview, PortalPayment, PortalPaymentStatus,
  PortalStay,
} from '../shared/models/portal.models';

/** Een vaste "nu": zondag 20 juni 2027, 11:00, op dag 9 van een reis van 12 t/m 26 juni. */
export const NOW = new Date(2027, 5, 20, 11, 0);

export const OVERVIEW: PortalOverview = {
  booking: { bookingNumber: 'BK-2026-001', status: 'voorschot', fromDate: '2027-06-12', untilDate: '2027-06-26', totalSum: 3850 },
  booker: { firstname: 'Klaas' },
  travelers: [{ firstname: 'Klaas' }, { firstname: 'Marieke' }],
  organization: { name: 'Puurkroatie', primaryColor: '#1976d2', accentColor: '#ff9800', cardTitleColor: null, logoUrl: null },
};

export const STAYS: PortalStay[] = [
  { bookingLineId: 'l1', accommodationName: 'Villa Marina', supplierName: 'Adria Stays', fromDate: '2027-06-12', untilDate: '2027-06-19' },
  { bookingLineId: 'l2', accommodationName: 'Hotel Hvar Bay', supplierName: 'Hvar Hotels', fromDate: '2027-06-19', untilDate: '2027-06-26' },
];

export const ACTIVITIES: PortalActivity[] = [
  { activityId: 'a1', name: 'Kajaktour Split', description: null, fromDate: '2027-06-14T09:30:00', untilDate: '2027-06-14T12:00:00', location: 'Marina Kaštela', activityType: 'TOUR' },
  { activityId: 'a2', name: 'Dagtrip Krka', description: null, fromDate: '2027-06-16T08:00:00', untilDate: '2027-06-16T17:00:00', location: 'Hotelreceptie', activityType: 'EXCURSIE' },
  { activityId: 'a3', name: 'Veerboot Split-Hvar', description: null, fromDate: '2027-06-19T11:00:00', untilDate: '2027-06-19T12:30:00', location: 'Haven Split', activityType: 'TRANSFER' },
  { activityId: 'a4', name: 'Eilandhoppen Pakleni', description: null, fromDate: '2027-06-20T10:00:00', untilDate: '2027-06-20T16:00:00', location: 'Haven Hvar', activityType: 'EXCURSIE' },
  { activityId: 'a5', name: 'Transfer luchthaven', description: null, fromDate: '2027-06-26T09:00:00', untilDate: '2027-06-26T10:00:00', location: 'Hotel Hvar Bay', activityType: 'TRANSFER' },
];

export const PAYMENTS: PortalPayment[] = [
  { molliePaymentId: 'p1', description: 'Voorschot', amount: 1650, currency: 'EUR', method: 'ideal', currentStatus: 'paid', createdAt: '2026-10-12T10:00:00' },
  { molliePaymentId: 'p2', description: 'Restbetaling', amount: 2200, currency: 'EUR', method: null, currentStatus: 'open', createdAt: '2026-10-14T10:00:00' },
];

export const STATUSES: PortalPaymentStatus[] = [
  { molliePaymentId: 'p1', status: 'open', createdAt: '2026-10-12T10:00:00' },
  { molliePaymentId: 'p1', status: 'paid', createdAt: '2026-10-12T10:15:00' },
  { molliePaymentId: 'p2', status: 'open', createdAt: '2026-10-14T10:00:00' },
];

export const DOCUMENTS: PortalDocument[] = [
  { documentId: 'd1', displayname: 'Reisbevestiging.pdf', mimeType: 'application/pdf', size: 184320, createdAt: '2026-10-12T10:30:00' },
  { documentId: 'd2', displayname: 'Voucher.pdf', mimeType: 'application/pdf', size: 0, createdAt: '2026-10-14T09:00:00' },
];

export const MESSAGES: PortalMessage[] = [
  { messageId: 'm1', subject: 'Bevestiging van uw boeking', fromAddress: 'noreply@puurkroatie.nl', resent: false, createdAt: '2026-10-12T10:20:00' },
  { messageId: 'm2', subject: 'Betaalverzoek restbedrag', fromAddress: 'noreply@puurkroatie.nl', resent: false, createdAt: '2026-10-15T08:00:00' },
  { messageId: 'm3', subject: 'Betaalverzoek restbedrag', fromAddress: 'noreply@puurkroatie.nl', resent: true, createdAt: '2026-10-18T08:00:00' },
];

export const MESSAGE_CONTENT: PortalMessageContent = { ...MESSAGES[0], bodyHtml: '<p>Beste Klaas, uw boeking is bevestigd.</p>' };

export type PortalServiceSpy = jasmine.SpyObj<PortalService>;

/** Een PortalService waarvan elke aanroep standaard de vaste gegevens hierboven oplevert. */
export function portalServiceSpy(): PortalServiceSpy {
  const spy = jasmine.createSpyObj<PortalService>('PortalService', [
    'getOverview', 'getStays', 'getActivities', 'getPayments', 'getPaymentStatuses', 'getDocuments',
    'getMessages', 'getMessage', 'downloadDocument', 'initiatePayment',
  ]);
  spy.getOverview.and.returnValue(of(OVERVIEW));
  spy.getStays.and.returnValue(of(STAYS));
  spy.getActivities.and.returnValue(of(ACTIVITIES));
  spy.getPayments.and.returnValue(of(PAYMENTS));
  spy.getPaymentStatuses.and.returnValue(of(STATUSES));
  spy.getDocuments.and.returnValue(of(DOCUMENTS));
  spy.getMessages.and.returnValue(of(MESSAGES));
  spy.getMessage.and.returnValue(of(MESSAGE_CONTENT));
  spy.downloadDocument.and.returnValue(of(new Blob(['pdf'])));
  spy.initiatePayment.and.returnValue(of({ id: 'tr_1', status: 'open', _links: { checkout: { href: 'https://mollie.test/pay' } } }));
  return spy;
}

export interface StoreSetup {
  service: PortalServiceSpy;
  redirect: jasmine.Spy;
  saveFile: jasmine.Spy;
  providers: Provider[];
}

/** De providers om de store (en de componenten die hem gebruiken) in een test te laten draaien. */
export function storeSetup(now: Date = NOW, service: PortalServiceSpy = portalServiceSpy()): StoreSetup {
  const redirect = jasmine.createSpy('redirect');
  const saveFile = jasmine.createSpy('saveFile');
  return {
    service, redirect, saveFile,
    providers: [
      PortalStore,
      { provide: PortalService, useValue: service },
      { provide: PORTAL_NOW, useValue: () => now },
      { provide: PORTAL_REDIRECT, useValue: redirect },
      { provide: PORTAL_SAVE_FILE, useValue: saveFile },
    ],
  };
}
