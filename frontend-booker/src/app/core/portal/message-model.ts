import { PortalDocument, PortalMessage } from '../../shared/models/portal.models';

/** Eén regel in de lijst "Berichten en documenten": een verzonden e-mail of een document, op datum gemengd. */
export type MessageItem =
  | { kind: 'email'; id: string; title: string; date: string; message: PortalMessage }
  | { kind: 'document'; id: string; title: string; date: string; document: PortalDocument };

export type MessageFilter = 'all' | 'email' | 'document';

export const MESSAGE_FILTERS: MessageFilter[] = ['all', 'email', 'document'];

/** Zoveel regels staan er standaard; de rest is op te vragen met "Toon alle". */
export const INITIAL_MESSAGES_VISIBLE = 6;

/** Mails en documenten in één lijst, nieuwste eerst. Betalingen staan hier bewust niet in: die hebben een eigen kaart. */
export function buildMessageItems(messages: PortalMessage[], documents: PortalDocument[]): MessageItem[] {
  const items: MessageItem[] = [
    ...messages.map((message): MessageItem => ({
      kind: 'email', id: message.messageId, title: message.subject, date: message.createdAt, message,
    })),
    ...documents.map((document): MessageItem => ({
      kind: 'document', id: document.documentId, title: document.displayname, date: document.createdAt, document,
    })),
  ];
  return items.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));
}

export function filterMessageItems(items: MessageItem[], filter: MessageFilter): MessageItem[] {
  return filter === 'all' ? items : items.filter((item) => item.kind === filter);
}
