import { Document, MolliePayment, SentEmail } from '../../shared/models';

export type TimelineKind = 'email' | 'document' | 'payment';

export type TimelineItem =
  | { kind: 'email'; id: string; at: string; source: SentEmail }
  | { kind: 'document'; id: string; at: string; source: Document }
  | { kind: 'payment'; id: string; at: string; source: MolliePayment };

/** Eén lijst van e-mails, documenten en betalingen van een boeking, nieuwste bovenaan. */
export function buildTimeline(emails: SentEmail[], documents: Document[], payments: MolliePayment[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...emails.map((source): TimelineItem => ({ kind: 'email', id: source.sentEmailId, at: source.createdAt, source })),
    ...documents.map((source): TimelineItem => ({ kind: 'document', id: source.documentId, at: source.createdAt, source })),
    ...payments.map((source): TimelineItem => ({ kind: 'payment', id: source.molliePaymentId, at: source.createdAt, source })),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** Korte typeaanduiding voor een document, afgeleid van het mimetype. */
export function documentFormat(mimeType: string | null | undefined): string {
  const type = (mimeType ?? '').toLowerCase();
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word')) return 'Word';
  return '';
}
