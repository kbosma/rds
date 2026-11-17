// Neemt het templatefilmpje op: een e-mailtemplate en een Word-template (PDF/DOCX) maken en gebruiken.
//
// Vooraf: dezelfde demo-omgeving als record.mjs (zie README.md), op een lege database met `npm run seed`.
// Dit script maakt zelf (buiten beeld) een voorbeeldboeking voor Anna de Vries.
//
//   npm run record:templates        → demo-film/out/templatesfilmpje.webm
//   PACE=0.4 / HEADED=1 / SNAPSHOTS=1 werken net als bij record.mjs.

import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { DEMO, api, apiBytes, login } from './lib/api.mjs';
import { Film } from './lib/film.mjs';
import { ANNA, createSampleBooking } from './lib/sample.mjs';

const EMPLOYEE = process.env.DEMO_EMPLOYEE_URL ?? 'http://localhost:4210';
const MAILBOX = `${DEMO}/mailbox`;
const SIZE = { width: 1440, height: 900 };
const OUT_DIR = new URL('./out/templates/', import.meta.url).pathname;
const MANAGER = { userName: 'sanne.visser', password: 'Demo-Zonnig-2027' };

const dialog = (page) => page.locator('mat-dialog-container').last();
const editor = (scope) => scope.locator('.editor-host .ProseMirror');
const toolbarButton = (scope, icon) => scope.locator('button').filter({ has: scope.page().locator('mat-icon', { hasText: icon }) }).first();
const boldButton = (scope) => toolbarButton(scope, 'format_bold');
const cardTitled = (page, title) =>
  page.locator('mat-card').filter({ has: page.locator('mat-card-title').getByText(title, { exact: true }) });

async function main() {
  const token = await login(MANAGER);
  const booking = await createSampleBooking(token);

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
    await scene1EmailTemplate(page, film);
    await scene2SendEmail(page, film, booking);
    await scene3WordTemplate(page, film);
    await scene4GenerateDocument(page, film, booking, token);
    await film.unsay();
    await film.card('Klaar!', 'Eén keer een template maken, daarna met één klik per boeking een e-mail of document. '
      + 'Meer over variabelen en tabellen staat in de gebruikershandleiding.', 5000);
  } catch (err) {
    await page.screenshot({ path: `${OUT_DIR}fout.png` }).catch(() => {});
    throw err;
  } finally {
    await context.close();
    await browser.close();
  }

  const out = new URL('./out/templatesfilmpje.webm', import.meta.url).pathname;
  await rename(await page.video().path(), out);
  console.log(`Klaar: ${out}`);
}

// ---------------------------------------------------------------------------------------------------------------

async function scene0Intro(page, film) {
  await page.goto(`${EMPLOYEE}/login`);
  await film.card('Templates maken', 'E-mails en documenten (PDF of Word) die RDS voor elke boeking zelf invult. '
    + 'Alle namen en gegevens in dit filmpje zijn verzonnen.', 5000);
  await film.say('Inloggen', 'Sanne van Zonnige Reizen logt in.', { minMs: 1200 });
  await film.type(page.locator('input').first(), MANAGER.userName);
  await film.type(page.locator('input[type="password"]'), MANAGER.password, { delay: 30 });
  await film.click(page.getByRole('button', { name: /inloggen/i }));
  await page.waitForURL('**/dashboard');
  await film.wait(800);
}

async function scene1EmailTemplate(page, film) {
  await film.card('1. Een e-mailtemplate', 'Een mail die je vaker verstuurt, maak je één keer. RDS vult de namen en gegevens in.');

  await film.click(page.getByRole('link', { name: 'E-mailtemplates' }).first());
  await film.say('E-mailtemplate', 'Sanne maakt een mail om klanten te laten weten dat hun reisbescheiden klaarstaan.');
  await film.click(page.getByRole('button', { name: /nieuw template/i }).first());
  const d = dialog(page);
  const inputs = d.locator('mat-dialog-content input');
  await film.type(inputs.nth(0), 'Reisbescheiden');
  await film.type(inputs.nth(1), 'Na volledige betaling');
  await film.say('Onderwerp', 'Ook in het onderwerp mogen variabelen staan, zoals het boekingsnummer.', { minMs: 1200 });
  await film.type(inputs.nth(2), 'Je reisbescheiden voor ${booking.bookingNumber}', { delay: 40 });

  await film.say('Tekst', 'De tekst typ je in de editor. Variabelen klik je erin vanuit de lijst rechts.');
  await film.click(editor(d));
  await film.keys('Beste ');
  await film.click(await variable(page, 'Ontvanger', 'Voornaam'));
  await film.keys(',');
  await page.keyboard.press('Enter');
  await film.keys('Goed nieuws: alles is betaald en je reis naar Istrië komt eraan!');
  await page.keyboard.press('Enter');
  await film.click(boldButton(d));
  await film.keys('Je reisbescheiden staan klaar in je reisportaal.');
  await film.click(boldButton(d));
  await film.keys(' Je vertrekt op ');
  await film.click(await variable(page, 'Boeking', 'Van'));
  await film.keys('.');
  await page.keyboard.press('Enter');

  await film.say('Afbeelding', 'Een logo of foto voeg je toe via het tabblad Afbeeldingen. Sanne uploadt het logo van Zonnige Reizen.');
  await film.click(d.locator('.panel-tab').filter({ hasText: 'Afbeeldingen' }));
  await d.locator('app-template-image-library input[type="file"]').setInputFiles({
    name: 'logo-zonnige-reizen.png', mimeType: 'image/png', buffer: await makeLogo(page),
  });
  const tile = d.locator('app-template-image-library .tile').first();
  await tile.waitFor();
  await film.wait(600);
  await film.say('Afbeelding', 'Klikken zet de afbeelding op de plek van de cursor.', { minMs: 1200 });
  await film.click(tile);
  await page.keyboard.press('Enter');
  await film.keys('Zonnige groet, Sanne');
  await film.click(d.locator('.panel-tab').filter({ hasText: 'Variabelen' }));
  await film.wait(800);
  await film.click(d.locator('mat-dialog-actions button').last());
  await d.waitFor({ state: 'detached' });
  await film.say('E-mailtemplate', 'De template staat nu in de lijst, naast de templates voor de offerte en de betalingen.');
}

async function scene2SendEmail(page, film, booking) {
  await film.card('Versturen vanuit een boeking', 'Sanne opent de boeking van Anna de Vries.');
  await page.goto(`${EMPLOYEE}/bookings/${booking.bookingId}`);
  await page.locator('app-booking-status-badge').first().waitFor();

  const messages = cardTitled(page, 'Berichten en documenten');
  await film.say('Versturen', 'Onder Berichten en documenten kiest ze Toevoegen, E-mail aan hoofdboeker.');
  await film.click(messages.getByRole('button', { name: /toevoegen/i }));
  await film.click(page.locator('button.new-email'));
  const d = dialog(page);
  await film.click(d.locator('mat-select'), { force: true });
  await film.click(page.locator('mat-option').filter({ hasText: 'Reisbescheiden' }));
  await film.say('Voorbeeld', 'Met Genereer voorbeeld ziet ze precies wat Anna krijgt, met haar naam en reisdatum ingevuld.');
  await film.click(d.getByRole('button', { name: /genereer voorbeeld/i }));
  await d.locator('iframe').waitFor();
  await film.moveTo(d.locator('iframe'));
  await film.wait(2500);
  await film.say('Versturen', 'Klopt het? Dan Verstuur.', { minMs: 1000 });
  await film.click(d.getByRole('button', { name: /verstuur/i }));
  await film.wait(1500);
  if (await d.isVisible()) await page.keyboard.press('Escape');
  await d.waitFor({ state: 'detached' }).catch(() => {});
  await film.moveTo(messages);
  await film.say('Versturen', 'De verstuurde mail staat bij de boeking, zodat iedereen kan zien wat er naar de klant is gegaan.');

  const bookingUrl = page.url();
  await page.goto(`${MAILBOX}?to=${encodeURIComponent(ANNA.email)}`);
  await film.say('Bij Anna', 'En zo ziet Anna hem in haar mailbox.');
  await film.wait(2000);
  await page.goto(bookingUrl);
}

async function scene3WordTemplate(page, film) {
  await film.card('2. Een document: PDF of Word', 'Een reisbevestiging met een tabel die per reiziger een regel krijgt.');

  await film.click(page.getByRole('link', { name: 'Templates' }).first());
  await film.say('Template', 'Bij Templates maakt Sanne een nieuwe template, in de editor. Een eigen Word-bestand uploaden kan ook.');
  await film.click(page.getByRole('button', { name: /nieuwe template/i }).first());
  const d = dialog(page);
  await film.type(d.locator('mat-dialog-content input').first(), 'Reisbevestiging');
  await film.type(d.locator('mat-dialog-content textarea').first(), 'Voor de klant, na het boeken');
  await film.click(d.getByRole('radio', { name: /in de editor maken/i }).or(d.locator('mat-button-toggle').filter({ hasText: /in de editor/i })).first());
  await editor(d).waitFor();

  await film.click(editor(d));
  await film.click(boldButton(d));
  await film.keys('Reisbevestiging ');
  await film.click(await variable(page, 'Boeking', 'Boekingsnummer'));
  await film.click(boldButton(d));
  await page.keyboard.press('Enter');
  await film.keys('Beste ');
  await film.click(await variable(page, 'Hoofdboeker', 'Voornaam'));
  await film.keys(', hieronder staan de gegevens van je reis.');
  await page.keyboard.press('Enter');

  await film.say('Herhaalde tabel', 'Een herhaalde tabel krijgt een regel per reiziger, per verblijf of per betaling. Hoeveel het er zijn, maakt niet uit.');
  await film.click(toolbarButton(d, 'table_chart'));
  await film.click(page.locator('button[mat-menu-item]').filter({ hasText: 'Herhaalde tabel' }));
  await film.click(page.locator('button[mat-menu-item]').filter({ hasText: 'Reizigers' }));
  await film.wait(800);
  await film.moveTo(d.locator('.ProseMirror table').first());
  await film.say('Herhaalde tabel', 'De gekleurde rij wordt herhaald. De kolommen zijn al gevuld met de juiste variabelen.');

  // Onder de tabel verder: naar het einde van de tekst.
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Meta+ArrowDown');
  await film.click(toolbarButton(d, 'table_chart'));
  await film.click(page.locator('button[mat-menu-item]').filter({ hasText: 'Herhaalde tabel' }));
  await film.click(page.locator('button[mat-menu-item]').filter({ hasText: 'Accommodaties' }));
  await film.wait(800);
  await film.say('Template', 'Nog een tabel voor de verblijven, en opslaan.', { minMs: 1200 });
  await film.click(d.locator('mat-dialog-actions button').last());
  await d.waitFor({ state: 'detached' });
  await film.wait(800);
}

async function scene4GenerateDocument(page, film, booking, token) {
  await film.card('Een document maken', 'Terug naar de boeking van Anna.');
  await page.goto(`${EMPLOYEE}/bookings/${booking.bookingId}`);
  await page.locator('app-booking-status-badge').first().waitFor();

  const messages = cardTitled(page, 'Berichten en documenten');
  await film.say('Document', 'Onder Berichten en documenten kiest Sanne Toevoegen, Document.');
  await film.click(messages.getByRole('button', { name: /toevoegen/i }));
  await film.click(page.locator('button.new-document'));
  const d = dialog(page);
  await film.type(d.locator('input').first(), 'Reisbevestiging');
  await film.click(d.locator('mat-select').first(), { force: true });
  await film.click(page.locator('mat-option').filter({ hasText: 'Reisbevestiging' }));
  await film.say('Document', 'PDF voor de klant. Kies Word (DOCX) als je het document daarna nog wilt aanpassen.');
  await film.click(d.locator('mat-button-toggle').filter({ hasText: /pdf/i }).first());
  await film.say('Document', 'Met dit vinkje ziet Anna het document ook in haar reisportaal.', { minMs: 1200 });
  await film.click(d.getByRole('checkbox', { name: /boekerportaal/i }));
  await film.click(d.locator('mat-dialog-actions button').last());
  await d.waitFor({ state: 'detached' });
  await film.wait(1200);
  await film.moveTo(messages);
  await film.say('Document', 'Het document staat bij de boeking, met alle gegevens van Anna en Mark ingevuld.');

  // De PDF opent in een nieuw tabblad (dat neemt de opname niet mee); toon daarom de eerste pagina van het echte document.
  const docs = await api(token, 'GET', `/documents/booking/${booking.bookingId}`);
  const pdf = docs.filter((x) => /reisbevestiging/i.test(x.displayname ?? x.filename ?? '')).at(-1) ?? docs.at(-1);
  const png = await pdfFirstPage(await apiBytes(token, `/documents/${pdf.documentId}/content`));
  await film.image(`data:image/png;base64,${png.toString('base64')}`, 'De gegenereerde PDF (bovenkant van de eerste pagina)', 6000);
}

// ---------------------------------------------------------------------------------------------------------------

/** De variabele `label` in groep `group` van het zijpaneel van de editor (dezelfde naam komt in meer groepen voor). */
async function variable(page, group, label) {
  const index = await page.locator('mat-dialog-container .var-panel').last().evaluate((panel, { group, label }) => {
    let current = null;
    let i = -1;
    for (const el of panel.querySelectorAll('.var-group, .var-item')) {
      if (el.classList.contains('var-group')) { current = el.textContent.trim(); continue; }
      i++;
      if (current === group && el.textContent.trim().endsWith(label)) return i;
    }
    return -1;
  }, { group, label });
  if (index < 0) throw new Error(`Variabele ${group} / ${label} niet gevonden`);
  return page.locator('mat-dialog-container .var-panel').last().locator('.var-item').nth(index);
}

/** Een eenvoudig logo, in de browser getekend. */
async function makeLogo(page) {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 360; c.height = 90;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#f2a541'; g.beginPath(); g.arc(45, 45, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f2a541'; g.lineWidth = 5;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      g.beginPath(); g.moveTo(45 + Math.cos(a) * 31, 45 + Math.sin(a) * 31); g.lineTo(45 + Math.cos(a) * 40, 45 + Math.sin(a) * 40); g.stroke();
    }
    g.fillStyle = '#c2571a'; g.font = 'bold 30px system-ui, sans-serif'; g.fillText('Zonnige Reizen', 100, 56);
    return c.toDataURL('image/png');
  });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/** De eerste pagina van een PDF als PNG (macOS: sips). */
async function pdfFirstPage(pdfBytes) {
  const pdfPath = `${OUT_DIR}document.pdf`;
  const pngPath = `${OUT_DIR}document.png`;
  await writeFile(pdfPath, pdfBytes);
  await promisify(execFile)('sips', ['-s', 'format', 'png', '-Z', '1400', pdfPath, '--out', pngPath]);
  return readFile(pngPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
