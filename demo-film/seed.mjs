// Vult een lege demo-database (profiel 'demo') met een fictieve reisorganisatie, via de gewone API.
// Zo gaat de demodata door dezelfde validatie en regels als echte invoer.
//
//   node demo-film/seed.mjs            (backend op http://localhost:8667/rds, zie application-demo.yaml)
//
// Maakt: organisatie "Zonnige Reizen" met huisstijl, een manager (sanne.visser), stamgegevens (leverancier,
// accommodatie met adres, activiteit), een offerte-template (Word, uit de editor), twee e-mailtemplates en de
// organisatie-instellingen. De klant, de boeking en alles daarna maakt het opnamescript in beeld aan.

import { API, DEMO, login, api } from './lib/api.mjs';

const ADMIN = { userName: 'jan.vanbergen', password: 'password123' };
export const MANAGER = { userName: 'sanne.visser', password: 'Demo-Zonnig-2027' };

const money = (path) => '${' + path + '?string("#,##0.00")}';

const QUOTE_DOCUMENT_HTML = `
<h1>Offerte \${booking.bookingNumber}</h1>
<p>Beste \${booking.booker.firstname},</p>
<p>Hartelijk dank voor je aanvraag. Hieronder vind je onze offerte voor je reis van \${booking.fromDate} tot en met \${booking.untilDate}.</p>
<h2>Reizigers</h2>
<table data-repeat="booking.travelers" data-item="t">
  <tr><th>Voornaam</th><th>Achternaam</th><th>Geboortedatum</th></tr>
  <tr><td>\${t.firstname}</td><td>\${t.lastname}</td><td>\${t.birthdate}</td></tr>
</table>
<h2>Verblijf</h2>
<table data-repeat="booking.bookingLines" data-item="l">
  <tr><th>Accommodatie</th><th>Van</th><th>Tot</th><th>Prijs (€)</th></tr>
  <tr><td>\${l.accommodation.name}</td><td>\${l.fromDate}</td><td>\${l.untilDate}</td><td>${money('l.price')}</td></tr>
</table>
<h2>Activiteiten</h2>
<table data-repeat="booking.bookingActivities" data-item="a">
  <tr><th>Activiteit</th><th>Datum en tijd</th><th>Verzamelpunt</th><th>Prijs (€)</th></tr>
  <tr><td>\${a.activityName}</td><td>\${a.fromDate}</td><td>\${a.meetingPoint}</td><td>${money('a.totalPrice')}</td></tr>
</table>
<p><strong>Totaal: € ${money('booking.totalSum')}</strong></p>
<p>Akkoord? Laat het ons weten, dan maken we de boeking definitief.</p>
<p>Zonnige groet,<br>Sanne Visser<br>Zonnige Reizen</p>`;

const QUOTE_EMAIL_HTML = `
<p>Beste \${booking.booker.firstname},</p>
<p>In de bijlage vind je onze offerte voor je reis naar Istrië. Het totaalbedrag is € ${money('booking.totalSum')}.</p>
<p>Ben je akkoord? Beantwoord deze e-mail of bel ons, dan maken we de boeking definitief.</p>
<p>Zonnige groet,<br>Sanne Visser<br>Zonnige Reizen</p>`;

const PAYMENT_EMAIL_HTML = `
<p>Beste \${booking.booker.firstname},</p>
<p>Fijn dat je met ons op reis gaat! Je boeking \${booking.bookingNumber} is definitief. Dit zijn de betalingen:</p>
<table data-repeat="booking.payments" data-item="p">
  <tr><th>Omschrijving</th><th>Bedrag (€)</th><th>Uiterlijk</th></tr>
  <tr><td>\${p.description}</td><td>${money('p.amount')}</td><td>\${p.dueDate!""}</td></tr>
</table>
<p>Je betaalt eenvoudig in je persoonlijke reisportaal. Log in met je e-mailadres; je krijgt dan een inlogcode.</p>
<p>Zonnige groet,<br>Sanne Visser<br>Zonnige Reizen</p>`;

async function main() {
  const health = await fetch(`${DEMO}/clock`).catch(() => null);
  if (!health || !health.ok) {
    throw new Error(`Demo-backend niet bereikbaar op ${DEMO} (draait hij met profiel 'demo'?)`);
  }

  const admin = await login(ADMIN);
  const existing = (await api(admin, 'GET', '/organizations')).find((o) => o.name === 'Zonnige Reizen');
  if (existing) {
    console.log('Zonnige Reizen bestaat al; niets te doen. (Begin opnieuw met een lege demo-database.)');
    return;
  }

  // --- organisatie en manager (als ADMIN) ---
  const org = await api(admin, 'POST', '/organizations', { name: 'Zonnige Reizen', emailFrom: 'info@zonnigereizen.nl' });
  const person = await api(admin, 'POST', '/persons', { firstname: 'Sanne', prefix: null, lastname: 'Visser', tenantOrganization: org.organizationId });
  const account = await api(admin, 'POST', '/accounts', {
    userName: MANAGER.userName, password: MANAGER.password, personId: person.persoonId,
    locked: false, mustChangePassword: false, expiresAt: '2030-12-31T23:59:00',
  });
  // Elke organisatie heeft haar eigen, vergrendelde MANAGER-rol (aangemaakt met de organisatie): op systeemsleutel zoeken.
  const managerRole = (await api(admin, 'GET', `/roles?organizationId=${org.organizationId}`)).find((r) => r.systemKey === 'MANAGER');
  if (!managerRole) throw new Error('De nieuwe organisatie heeft geen MANAGER-rol');
  await api(admin, 'POST', '/account-roles', { accountId: account.accountId, roleId: managerRole.roleId });

  // --- alles hierna als de manager van Zonnige Reizen (tenant = haar organisatie) ---
  const m = await login(MANAGER);

  await api(m, 'POST', '/organization-themes', {
    tenantOrganization: org.organizationId, primaryColor: '#c2571a', accentColor: '#f2a541', cardTitleColor: '#8a3b10',
  });

  const supplier = await api(m, 'POST', '/suppliers', { key: 'ISTRAVILLAS', name: 'Istra Villas d.o.o.' });
  const villa = await api(m, 'POST', '/accommodations', { key: 'VILLA-OLIVA', name: 'Villa Oliva, Rovinj' });
  await api(m, 'POST', '/accommodation-suppliers', { accommodationId: villa.accommodationId, supplierId: supplier.supplierId });
  const villaAddress = await api(m, 'POST', '/addresses', {
    street: 'Ulica Vladimira Nazora', housenumber: 12, housenumberAddition: null, postalcode: '52210',
    city: 'Rovinj', country: 'Kroatië', addressrole: 'accommodatie',
  });
  await api(m, 'POST', '/accommodation-addresses', { accommodationId: villa.accommodationId, addressId: villaAddress.addressId });

  await api(m, 'POST', '/activities', {
    name: 'Boottocht naar de Limfjord', description: 'Dagtocht met lunch aan boord, vertrek vanuit de haven van Rovinj.',
    activityType: 'excursie',
  });

  const quoteDocument = await api(m, 'POST', '/document-templates', {
    name: 'Offerte', description: 'Offerte voor een boeking', sourceHtml: QUOTE_DOCUMENT_HTML.trim(),
  });
  const quoteEmail = await api(m, 'POST', '/email-templates', {
    name: 'Offerte', description: 'Begeleidende mail bij de offerte',
    subject: 'Je offerte ${booking.bookingNumber} van Zonnige Reizen', bodyHtml: QUOTE_EMAIL_HTML.trim(),
  });
  const paymentEmail = await api(m, 'POST', '/email-templates', {
    name: 'Betalingen', description: 'Betaalschema na bevestigen van de offerte',
    subject: 'Je boeking ${booking.bookingNumber} is definitief', bodyHtml: PAYMENT_EMAIL_HTML.trim(),
  });

  await api(m, 'PUT', '/organization-settings/mine', {
    quoteDocumentTemplateId: quoteDocument.documentTemplateId,
    quoteEmailTemplateId: quoteEmail.emailTemplateId,
    paymentEmailTemplateId: paymentEmail.emailTemplateId,
    depositPercentage: 30, depositWeeksBeforeDeparture: 12, balanceWeeksBeforeDeparture: 6,
  });

  console.log(`Klaar: Zonnige Reizen (${org.organizationId}); inloggen als ${MANAGER.userName}. API: ${API}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
