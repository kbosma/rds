// Neemt het beheerfilmpje op: huisstijl, personen en accounts, leveranciers, accommodaties, activiteiten en
// organisatie-instellingen van een reisorganisatie.
//
// Vooraf: dezelfde demo-omgeving als record.mjs (zie README.md), op een lege database met `npm run seed`.
// Buiten beeld zet dit script de huisstijl terug naar de standaardkleuren van RDS, zodat Sanne hem in beeld instelt.
//
//   npm run record:beheer           → demo-film/out/beheerfilmpje.webm
//   PACE=0.4 / HEADED=1 / SNAPSHOTS=1 werken net als bij record.mjs.

import { chromium } from 'playwright';
import { mkdir, rename, rm } from 'node:fs/promises';
import { api, login } from './lib/api.mjs';
import { Film } from './lib/film.mjs';

const EMPLOYEE = process.env.DEMO_EMPLOYEE_URL ?? 'http://localhost:4210';
const SIZE = { width: 1440, height: 900 };
const OUT_DIR = new URL('./out/beheer/', import.meta.url).pathname;
const MANAGER = { userName: 'sanne.visser', password: 'Demo-Zonnig-2027' };
// Het nieuwe account in het filmpje (verzonnen; alleen voor de demo-database).
const DAAN = { userName: 'daan.mulder', password: 'Welkom-Daan-2027', newPassword: 'Zonnig-Daan-2027!' };

const RDS_DEFAULT_THEME = { primaryColor: '#0e8f8a', accentColor: '#e0a100', cardTitleColor: '#12303b' };
const ZONNIG_THEME = { primaryColor: '#c2571a', accentColor: '#f2a541', cardTitleColor: '#8a3b10' };

const control = (scope, name) => scope.locator(`[formcontrolname="${name}"]`).first();
const navLink = (page, name) => page.getByRole('link', { name, exact: false }).first();
const cardTitled = (page, title) =>
  page.locator('mat-card').filter({ has: page.locator('mat-card-title').getByText(title, { exact: true }) });
const newButton = (page, text) => page.locator('main a, main button').filter({ hasText: text }).first();
const submit = (page) => page.locator('main button[type="submit"]').first();

async function main() {
  await resetThemeToDefault();

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const snapshotDir = process.env.SNAPSHOTS ? `${OUT_DIR}stills` : null;
  if (snapshotDir) await mkdir(snapshotDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chromium', headless: !process.env.HEADED });
  const context = await browser.newContext({
    viewport: SIZE, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', recordVideo: { dir: OUT_DIR, size: SIZE },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const film = new Film(page, { pace: Number(process.env.PACE ?? 1), snapshotDir });
  await film.setup();

  try {
    await scene0Intro(page, film);
    await scene1Theme(page, film);
    await scene2PersonAndAccount(page, film);
    await scene3Supplier(page, film);
    await scene4Accommodation(page, film);
    await scene5Activity(page, film);
    await scene6Settings(page, film);
    await scene7NewColleague(page, film);
    await film.unsay();
    await film.card('Klaar!', 'De organisatie staat klaar: huisstijl, collega’s, leveranciers, accommodaties, activiteiten '
      + 'en instellingen. Meer staat in de gebruikershandleiding.', 5000);
  } catch (err) {
    await page.screenshot({ path: `${OUT_DIR}fout.png` }).catch(() => {});
    throw err;
  } finally {
    await film.report(`${OUT_DIR}pauzes.txt`).catch(() => {});
    await context.close();
    await browser.close();
  }

  const out = new URL('./out/beheerfilmpje.webm', import.meta.url).pathname;
  await rename(await page.video().path(), out);
  console.log(`Klaar: ${out}`);
}

/** Buiten beeld: de huisstijl uit de seed terug naar de standaardkleuren, zodat het instellen in beeld zichtbaar is. */
async function resetThemeToDefault() {
  const token = await login(MANAGER);
  const [theme] = await api(token, 'GET', '/organization-themes');
  if (!theme) throw new Error('Geen huisstijl gevonden; draai eerst `npm run seed` op een lege database.');
  await api(token, 'PUT', `/organization-themes/${theme.organizationThemeId}`, {
    tenantOrganization: theme.tenantOrganization, logoUrl: null, ...RDS_DEFAULT_THEME,
  });
}

/** Een bestaand veld leegmaken en zichtbaar opnieuw typen. */
async function retype(film, locator, text, options) {
  await film.focus(locator);
  await locator.fill('');
  await film.wait(200);
  await locator.pressSequentially(String(text), { delay: Math.round((options?.delay ?? 70) * film.pace) });
  await film.wait(300);
}

async function loginAs(page, film, user, password) {
  await film.type(control(page, 'userName'), user);
  await film.type(control(page, 'password'), password, { delay: 30 });
  await film.click(page.getByRole('button', { name: /inloggen/i }));
}

// ---------------------------------------------------------------------------------------------------------------

async function scene0Intro(page, film) {
  await page.goto(`${EMPLOYEE}/login`);
  await film.card('Je organisatie inrichten', 'Huisstijl, collega’s, leveranciers, accommodaties, activiteiten en '
    + 'instellingen. Alle namen en gegevens in dit filmpje zijn verzonnen.', 5000);
  await film.say('Inloggen', 'Sanne is manager van Zonnige Reizen. Zij richt de organisatie in.', { minMs: 1200 });
  await loginAs(page, film, MANAGER.userName, MANAGER.password);
  await page.waitForURL('**/dashboard');
  await film.say('Menu', 'Alles voor het inrichten staat in het menu onder Organisatiebeheer. '
    + 'Je ziet alleen de onderdelen waar je rechten voor hebt.');
}

async function scene1Theme(page, film) {
  await film.card('1. Huisstijl', 'De kleuren van de app en het reisportaal, in de stijl van je eigen organisatie.');
  await film.click(navLink(page, 'Huisstijl'));
  await film.say('Huisstijl', 'RDS gebruikt nog de standaardkleuren. Sanne vult de kleuren van Zonnige Reizen in.');
  await retype(film, control(page, 'primaryColor'), ZONNIG_THEME.primaryColor);
  await retype(film, control(page, 'accentColor'), ZONNIG_THEME.accentColor);
  await retype(film, control(page, 'cardTitleColor'), ZONNIG_THEME.cardTitleColor);
  await film.say('Voorbeeld', 'Rechts zie je meteen hoe het eruitziet. Kiezen kan ook met het kleurvakje naast elk veld.');
  await film.click(submit(page));
  await film.wait(800);
  await film.say('Opgeslagen', 'Na het opslaan krijgt de hele app de nieuwe kleuren, voor iedereen van Zonnige Reizen.');
}

async function scene2PersonAndAccount(page, film) {
  await film.card('2. Een nieuwe collega', 'Eerst de persoon, dan een account om mee in te loggen, met een rol.');

  await film.click(navLink(page, 'Personen'));
  await film.say('Personen', 'Daan Mulder komt het team versterken. Sanne legt hem eerst vast als persoon.');
  await film.click(newButton(page, /nieuwe persoon/i));
  await film.type(control(page, 'firstname'), 'Daan');
  await film.type(control(page, 'lastname'), 'Mulder');
  await film.click(submit(page));
  await page.waitForURL('**/admin/persons');
  await film.say('Personen', 'Daan staat in de lijst. Hij hoort automatisch bij Zonnige Reizen.', { minMs: 1500 });

  await film.click(navLink(page, 'Accounts'));
  await film.say('Account', 'Nu een account, zodat Daan kan inloggen.');
  await film.click(newButton(page, /nieuw account/i));
  await film.type(control(page, 'userName'), DAAN.userName);
  await film.type(control(page, 'password'), DAAN.password, { delay: 30 });
  await film.choose(control(page, 'personId'), 'Daan Mulder');
  await film.say('Account', 'Met “Wachtwoord moet gewijzigd worden” kiest Daan straks zelf een nieuw wachtwoord.');
  const mustChange = page.getByRole('checkbox', { name: /wachtwoord/i });
  if (!(await mustChange.isChecked())) await film.click(mustChange);
  await film.click(submit(page));
  await page.waitForURL(/\/admin\/accounts\/[0-9a-f-]{36}/);
  await film.wait(800);

  await film.say('Rol', 'De rol bepaalt wat Daan mag. Hij wordt medewerker (EMPLOYEE): boekingen wel, beheer niet.');
  const roleRow = page.locator('.add-junction-row');
  await film.choose(roleRow.locator('mat-select'), 'EMPLOYEE');
  await film.click(roleRow.getByRole('button', { name: /toevoegen/i }));
  await film.wait(900);
  await film.say('Rol', 'Klaar: Daan heeft een account met de rol EMPLOYEE.', { minMs: 1500 });
}

async function scene3Supplier(page, film) {
  await film.card('3. Leveranciers', 'Bij wie je de verblijven inkoopt, met hun adres.');
  await film.click(navLink(page, 'Leveranciers'));
  await film.say('Leverancier', 'Zonnige Reizen gaat ook appartementen in Poreč verkopen, ingekocht bij Adriatic Homes.');
  await film.click(newButton(page, /nieuwe leverancier/i));
  await film.type(control(page, 'key'), 'ADRIATIC');
  await film.type(control(page, 'name'), 'Adriatic Homes d.o.o.');
  await film.say('Code', 'De code is een korte, unieke naam waarmee je de leverancier snel terugvindt.', { minMs: 1500 });
  await film.click(submit(page));
  await page.waitForURL(/\/suppliers\/[0-9a-f-]{36}/);
  await film.wait(800);

  await film.say('Adres', 'Na het opslaan kunnen er adressen bij.');
  await addAddress(page, film, cardTitled(page, 'Adressen'), {
    role: 'Leveranciersadres', street: 'Obala Maršala Tita', housenumber: '7', postalcode: '52440', city: 'Poreč', country: 'Kroatië',
  });
}

async function scene4Accommodation(page, film) {
  await film.card('4. Accommodaties', 'De verblijven die je verkoopt, met leverancier en adres.');
  await film.click(navLink(page, 'Accommodaties'));
  await film.say('Accommodatie', 'Het eerste appartement: Appartement Lavanda in Poreč.');
  await film.click(newButton(page, /nieuwe accommodatie/i));
  await film.type(control(page, 'key'), 'APP-LAVANDA');
  await film.type(control(page, 'name'), 'Appartement Lavanda, Poreč');
  await film.click(submit(page));
  await page.waitForURL(/\/accommodations\/[0-9a-f-]{36}/);
  await film.wait(800);

  await film.say('Leverancier', 'Sanne koppelt de leverancier. Bij een boeking vult RDS die dan zelf in.');
  const suppliers = cardTitled(page, 'Leveranciers');
  await film.click(suppliers.getByRole('button', { name: /toevoegen/i }));
  await film.choose(suppliers.locator('mat-select'), 'Adriatic Homes');
  await film.click(suppliers.getByRole('button', { name: /koppel/i }));
  await film.wait(800);

  await film.say('Adres', 'En het adres van het appartement.', { minMs: 1200 });
  await addAddress(page, film, cardTitled(page, 'Adressen'), {
    role: 'Accommodatieadres', street: 'Ulica Lavande', housenumber: '3', postalcode: '52440', city: 'Poreč', country: 'Kroatië',
  });
}

async function addAddress(page, film, card, address) {
  await film.click(card.getByRole('button', { name: /toevoegen/i }).first());
  await film.choose(control(card, 'addressrole'), address.role);
  await film.type(control(card, 'street'), address.street);
  await film.type(control(card, 'housenumber'), address.housenumber);
  await film.type(control(card, 'postalcode'), address.postalcode);
  await film.type(control(card, 'city'), address.city);
  await film.type(control(card, 'country'), address.country);
  // De opslaan-knop van het adresformulier (niet de knop in de kaartkop).
  await film.click(card.locator('button').filter({ hasText: /opslaan|toevoegen/i }).last());
  await film.wait(900);
}

async function scene5Activity(page, film) {
  await film.card('5. Activiteiten', 'Excursies, tours, tickets en transfers die je bij een reis kunt boeken.');
  await film.click(navLink(page, 'Activiteiten'));
  await film.say('Activiteit', 'Er staat al een boottocht. Sanne voegt een wijnproeverij toe.');
  await film.click(newButton(page, /nieuwe activiteit/i));
  await film.type(control(page, 'name'), 'Wijnproeverij in Motovun');
  await film.type(control(page, 'description'), 'Middag bij een familiebedrijf in het binnenland, met truffelhapjes.', { delay: 35 });
  await film.choose(control(page, 'activityType'), 'Tour');
  await film.click(submit(page));
  await page.waitForURL('**/activities');
  await film.say('Activiteit', 'De wijnproeverij kan nu bij elke boeking worden toegevoegd, met datum, tijd en prijs.');
}

async function scene6Settings(page, film) {
  await film.card('6. Instellingen', 'Welke offerte en mails RDS gebruikt, en hoe het betaalschema eruitziet.');
  await film.click(navLink(page, 'Instellingen'));
  await film.say('Offerte', 'Hier kies je de Word-template voor de offerte en de mail die erbij gaat.');
  await film.moveTo(control(page, 'quoteEmailTemplateId'));
  await film.say('Betalingen', 'Bij het bevestigen van een offerte maakt RDS een voorschot en een restant aan.');
  await film.moveTo(control(page, 'depositPercentage'));
  await film.say('Voorschot', 'Zonnige Reizen verlaagt het voorschot van 30 naar 25 procent.', { minMs: 1500 });
  await retype(film, control(page, 'depositPercentage'), '25');
  await film.say('Termijnen', 'Het voorschot vervalt 12 weken voor vertrek, het restant 6 weken voor vertrek.');
  await film.moveTo(control(page, 'balanceWeeksBeforeDeparture'));
  await film.click(page.locator('.save-btn'));
  await film.wait(900);
  await film.say('Opgeslagen', 'Dit geldt voor elke offerte die vanaf nu wordt bevestigd.', { minMs: 1500 });
}

async function scene7NewColleague(page, film) {
  await film.card('7. Daan logt in', 'Wat ziet een nieuwe medewerker?');
  await film.unsay();
  await film.click(page.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'logout' }) }).first());
  await page.waitForURL('**/login');
  await film.say('Inloggen', 'Daan logt voor het eerst in met het wachtwoord dat hij van Sanne kreeg.', { minMs: 1200 });
  await loginAs(page, film, DAAN.userName, DAAN.password);

  const d = page.locator('mat-dialog-container').last();
  await d.waitFor();
  await film.say('Wachtwoord', 'Eerst kiest hij een eigen wachtwoord.', { minMs: 1200 });
  await film.type(control(d, 'currentPassword'), DAAN.password, { delay: 30 });
  await film.type(control(d, 'newPassword'), DAAN.newPassword, { delay: 30 });
  await film.type(control(d, 'confirmPassword'), DAAN.newPassword, { delay: 30 });
  await film.click(d.locator('button[type="submit"], mat-dialog-actions button').last());
  await page.waitForURL('**/dashboard');
  await film.wait(800);
  await film.moveTo(navLink(page, 'Boekingen'));
  await film.say('Menu', 'Daan werkt in de kleuren van Zonnige Reizen. Als medewerker ziet hij alleen wat bij zijn rol hoort: '
    + 'boekingen, boekers en betalingen. Het organisatiebeheer ziet hij niet.');
  await film.wait(1000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
