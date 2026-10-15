import { deleteErrorKey } from './delete-error';

describe('deleteErrorKey', () => {
  it('geeft de "geschiedenis blijft bewaard"-melding bij een 409', () => {
    expect(deleteErrorKey({ status: 409 })).toBe('common.deleteBlocked');
  });

  it('geeft de algemene melding bij elke andere fout', () => {
    for (const error of [{ status: 500 }, { status: 403 }, new Error('x'), null, undefined]) {
      expect(deleteErrorKey(error)).toBe('common.deleteError');
    }
  });
});
