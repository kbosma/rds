// Neemt het boekingsfilmpje op: één fictieve klant van prospect tot afgeronde reis, in de echte schermen.
//
// Vooraf (zie demo-film/README.md): lege demo-database, backend met profiel 'demo' (poort 8667),
// medewerkersapp op 4210 en boekerportaal op 4310 (beide met demo-film/proxy.demo.json), en `npm run seed`.
//
//   npm run record                  → demo-film/out/boekingsfilmpje.webm
//   PACE=0.5 npm run record         → sneller (om het script te testen)
//   HEADED=1 npm run record         → met zichtbaar browservenster
//   SNAPSHOTS=1 npm run record      → ook een screenshot bij elke ondertitel (demo-film/out/stills)

import { chromium } from 'playwright';
import { mkdir, rename, rm } from 'node:fs/promises';
import { DEMO, latestMail, setDemoToday } from './lib/api.mjs';
import { Film } from './lib/film.mjs';

const EMPLOYEE = process.env.DEMO_EMPLOYEE_URL ?? 'http://localhost:4210';
const PORTAL = process.env.DEMO_PORTAL_URL ?? 'http://localhost:4310';
const MAILBOX = `${DEMO}/mailbox`;
const SIZE = { width: 1440, height: 900 };
const OUT_DIR = new URL('./out/', import.meta.url).pathname;

const MANAGER = { userName: 'sanne.visser', password: 'Demo-Zonnig-2027' };
const KLANT = {
  firstname: 'Anna', prefix: 'de', lastname: 'Vries', callsign: 'Anna', initials: 'A.',
  telephone: '06 12 34 56 78', email: 'anna.devries@example.com', birthdate: '1986-03-14',
};
const MEEREIZIGER = { firstname: 'Mark', prefix: 'de', lastname: 'Vries', initials: 'M.', birthdate: '1984-09-02' };
const REIS = { from: '2027-07-10', until: '2027-07-24', price: '2450', activityDate: '2027-07-14' };

const dialog = (page) => page.locator('mat-dialog-container').last();
const field = (scope, name) => scope.locator(`[formcontrolname="${name}"]`);
/** De hoofdknop van een dialoog (Opslaan of Toevoegen): de laatste knop in de actiebalk. */
const saveButton = (d) => d.locator('mat-dialog-actions button').last();
/** Een kaart op het scherm, gevonden op zijn titel. */
const cardTitled = (page, title) =>
  page.locator('mat-card').filter({ has: page.locator('mat-card-title').getByText(title, { exact: true }) });

async function main() {
  await fetch(`${DEMO}/clock`, { method: 'DELETE' });

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  // channel 'chromium': de volledige Chromium (ook headless), zodat er geen aparte headless-shell nodig is.
  const browser = await chromium.launch({ channel: 'chromium', headless: !process.env.HEADED });
  const context = await browser.newContext({
    viewport: SIZE, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam',
    recordVideo: { dir: OUT_DIR, size: SIZE },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const snapshotDir = process.env.SNAPSHOTS ? `${OUT_DIR}stills` : null;
  if (snapshotDir) await mkdir(snapshotDir, { recursive: true });
  const film = new Film(page, { pace: Number(process.env.PACE ?? 1), snapshotDir });
  await film.setup();

  try {
    await scene0Intro(page, film);
    await scene1Prospect(page, film);
    const booking = await scene2Booking(page, film);
    await scene3Quote(page, film);
    await scene4Confirm(page, film);
    await scene5Portal(page, film, booking.number);
    await scene6Paid(page, film, booking.url);
    await scene7Travel(page, film);
    await scene8Outro(page, film);
  } catch (err) {
    await page.screenshot({ path: `${OUT_DIR}fout.png` }).catch(() => {});
    throw err;
  } finally {
    await film.report(`${OUT_DIR}pauzes.txt`).catch(() => {});
    await context.close();
    await browser.close();
    await fetch(`${DEMO}/clock`, { method: 'DELETE' }).catch(() => {});
  }

  const video = await page.video().path();
  await rename(video, `${OUT_DIR}boekingsfilmpje.webm`);
  console.log(`Klaar: ${OUT_DIR}boekingsfilmpje.webm`);
}

// ---------------------------------------------------------------------------------------------------------------

async function scene0Intro(page, film) {
  await page.goto(`${EMPLOYEE}/login`);
  await film.card('Van aanvraag tot afgeronde reis',
    'Een rondleiding door RDS met een voorbeeldklant. Alle namen en gegevens in dit filmpje zijn verzonnen.', 5000);

  await film.say('Inloggen', 'Sanne werkt bij reisorganisatie Zonnige Reizen. Ze logt in op RDS.');
  await film.type(page.locator('input').first(), MANAGER.userName);
  await film.type(page.locator('input[type="password"]'), MANAGER.password, { delay: 30 });
  await film.click(page.getByRole('button', { name: /inloggen/i }));
  await page.waitForURL('**/dashboard');
  await film.wait(1200);
}

async function scene1Prospect(page, film) {
  await film.card('1. Een nieuwe klant', 'Anna de Vries belt: ze wil deze zomer met haar man naar Istrië.');

  await film.say('Prospect', 'Wie nog geen boeking heeft, leggen we vast als prospect.');
  await film.click(page.getByRole('link', { name: 'Prospects' }).first());
  await film.click(page.getByRole('button', { name: 'Registreer prospect' }).first());

  const d = dialog(page);
  await film.say('Prospect', 'Sanne vult de gegevens van Anna in. Het e-mailadres is belangrijk: daar gaan de offerte en de inlogcode heen.', { minMs: 1200 });
  await film.type(field(d, 'firstname'), KLANT.firstname);
  await film.type(field(d, 'prefix'), KLANT.prefix);
  await film.type(field(d, 'lastname'), KLANT.lastname);
  await film.type(field(d, 'callsign'), KLANT.callsign);
  await film.type(field(d, 'initials'), KLANT.initials);
  await film.choose(field(d, 'gender'), 'Vrouw');
  await film.type(field(d, 'telephone'), KLANT.telephone);
  await film.type(field(d, 'emailaddress'), KLANT.email, { delay: 35 });
  await film.fill(field(d, 'birthdate'), KLANT.birthdate);
  await film.click(saveButton(d));
  await d.waitFor({ state: 'detached' });

  await film.say('Prospect', 'Anna staat nu in de lijst met prospects. Zodra ze een boeking heeft, wordt ze vanzelf een boeker.');
}

async function scene2Booking(page, film) {
  await film.card('2. De boeking samenstellen', 'Reizigers, het verblijf en een activiteit. Datums en totaalbedrag rekent RDS zelf uit.');

  await film.click(page.getByRole('link', { name: 'Boekingen' }).first());
  await film.say('Boeking', 'Een boeking begint altijd bij de hoofdboeker. Sanne kiest Anna.');
  await film.click(page.getByRole('button', { name: 'Nieuwe boeking' }).first());
  const select = dialog(page);
  await film.type(select.locator('input'), 'Vries');
  await film.click(select.getByText(/Anna/).first());
  await page.waitForURL('**/bookings/new**');

  await film.say('Boeking', 'Dit is nog een concept: de boeking wordt pas aangemaakt zodra er iets aan wordt toegevoegd.');

  // Reizigers
  const travelersCard = cardTitled(page, 'Reizigers');
  for (const [i, t] of [[0, { ...KLANT, gender: 'Vrouw' }], [1, { ...MEEREIZIGER, gender: 'Man' }]]) {
    if (i === 1) await film.say('Reizigers', 'Dan haar man Mark.', { minMs: 1000 });
    else await film.say('Reizigers', 'Eerst de reizigers.', { minMs: 1000 });
    await film.click(travelersCard.getByRole('button', { name: /toevoegen/i }));
    if (i === 0) {
      // Het eerste onderdeel maakt de boeking definitief; RDS vraagt dat eerst.
      await film.say('Boeking', 'RDS vraagt of de boeking nu echt aangemaakt mag worden. Dan krijgt hij ook een boekingsnummer.');
      await film.click(dialog(page).getByRole('button', { name: 'Doorgaan' }));
      await page.locator('mat-dialog-container [formcontrolname="firstname"]').waitFor();
      await film.say('Reizigers', 'Eerst Anna zelf.', { minMs: 900 });
    }
    const d = dialog(page);
    await film.type(field(d, 'firstname'), t.firstname);
    await film.type(field(d, 'prefix'), t.prefix);
    await film.type(field(d, 'lastname'), t.lastname);
    await film.type(field(d, 'initials'), t.initials);
    await film.choose(field(d, 'gender'), t.gender);
    await film.fill(field(d, 'birthdate'), t.birthdate);
    await film.click(saveButton(d));
    await d.waitFor({ state: 'detached' });
    await film.wait(800);
  }
  await page.waitForURL(/\/bookings\/[0-9a-f-]{36}/);
  await film.say('Boeking', 'De boeking bestaat nu en heeft een boekingsnummer. De status is Aanvraag.');

  // Verblijf
  const accCard = cardTitled(page, 'Accommodaties');
  await film.say('Verblijf', 'Dan het verblijf: twee weken in Villa Oliva in Rovinj.');
  await film.click(accCard.getByRole('button', { name: /toevoegen/i }));
  let d = dialog(page);
  await film.choose(field(d, 'accommodationId'), 'Villa Oliva');
  // Met één leverancier vult RDS die zelf in; anders kiezen.
  if (await field(d, 'supplierId').count() > 0) {
    await film.choose(field(d, 'supplierId'), 'Istra Villas');
  }
  await film.fill(field(d, 'fromDate'), REIS.from);
  await film.fill(field(d, 'untilDate'), REIS.until);
  await film.type(field(d, 'price'), REIS.price);
  await film.click(saveButton(d));
  await d.waitFor({ state: 'detached' });
  await film.wait(800);

  // Activiteit
  const actCard = cardTitled(page, 'Activiteiten');
  await film.say('Activiteit', 'En een boottocht als extra activiteit.');
  await film.click(actCard.getByRole('button', { name: /toevoegen/i }));
  d = dialog(page);
  await film.choose(field(d, 'activityId'), 'Boottocht');
  await film.fill(field(d, 'activityDate'), REIS.activityDate);
  await film.fill(field(d, 'fromTime'), '09:30');
  await film.fill(field(d, 'untilTime'), '17:00');
  await film.type(field(d, 'meetingPoint'), 'Haven van Rovinj');
  await film.type(field(d, 'totalPrice'), '180');
  await film.click(saveButton(d));
  await d.waitFor({ state: 'detached' });
  await film.wait(800);

  await film.moveTo(page.locator('.kv-list').first());
  await film.say('Boeking', 'Reisdatums en totaalbedrag zijn automatisch bijgewerkt: € 2.630,00.');
  const number = (await page.locator('h1.page-title').innerText()).match(/BK-\d{4}-\d+/)?.[0];
  return { number, url: page.url() };
}

async function scene3Quote(page, film) {
  await film.card('3. De offerte', 'Met één klik maakt RDS de offerte als PDF en mailt hem naar Anna.');

  await film.say('Offerte', 'Sanne klikt op Offerte versturen.');
  await film.click(page.getByRole('button', { name: 'Offerte versturen' }));
  await film.say('Offerte', 'RDS vraagt nog even om bevestiging.', { minMs: 1200 });
  await film.click(dialog(page).getByRole('button', { name: 'Versturen' }));
  await page.locator('app-booking-status-badge').filter({ hasText: /offerte/i }).first().waitFor();
  await film.say('Offerte', 'De status is nu Offerte. De PDF en de verstuurde mail staan bij de boeking, onder Berichten en documenten.');
  await film.moveTo(page.locator('app-booking-messages-card'));
  await film.wait(900);

  const bookingUrl = page.url();
  await page.goto(`${MAILBOX}?to=${encodeURIComponent(KLANT.email)}`);
  await film.say('Bij Anna', 'Zo komt de offerte binnen bij Anna, met de PDF als bijlage.');
  await film.wait(1000);
  await page.goto(bookingUrl);
  await page.locator('app-booking-status-badge').first().waitFor();
}

async function scene4Confirm(page, film) {
  await film.card('4. Anna gaat akkoord', 'Ze belt terug: de reis mag geboekt worden.');

  await film.say('Bevestigen', 'Sanne opent de boekinggegevens en vinkt Offerte bevestigd aan.');
  await film.click(page.getByRole('button', { name: /bewerken/i }).first());
  const d = dialog(page);
  await film.click(d.getByRole('checkbox', { name: /Offerte bevestigd/ }));
  await film.say('Bevestigen', 'Na opslaan wordt de status Boeking.', { minMs: 1200 });
  await film.click(saveButton(d));
  await d.waitFor({ state: 'detached' });
  await page.locator('app-booking-status-badge').filter({ hasText: /^\s*boeking\s*$/i }).first().waitFor();
  // De kaart Betalingen ververst na het bevestigen (nog) niet vanzelf; herlaad zodat de nieuwe betalingen in beeld zijn.
  await page.reload();
  await cardTitled(page, 'Betalingen').locator('tr.mat-mdc-row').first().waitFor();

  const payments = cardTitled(page, 'Betalingen');
  await film.moveTo(payments);
  await film.say('Betalingen', 'RDS maakt direct de betalingen aan: 30% voorschot en het restant, met vervaldatums vóór vertrek.');
  await film.say('Betalingen', 'Anna krijgt automatisch een mail met het betaalschema en een link naar haar reisportaal.');
}

async function scene5Portal(page, film, bookingNumber) {
  await film.card('5. Anna in haar reisportaal', 'Klanten loggen in met hun e-mailadres en boekingsnummer. Wachtwoorden zijn niet nodig.');

  await page.goto(`${PORTAL}/login`);
  await film.say('Reisportaal', 'Anna vult haar e-mailadres en boekingsnummer in.');
  const inputs = page.locator('input');
  await film.type(inputs.nth(0), KLANT.email, { delay: 35 });
  await film.type(inputs.nth(1), bookingNumber);
  await film.click(page.locator('button[type="submit"]'));
  await page.waitForURL('**/verify**');

  const mail = await waitForMail(KLANT.email, (m) => !!m.code);
  await film.toast('Nieuwe e-mail', 'Je inlogcode voor het boekerportaal', mail.code, 3500);
  await film.say('Reisportaal', 'Ze ontvangt een inlogcode per mail en vult die in.', { minMs: 1200 });
  await film.type(page.locator('input[name="code"]'), mail.code, { delay: 120 });
  await film.click(page.locator('button[type="submit"]'));
  await page.waitForURL((url) => !url.pathname.includes('verify') && !url.pathname.includes('login'));
  await film.wait(600);
  await film.say('Reisportaal', 'Anna ziet haar reis: het verblijf, de boottocht, de documenten en wat er nog betaald moet worden.');

  await payNext(page, film, 'Ze betaalt het voorschot.');
  await film.say('Reisportaal', 'Betaald! In RDS springt de status van de boeking nu naar Voorschot.');

  await film.card('Een paar weken later…', 'Anna betaalt ook het restant.', 2800);
  await payNext(page, film, 'Het restant, op dezelfde manier.');
  await film.say('Reisportaal', 'Alles is betaald.');
}

/** Betaal de eerstvolgende openstaande betaling via de (nagebootste) betaalpagina. */
async function payNext(page, film, text) {
  const payButton = page.locator('button.pay').first();
  await payButton.waitFor();
  await film.say('Betalen', text, { minMs: 1200 });
  await film.click(payButton);
  await page.waitForURL('**/demo/mollie/checkout/**');
  await film.say('Betalen', 'Ze komt op de betaalpagina. (In dit filmpje een nagebootste pagina: er gaat geen echt geld over.)');
  await film.click(page.getByRole('button', { name: 'Betalen' }));
  await page.waitForURL((url) => url.origin === PORTAL);
  await film.wait(1200);
}

async function scene6Paid(page, film, bookingUrl) {
  await film.card('6. Terug bij Zonnige Reizen', 'RDS houdt de betalingen bij en zet de status zelf verder.');

  await page.goto(`${EMPLOYEE}/bookings`);
  await page.locator('tr.mat-mdc-row').first().waitFor();
  await film.say('Boeking', 'In het overzicht staat de boeking van Anna nu op Betaald.');
  await page.goto(bookingUrl);
  await page.locator('app-booking-status-badge').first().waitFor();
  await film.wait(800);
  await handleNotifications(page, film, 'RDS meldt dat alles betaald is: tijd om de reisbescheiden te versturen. Sanne handelt de melding af.');
}

async function scene7Travel(page, film) {
  await film.card('7. 12 juli 2027', 'Anna en Mark zijn op reis.', 3000);
  await setDemoToday('2027-07-12');
  await page.reload();
  await page.locator('app-booking-status-badge').first().waitFor();
  await film.say('Op reis', 'Op de vertrekdatum zet RDS de boeking vanzelf op Op reis.');
  await handleNotifications(page, film, 'Ook daarvan komt een melding.');

  await film.card('26 juli 2027', 'Weer thuis, met mooie verhalen.', 3000);
  await setDemoToday('2027-07-26');
  await page.reload();
  await page.locator('app-booking-status-badge').first().waitFor();
  await film.say('Weer thuis', 'Na de terugreis wordt de status Weer thuis.');
  await handleNotifications(page, film, 'Sanne handelt de laatste melding af, bijvoorbeeld na een belletje hoe de reis was.');

  await page.reload();
  await page.locator('app-booking-status-badge').filter({ hasText: /afgerond/i }).first().waitFor();
  await film.say('Afgerond', 'Zonder openstaande meldingen rondt RDS de boeking automatisch af.');
  await film.click(page.getByRole('button', { name: 'Statusgeschiedenis' }));
  await film.say('Afgerond', 'In de statusgeschiedenis is elke stap terug te zien: wie, wanneer en waarom.');
  await film.wait(1200);
  await page.keyboard.press('Escape');
}

async function scene8Outro(page, film) {
  await film.unsay();
  await film.card('Klaar!', 'Van eerste telefoontje tot afgeronde reis, in één dossier. Vragen? Kijk in de gebruikershandleiding.', 5000);
}

// ---------------------------------------------------------------------------------------------------------------

async function handleNotifications(page, film, text) {
  const buttons = page.locator('button.handle-btn');
  await buttons.first().waitFor();
  await film.moveTo(buttons.first());
  await film.say('Melding', text);
  while (await buttons.count() > 0) {
    await film.click(buttons.first());
    await film.wait(900);
  }
}

async function waitForMail(to, predicate, timeoutMs = 10000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const mail = await latestMail(to);
    if (mail && predicate(mail)) return mail;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Geen passende mail aan ${to} binnen ${timeoutMs} ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
