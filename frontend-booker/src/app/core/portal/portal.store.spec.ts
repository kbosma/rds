import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ACTIVITIES, DOCUMENTS, MESSAGES, NOW, OVERVIEW, PAYMENTS, portalServiceSpy, storeSetup } from '../../testing/portal-fixtures';
import { PortalPayment } from '../../shared/models/portal.models';
import { PortalStore } from './portal.store';

const PAY_KEY = 'rds_booker_pay_started';

/** De opeenvolgende antwoorden van getPayments; daarna blijft het laatste antwoord gelden. */
function respondWith(service: ReturnType<typeof portalServiceSpy>, ...responses: Observable<PortalPayment[]>[]): void {
  let calls = 0;
  service.getPayments.and.callFake(() => responses[Math.min(calls++, responses.length - 1)]);
}

describe('PortalStore', () => {
  beforeEach(() => sessionStorage.removeItem(PAY_KEY));
  afterEach(() => sessionStorage.removeItem(PAY_KEY));

  function create(now: Date = NOW, service = portalServiceSpy()) {
    const setup = storeSetup(now, service);
    TestBed.configureTestingModule({ providers: setup.providers });
    const store = TestBed.inject(PortalStore);
    return { store, ...setup };
  }

  describe('laden', () => {
    it('haalt bij init alles op en meldt klaar', () => {
      const { store, service } = create();

      store.init();

      for (const call of [service.getOverview, service.getStays, service.getActivities, service.getPayments,
        service.getPaymentStatuses, service.getDocuments, service.getMessages]) {
        expect(call).toHaveBeenCalledTimes(1);
      }
      expect(store.overview.status()).toBe('ready');
      expect(store.scheduleStatus()).toBe('ready');
      expect(store.staysList().length).toBe(2);
    });

    it('laat een kaart die faalt de rest niet meenemen', () => {
      const service = portalServiceSpy();
      service.getDocuments.and.returnValue(throwError(() => new Error('boom')));
      const { store } = create(NOW, service);

      store.init();

      expect(store.documents.status()).toBe('error');
      expect(store.payments.status()).toBe('ready');
      expect(store.overview.status()).toBe('ready');
    });

    it('maakt de planning een fout als een van de drie bronnen faalt, en laadt als er nog een laadt', () => {
      const service = portalServiceSpy();
      service.getStays.and.returnValue(throwError(() => new Error('boom')));
      const { store } = create(NOW, service);

      expect(store.scheduleStatus()).toBe('loading');
      store.init();
      expect(store.scheduleStatus()).toBe('error');
    });

    it('laadt één onderdeel opnieuw', () => {
      const { store, service } = create();
      store.init();

      store.reload('documents');

      expect(service.getDocuments).toHaveBeenCalledTimes(2);
      expect(service.getOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe('de reis', () => {
    it('rekent tijdens de reis de dag, de lengte en de nachten uit', () => {
      const { store } = create();
      store.init();

      expect(store.phase()).toBe('during');
      expect(store.tripDay()).toBe(9);
      expect(store.tripLengthDays()).toBe(15);
      expect(store.nights()).toBe(14);
      expect(store.nightsLeft()).toBe(6);
      expect(store.daysUntilDeparture()).toBe(0);
    });

    it('telt voor de reis de dagen tot vertrek', () => {
      const { store } = create(new Date(2027, 5, 1, 9, 0));
      store.init();

      expect(store.phase()).toBe('before');
      expect(store.daysUntilDeparture()).toBe(11);
      expect(store.tripDay()).toBeNull();
      expect(store.nightsLeft()).toBeNull();
    });

    it('herkent na de reis dat die voorbij is', () => {
      const { store } = create(new Date(2027, 6, 5));
      store.init();

      expect(store.phase()).toBe('after');
      expect(store.nextUp()).toEqual({ current: null, next: null, following: null });
    });

    it('valt terug op de verblijven als de boeking zelf geen datums heeft', () => {
      const service = portalServiceSpy();
      service.getOverview.and.returnValue(of({ ...OVERVIEW, booking: { ...OVERVIEW.booking, fromDate: null, untilDate: null } }));
      const { store } = create(NOW, service);

      store.init();

      expect(store.tripStart()?.getDate()).toBe(12);
      expect(store.tripEnd()?.getDate()).toBe(26);
      expect(store.phase()).toBe('during');
    });

    it('kent geen fase zonder datums en zonder verblijven', () => {
      const service = portalServiceSpy();
      service.getOverview.and.returnValue(of({ ...OVERVIEW, booking: { ...OVERVIEW.booking, fromDate: null, untilDate: null } }));
      service.getStays.and.returnValue(of([]));
      const { store } = create(NOW, service);

      store.init();

      expect(store.phase()).toBe('unknown');
      expect(store.timeline().days).toEqual([]);
      expect(store.nights()).toBeNull();
    });

    it('geeft de voortgang van de status', () => {
      const { store } = create();
      store.init();

      expect(store.statusStep()).toBe(3);
    });

    it('bepaalt wat nu bezig is en wat eerstvolgend is', () => {
      const { store } = create();
      store.init();

      expect(store.nextUp().current?.label).toBe('Eilandhoppen Pakleni');
      expect(store.nextUp().next?.label).toBe('Hotel Hvar Bay');
    });

    it('geeft de activiteiten op volgorde, ook als de server ze door elkaar stuurt', () => {
      const service = portalServiceSpy();
      service.getActivities.and.returnValue(of([...ACTIVITIES].reverse()));
      const { store } = create(NOW, service);

      store.init();

      expect(store.activitiesList().map((a) => a.activityId)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    });
  });

  describe('betalingen en documenten', () => {
    it('rekent de totalen en weet wat betaald kan worden', () => {
      const { store } = create();
      store.init();

      expect(store.paymentSummary().open).toBe(2200);
      expect(store.payable().map((p) => p.molliePaymentId)).toEqual(['p2']);
      expect(store.openPayable()).toBe(2200);
    });

    it('geeft de datum van de laatste statusregel', () => {
      const { store } = create();
      store.init();

      expect(store.statusDate('p1')).toBe('2026-10-12T10:15:00');
      expect(store.statusDate('onbekend')).toBeNull();
    });

    it('zet de documenten met de nieuwste bovenaan', () => {
      const { store } = create();
      store.init();

      expect(store.documentList().map((d) => d.documentId)).toEqual(['d2', 'd1']);
    });
  });

  describe('berichten en documenten', () => {
    it('zet e-mails en documenten in één lijst, nieuwste eerst', () => {
      const { store } = create();
      store.init();

      expect(store.messageItems().map((i) => `${i.kind}:${i.id}`)).toEqual([
        'email:m3', 'email:m2', 'document:d2', 'document:d1', 'email:m1',
      ]);
      expect(store.messageCounts()).toEqual({ all: 5, email: 3, document: 2 });
    });

    it('neemt betalingen niet op in de lijst', () => {
      const { store } = create();
      store.init();

      expect(store.messageItems().every((i) => i.kind === 'email' || i.kind === 'document')).toBeTrue();
    });

    it('filtert op soort en begint dan weer bij de eerste regels', () => {
      const { store } = create();
      store.init();
      store.showAllMessages.set(true);

      store.setMessageFilter('document');

      expect(store.visibleMessageItems().map((i) => i.id)).toEqual(['d2', 'd1']);
      expect(store.showAllMessages()).toBeFalse();

      store.setMessageFilter('email');
      expect(store.visibleMessageItems().map((i) => i.id)).toEqual(['m3', 'm2', 'm1']);
    });

    it('toont eerst zes regels en de rest na "toon alle"', () => {
      const many = Array.from({ length: 9 }, (_, i) => ({ ...MESSAGES[0], messageId: `x${i}`, createdAt: `2026-11-0${i + 1}T10:00:00` }));
      const service = portalServiceSpy();
      service.getMessages.and.returnValue(of(many));
      const { store } = create(NOW, service);
      store.init();

      expect(store.visibleMessageItems().length).toBe(6);
      expect(store.hiddenMessageCount()).toBe(5);
      expect(store.canCollapseMessages()).toBeFalse();

      store.showAllMessages.set(true);

      expect(store.visibleMessageItems().length).toBe(11);
      expect(store.hiddenMessageCount()).toBe(0);
      expect(store.canCollapseMessages()).toBeTrue();
    });

    it('meldt klaar zodra een van de twee bronnen klaar is en een fout alleen als beide falen', () => {
      const service = portalServiceSpy();
      service.getMessages.and.returnValue(throwError(() => new Error('boom')));
      const { store } = create(NOW, service);
      expect(store.messagesStatus()).toBe('loading');

      store.init();

      expect(store.messagesStatus()).toBe('ready');
      expect(store.messagesPartialError()).toBeTrue();
      expect(store.messageItems().map((i) => i.id)).toEqual(['d2', 'd1']);
    });

    it('meldt een fout als zowel de mails als de documenten falen', () => {
      const service = portalServiceSpy();
      service.getMessages.and.returnValue(throwError(() => new Error('boom')));
      service.getDocuments.and.returnValue(throwError(() => new Error('boom')));
      const { store } = create(NOW, service);

      store.init();

      expect(store.messagesStatus()).toBe('error');
      expect(store.messagesPartialError()).toBeFalse();
    });

    it('laadt alleen de bron opnieuw die mislukt was', () => {
      const service = portalServiceSpy();
      service.getMessages.and.returnValue(throwError(() => new Error('boom')));
      const { store } = create(NOW, service);
      store.init();
      service.getMessages.and.returnValue(of(MESSAGES));

      store.reloadMessages();

      expect(service.getDocuments).toHaveBeenCalledTimes(1);
      expect(service.getMessages).toHaveBeenCalledTimes(2);
      expect(store.messagesPartialError()).toBeFalse();
      expect(store.messageItems().length).toBe(5);
    });
  });

  describe('betalen', () => {
    it('start de betaling en stuurt de klant naar Mollie', () => {
      const { store, service, redirect } = create();
      store.init();

      store.pay(PAYMENTS[1]);

      expect(service.initiatePayment).toHaveBeenCalledWith('p2');
      expect(redirect).toHaveBeenCalledWith('https://mollie.test/pay');
      expect(sessionStorage.getItem(PAY_KEY)).toBe('1');
      expect(store.payingId()).toBe('p2');
    });

    it('start geen tweede betaling zolang er een bezig is', () => {
      const { store, service } = create();
      store.init();

      store.pay(PAYMENTS[1]);
      store.pay(PAYMENTS[1]);

      expect(service.initiatePayment).toHaveBeenCalledTimes(1);
    });

    it('meldt een fout als het starten mislukt en laat de klant opnieuw proberen', () => {
      const { store, service, redirect } = create();
      service.initiatePayment.and.returnValue(throwError(() => new Error('boom')));
      store.init();

      store.pay(PAYMENTS[1]);

      expect(store.payError()).toBeTrue();
      expect(store.payingId()).toBeNull();
      expect(redirect).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(PAY_KEY)).toBeNull();
    });

    it('meldt een fout als Mollie geen betaalpagina teruggeeft', () => {
      const { store, service, redirect } = create();
      service.initiatePayment.and.returnValue(of({ id: 'tr_1', status: 'open' }));
      store.init();

      store.pay(PAYMENTS[1]);

      expect(store.payError()).toBeTrue();
      expect(store.payingId()).toBeNull();
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('downloaden', () => {
    it('bewaart het bestand onder de naam van het document', () => {
      const { store, service, saveFile } = create();
      store.init();

      store.download(DOCUMENTS[0]);

      expect(service.downloadDocument).toHaveBeenCalledWith('d1');
      expect(saveFile).toHaveBeenCalledWith(jasmine.any(Blob), 'Reisbevestiging.pdf');
      expect(store.downloadingId()).toBeNull();
    });

    it('meldt een fout als het downloaden mislukt', () => {
      const { store, service, saveFile } = create();
      service.downloadDocument.and.returnValue(throwError(() => new Error('boom')));
      store.init();

      store.download(DOCUMENTS[0]);

      expect(store.downloadError()).toBeTrue();
      expect(saveFile).not.toHaveBeenCalled();
      expect(store.downloadingId()).toBeNull();
    });
  });

  describe('betaalstatus verversen', () => {
    const withStatus = (status: string): PortalPayment[] => PAYMENTS.map((p) => ({ ...p, currentStatus: status }));

    it('ververst na terugkeer van Mollie tot alles een eindstatus heeft', fakeAsync(() => {
      sessionStorage.setItem(PAY_KEY, '1');
      const service = portalServiceSpy();
      respondWith(service, of(PAYMENTS), of(withStatus('paid')));
      const { store } = create(NOW, service);

      store.init();
      expect(service.getPayments).toHaveBeenCalledTimes(1);

      tick(2500);
      expect(service.getPayments).toHaveBeenCalledTimes(2);
      expect(store.paymentList().every((p) => p.currentStatus === 'paid')).toBeTrue();

      tick(10000);
      expect(service.getPayments).toHaveBeenCalledTimes(2);
      expect(sessionStorage.getItem(PAY_KEY)).toBeNull();
    }));

    it('ververst niet als er niets te wachten is', fakeAsync(() => {
      const { store, service } = create();

      store.init();
      tick(30000);

      expect(service.getPayments).toHaveBeenCalledTimes(1);
    }));

    it('ververst zolang een betaling in behandeling is', fakeAsync(() => {
      const service = portalServiceSpy();
      respondWith(service, of([{ ...PAYMENTS[0] }, { ...PAYMENTS[1], currentStatus: 'pending' }]), of(withStatus('paid')));
      const { store } = create(NOW, service);

      store.init();
      tick(2500);

      expect(service.getPayments).toHaveBeenCalledTimes(2);
      expect(store.payable()).toEqual([]);
      discardPeriodicTasks();
    }));

    it('geeft het op na 13 pogingen', fakeAsync(() => {
      sessionStorage.setItem(PAY_KEY, '1');
      const { store, service } = create();

      store.init();
      tick(2500 * 40);

      expect(service.getPayments).toHaveBeenCalledTimes(1 + 13);
      discardPeriodicTasks();
    }));

    it('houdt de getoonde gegevens als een verversing mislukt', fakeAsync(() => {
      sessionStorage.setItem(PAY_KEY, '1');
      const service = portalServiceSpy();
      respondWith(service, of(PAYMENTS), throwError(() => new Error('boom')));
      const { store } = create(NOW, service);

      store.init();
      tick(2500);

      expect(store.payments.status()).toBe('ready');
      expect(store.paymentList().length).toBe(2);
      discardPeriodicTasks();
    }));
  });
});
