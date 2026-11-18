// Neemt het rollenfilmpje op: zelf rollen maken met de rechtenmatrix, en de afspraak dat niemand meer kan uitdelen dan
// hij zelf heeft (docs/voorstel-eigen-rollen.md).
//
// Vooraf: dezelfde demo-omgeving als record.mjs (zie README.md), op een lege database met `npm run seed`.
// Buiten beeld maakt dit script medewerker Daan Mulder aan (rol EMPLOYEE).
//
//   npm run record:rollen           → demo-film/out/rollenfilmpje.webm
//   PACE=0.4 / HEADED=1 / SNAPSHOTS=1 werken net als bij record.mjs.

import { chromium } from 'playwright';
import { mkdir, rename, rm } from 'node:fs/promises';
import { api, login } from './lib/api.mjs';
import { Film } from './lib/film.mjs';

const EMPLOYEE = process.env.DEMO_EMPLOYEE_URL ?? 'http://localhost:4210';
const SIZE = { width: 1440, height: 900 };
const OUT_DIR = new URL('./out/rollen/', import.meta.url).pathname;
const MANAGER = { userName: 'sanne.visser', password: 'Demo-Zonnig-2027' };
// Verzonnen medewerker, alleen voor de demo-database.
const DAAN = { userName: 'daan.mulder', password: 'Zonnig-Daan-2027!' };

const control = (scope, name) => scope.locator(`[formcontrolname="${name}"]`).first();
const navLink = (page, name) => page.getByRole('link', { name, exact: false }).first();
const newButton = (page, text) => page.locator('main a, main button').filter({ hasText: text }).first();
const submit = (page) => page.locator('main button[type="submit"]').first();
const row = (page, text) => page.locator('tr.mat-mdc-row').filter({ hasText: text }).first();
const box = (page, authority) => page.locator(`mat-checkbox[data-authority="${authority}"] .mdc-checkbox`);

async function main() {
  await prepareDaan();

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
    await scene1SystemRoles(page, film);
    await scene2OwnRole(page, film);
    await scene3RoleManagementForDaan(page, film);
    await scene4DaanHandsOutOnlyWhatHeHas(page, film);
    await film.unsay();
    await film.card('Klaar!', 'Eigen rollen per organisatie: je deelt alleen uit wat je zelf hebt, systeemrollen liggen vast, '
      + 'en wat je verandert werkt meteen. Meer staat in de gebruikershandleiding.', 5000);
  } catch (err) {
    await page.screenshot({ path: `${OUT_DIR}fout.png` }).catch(() => {});
    throw err;
  } finally {
    await film.report(`${OUT_DIR}pauzes.txt`).catch(() => {});
    await context.close();
    await browser.close();
  }

  const out = new URL('./out/rollenfilmpje.webm', import.meta.url).pathname;
  await rename(await page.video().path(), out);
  console.log(`Klaar: ${out}`);
}

/** Buiten beeld: Daan Mulder als medewerker (EMPLOYEE) van Zonnige Reizen. */
async function prepareDaan() {
  const token = await login(MANAGER);
  const person = await api(token, 'POST', '/persons', { firstname: 'Daan', prefix: null, lastname: 'Mulder' });
  const account = await api(token, 'POST', '/accounts', {
    userName: DAAN.userName, password: DAAN.password, personId: person.persoonId,
    locked: false, mustChangePassword: false, expiresAt: '2030-12-31T23:59:00',
  });
  const employee = (await api(token, 'GET', '/roles')).find((r) => r.systemKey === 'EMPLOYEE');
  await api(token, 'POST', '/account-roles', { accountId: account.accountId, roleId: employee.roleId });
}

async function loginAs(page, film, user, password) {
  await film.type(control(page, 'userName'), user);
  await film.type(control(page, 'password'), password, { delay: 25 });
  await film.click(page.getByRole('button', { name: /inloggen/i }));
  await page.waitForURL('**/dashboard');
}

/** Een vakje in de matrix aanklikken. Dat is nog een concept: er gaat niets naar de server tot Opslaan. */
async function toggle(page, film, authority) {
  await film.click(box(page, authority));
  await film.wait(250);
}

/** Opslaan: naam en rechten in één keer; daarna staat de rollenlijst er weer. */
async function saveRole(page, film) {
  const saved = page.waitForResponse((r) => /\/api\/roles(\/[^/]+)?$/.test(new URL(r.url()).pathname)
    && ['POST', 'PUT'].includes(r.request().method()));
  await film.click(submit(page));
  await saved;
  await page.waitForURL(/\/admin\/roles$/);
}

// ---------------------------------------------------------------------------------------------------------------

async function scene0Intro(page, film) {
  await page.goto(`${EMPLOYEE}/login`);
  await film.card('Eigen rollen', 'Een organisatie stelt zelf rollen samen uit de rechten van RDS. '
    + 'Alle namen en gegevens in dit filmpje zijn verzonnen.', 4500);
  await film.say('Inloggen', 'Sanne is manager van Zonnige Reizen.', { minMs: 1000 });
  await loginAs(page, film, MANAGER.userName, MANAGER.password);
}

async function scene1SystemRoles(page, film) {
  await film.card('1. Systeemrollen', 'MANAGER en EMPLOYEE komen met RDS mee en liggen vast.', 3000);
  await film.click(navLink(page, 'Rollen'));
  await row(page, 'MANAGER').waitFor();
  await film.say('Rollen', 'Elke organisatie heeft een eigen MANAGER en EMPLOYEE. Het slotje betekent: vast, niet te wijzigen. '
    + 'Rechts staat hoeveel accounts de rol hebben.');
  await film.click(row(page, 'EMPLOYEE').locator('.action-view'));
  await page.locator('app-role-authority-matrix').waitFor();
  await film.say('Rechtenmatrix', 'De rechten staan per onderwerp: lezen, aanmaken, wijzigen en verwijderen, en wat er verder is. '
    + 'Bij een systeemrol is alles grijs.');
  await film.moveTo(page.locator('app-role-authority-matrix tbody tr').nth(1));
  await film.wait(800);
}

async function scene2OwnRole(page, film) {
  await film.card('2. Een eigen rol', 'Sanne maakt een rol voor de boekhouding.', 2800);
  await film.click(navLink(page, 'Rollen'));
  await film.click(newButton(page, /nieuwe rol/i));
  await page.locator('app-role-authority-matrix').waitFor();
  await film.say('Eén scherm', 'Naam, een sjabloon en de rechten staan op één scherm. Ze begint leeg.', { minMs: 1500 });
  await film.type(control(page, 'description'), 'Boekhouder');

  await film.say('Vereisten', 'Ze vinkt Betalingen wijzigen aan. Lezen van betalingen en boekingen komen vanzelf mee: '
    + 'zonder die rechten werkt wijzigen niet.');
  await toggle(page, film, 'PAYMENT_UPDATE');
  await film.moveTo(box(page, 'BOOKING_READ'));
  await film.wait(700);
  await film.say('Vereisten', 'Zolang wijzigen aan staat, kan lezen niet uit: dat vakje zit vast.', { minMs: 1500 });
  await film.moveTo(box(page, 'PAYMENT_READ'));
  await film.wait(700);

  await film.say('Opslaan', 'Er is nog niets bewaard. Pas Opslaan bewaart de naam en de rechten, in één keer.');
  await film.moveTo(page.locator('.pending'));
  await saveRole(page, film);

  await film.say('Annuleren', 'Ze opent de rol weer en vinkt iets aan. Annuleren? Dan vraagt RDS of ze de wijziging '
    + 'wil weggooien; de rol blijft zoals hij was.');
  await film.click(row(page, 'Boekhouder').locator('.action-edit'));
  await page.locator('app-role-authority-matrix').waitFor();
  await page.waitForLoadState('networkidle');
  await toggle(page, film, 'TEMPLATE_READ');
  await film.click(page.locator('form .actions button[type="button"]'));
  const confirm = page.locator('mat-dialog-container');
  await confirm.waitFor();
  await film.wait(600);
  await film.click(confirm.locator('mat-dialog-actions button').last());
  await page.waitForURL(/\/admin\/roles$/);

  await film.say('Geschiedenis', 'Onder de rol staat het rechtenlogboek: wanneer, door wie en wat er veranderde.', { minMs: 1500 });
  await film.click(row(page, 'Boekhouder').locator('.action-edit'));
  const history = page.locator('.history-card');
  await history.waitFor();
  // De geschiedenis staat onderaan de pagina, precies waar de ondertitel staat: die gaat even weg.
  await film.unsay();
  await film.moveTo(history.locator('td.who').first());
  await film.wait(2500);
}

async function scene3RoleManagementForDaan(page, film) {
  await film.card('3. Rollen laten inrichten', 'Sanne laat medewerker Daan voortaan ook rollen beheren.', 3000);
  await film.click(navLink(page, 'Rollen'));
  await film.click(newButton(page, /nieuwe rol/i));
  await page.locator('app-role-authority-matrix').waitFor();
  await film.type(control(page, 'description'), 'Teamleider');
  await film.say('Sjabloon', 'Ze neemt EMPLOYEE als sjabloon. Dat vult alleen de matrix; ze kan daarna nog alles aanpassen.', { minMs: 1500 });
  await film.choose(page.locator('mat-select.template'), 'EMPLOYEE');

  await film.say('Rollen beheren', 'Daarbij: rollen beheren en rollen toewijzen. Ook die rechten mag ze doorgeven, omdat ze ze zelf heeft.');
  for (const authority of ['ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE', 'ROLEAUTHORITY_CREATE', 'ROLEAUTHORITY_DELETE',
    'ACCOUNTROLE_CREATE', 'ACCOUNTROLE_DELETE', 'ACCOUNT_CREATE']) {
    await toggle(page, film, authority);
  }
  await saveRole(page, film);

  await film.say('Toewijzen', 'Nu krijgt Daan die rol, naast zijn rol EMPLOYEE.', { minMs: 1200 });
  await film.click(navLink(page, 'Accounts'));
  await film.click(row(page, 'daan.mulder').locator('.action-edit'));
  const roleRow = page.locator('.add-junction-row');
  await film.choose(roleRow.locator('mat-select'), 'Teamleider');
  await film.click(roleRow.getByRole('button', { name: /toevoegen/i }));
  await film.wait(900);
}

async function scene4DaanHandsOutOnlyWhatHeHas(page, film) {
  await film.card('4. Alleen uitdelen wat je zelf hebt', 'Wat ziet Daan?', 2800);
  await film.click(page.locator('button').filter({ has: page.locator('mat-icon', { hasText: 'logout' }) }).first());
  await page.waitForURL('**/login');
  await loginAs(page, film, DAAN.userName, DAAN.password);

  await film.click(navLink(page, 'Rollen'));
  await row(page, 'Boekhouder').waitFor();
  await film.say('Boven zijn niveau', 'MANAGER en Boekhouder kan Daan alleen bekijken: daar zitten rechten in die hij zelf niet heeft.');
  await film.moveTo(row(page, 'Boekhouder'));

  await film.click(newButton(page, /nieuwe rol/i));
  await page.locator('app-role-authority-matrix').waitFor();
  await page.waitForLoadState('networkidle');
  await film.type(control(page, 'description'), 'Stagiair');
  await film.click(page.locator('mat-select.template'), { force: true });
  await page.locator('mat-option').first().waitFor();
  await film.say('Sjabloon', 'Als sjabloon ziet hij alleen rollen waarvan hij alle rechten zelf heeft. Geen MANAGER, geen Boekhouder.');
  await film.click(page.locator('mat-option').filter({ hasText: 'EMPLOYEE' }));

  await film.say('Gearceerde vakjes', 'Gearceerd zijn rechten die Daan zelf niet heeft, zoals betalingen wijzigen. '
    + 'Die kan hij dus ook niet uitdelen.');
  await film.moveTo(box(page, 'PAYMENT_UPDATE'));
  await film.wait(1000);
  await saveRole(page, film);

  await film.say('Geen escalatie', 'En zichzelf manager maken? Bij zijn eigen account staat MANAGER niet eens in de lijst.');
  await film.click(navLink(page, 'Accounts'));
  await film.click(row(page, 'daan.mulder').locator('.action-edit'));
  const select = page.locator('.add-junction-row mat-select');
  await film.click(select, { force: true });
  await page.locator('mat-option').first().waitFor();
  await film.wait(1800);
  await page.keyboard.press('Escape');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
