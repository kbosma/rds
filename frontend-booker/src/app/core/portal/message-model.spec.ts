import { DOCUMENTS, MESSAGES } from '../../testing/portal-fixtures';
import { buildMessageItems, filterMessageItems } from './message-model';

describe('message-model', () => {
  it('zet mails en documenten door elkaar, nieuwste eerst', () => {
    const items = buildMessageItems(MESSAGES, DOCUMENTS);

    expect(items.map((i) => i.id)).toEqual(['m3', 'm2', 'd2', 'd1', 'm1']);
    expect(items.map((i) => i.kind)).toEqual(['email', 'email', 'document', 'document', 'email']);
  });

  it('geeft elke regel de titel en datum van zijn bron', () => {
    const [first] = buildMessageItems(MESSAGES, []);

    expect(first.title).toBe('Betaalverzoek restbedrag');
    expect(first.date).toBe('2026-10-18T08:00:00');
  });

  it('zet bij dezelfde datum documenten voor e-mails, zodat de volgorde vast ligt', () => {
    const stamp = '2026-10-12T10:00:00';
    const items = buildMessageItems([{ ...MESSAGES[0], createdAt: stamp }], [{ ...DOCUMENTS[0], createdAt: stamp }]);

    expect(items.map((i) => i.kind)).toEqual(['document', 'email']);
  });

  it('is leeg zonder berichten en documenten', () => {
    expect(buildMessageItems([], [])).toEqual([]);
  });

  it('filtert op soort', () => {
    const items = buildMessageItems(MESSAGES, DOCUMENTS);

    expect(filterMessageItems(items, 'all').length).toBe(5);
    expect(filterMessageItems(items, 'email').map((i) => i.id)).toEqual(['m3', 'm2', 'm1']);
    expect(filterMessageItems(items, 'document').map((i) => i.id)).toEqual(['d2', 'd1']);
  });
});
