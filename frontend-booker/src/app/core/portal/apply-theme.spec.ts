import { applyTheme } from './apply-theme';
import { PortalOrganization } from '../../shared/models/portal.models';

describe('applyTheme', () => {
  const org = (overrides: Partial<PortalOrganization> = {}): PortalOrganization => ({
    name: 'Puurkroatie', primaryColor: '#1976d2', accentColor: '#ff9800', cardTitleColor: null, logoUrl: null, ...overrides,
  });
  let root: HTMLElement;

  beforeEach(() => { root = document.createElement('div'); });

  it('zet de kleuren van de organisatie', () => {
    applyTheme(org({ cardTitleColor: '#112233' }), root);

    expect(root.style.getPropertyValue('--theme-primary')).toBe('#1976d2');
    expect(root.style.getPropertyValue('--theme-accent')).toBe('#ff9800');
    expect(root.style.getPropertyValue('--theme-card-title')).toBe('#112233');
  });

  it('laat de standaardkleur staan als een kleur ontbreekt', () => {
    applyTheme(org(), root);

    expect(root.style.getPropertyValue('--theme-card-title')).toBe('');
  });

  it('neemt alleen geldige hexkleuren over', () => {
    applyTheme(org({ primaryColor: 'red; background:url(x)', accentColor: '#12345' }), root);

    expect(root.style.getPropertyValue('--theme-primary')).toBe('');
    expect(root.style.getPropertyValue('--theme-accent')).toBe('');
  });

  it('herstelt de standaardkleuren bij opruimen', () => {
    const undo = applyTheme(org(), root);

    undo();

    expect(root.style.getPropertyValue('--theme-primary')).toBe('');
    expect(root.style.getPropertyValue('--theme-accent')).toBe('');
  });

  it('doet niets zonder organisatie', () => {
    const undo = applyTheme(null, root);

    expect(root.getAttribute('style')).toBeNull();
    expect(() => undo()).not.toThrow();
  });
});
