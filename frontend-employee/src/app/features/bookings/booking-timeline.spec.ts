import { Document, MolliePayment, SentEmail } from '../../shared/models';
import { buildTimeline, documentFormat } from './booking-timeline';

describe('booking-timeline', () => {
  const email = { sentEmailId: 'e-1', createdAt: '2026-10-12T14:05:00' } as SentEmail;
  const doc = { documentId: 'd-1', createdAt: '2026-10-10T09:00:00' } as Document;
  const payment = { molliePaymentId: 'p-1', createdAt: '2026-10-19T14:00:00' } as MolliePayment;

  it('zet e-mails, documenten en betalingen op één lijst, nieuwste bovenaan', () => {
    const items = buildTimeline([email], [doc], [payment]);

    expect(items.map((i) => i.kind)).toEqual(['payment', 'email', 'document']);
    expect(items.map((i) => i.id)).toEqual(['p-1', 'e-1', 'd-1']);
  });

  it('geeft een lege lijst zonder gegevens', () => {
    expect(buildTimeline([], [], [])).toEqual([]);
  });

  it('toont het formaat van een document aan de hand van het mimetype', () => {
    expect(documentFormat('application/pdf')).toBe('PDF');
    expect(documentFormat('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('Word');
    expect(documentFormat('image/png')).toBe('');
    expect(documentFormat(null)).toBe('');
  });
});
