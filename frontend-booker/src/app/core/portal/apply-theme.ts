import { PortalOrganization } from '../../shared/models/portal.models';

const HEX = /^#[0-9a-fA-F]{6}$/;

const VARIABLES: [keyof Pick<PortalOrganization, 'primaryColor' | 'accentColor' | 'cardTitleColor'>, string][] = [
  ['primaryColor', '--theme-primary'],
  ['accentColor', '--theme-accent'],
  ['cardTitleColor', '--theme-card-title'],
];

/**
 * Zet de huisstijl van de organisatie op het document. Alleen geldige hexkleuren worden overgenomen (de server
 * valideert dat ook, maar kleuren komen uit data en horen nooit ongecontroleerd in een stijl). Geeft een functie
 * terug die de standaardkleuren herstelt.
 */
export function applyTheme(organization: PortalOrganization | null, root: HTMLElement = document.documentElement): () => void {
  const applied: string[] = [];
  if (organization) {
    for (const [field, variable] of VARIABLES) {
      const value = organization[field];
      if (value && HEX.test(value)) {
        root.style.setProperty(variable, value);
        applied.push(variable);
      }
    }
  }
  return () => applied.forEach((variable) => root.style.removeProperty(variable));
}
