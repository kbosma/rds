# Filmpjes voor de gebruikershandleiding

Video's die in de echte schermen van RDS (medewerkersapp en boekerportaal) zijn opgenomen, met ondertitels:

| Filmpje | Script | In de handleiding |
|---|---|---|
| Van aanvraag tot afgeronde reis (prospect → afgerond) | `record.mjs` → `out/boekingsfilmpje.webm` | hoofdstuk 12 |
| Templates maken (e-mail en Word/PDF) | `record-templates.mjs` → `out/templatesfilmpje.webm` | hoofdstuk 11 |
| Je organisatie inrichten (huisstijl, personen, accounts, stamgegevens, instellingen) | `record-beheer.mjs` → `out/beheerfilmpje.webm` | hoofdstuk 15 |
| Eigen rollen (rechtenmatrix, vereisten, alleen uitdelen wat je zelf hebt) | `record-rollen.mjs` → `out/rollenfilmpje.webm` | hoofdstuk 15.5 |

De video's staan niet in git (te groot; `docs/gebruikershandleiding/video/` staat in `.gitignore`). Kopieer ze na het
opnemen naar die map, of verspreid ze apart.

Een script bedient de app (Playwright) en neemt het op. Na een wijziging in de schermen draai je het opnieuw en is het
filmpje weer actueel.

## Hoe het nep blijft

De opname draait tegen een backend met profiel **`demo`** (`src/main/resources/application-demo.yaml`,
code in `nl.puurkroatie.rds.demo`) en een eigen, lege database. Niets daarvan bestaat zonder dat profiel.

| Wat | In de demo |
|---|---|
| E-mail | Niets wordt verstuurd; alle mails (ook de inlogcode van het portaal) komen in de demo-postbus: `http://localhost:8667/rds/demo/mailbox` |
| Mollie | De Mollie-API wijst naar een nep-Mollie in de app zelf, met een nagebootste betaalpagina. Na "Betalen" roept die de echte webhook van RDS aan. |
| Tijd | De klok van de statusengine en het betaalschema is verschuifbaar: `POST /demo/clock?date=2027-07-12` (en `DELETE` = terug naar nu). Daarna rekent de statusengine meteen. |
| Data | `seed.mjs` maakt via de gewone API de organisatie "Zonnige Reizen" met een manager, stamgegevens, templates en instellingen. Klant, boeking en de rest ontstaan in beeld. |

De paden onder `/demo/**` zijn zonder inloggen bereikbaar (alleen in het demo-profiel). Draai het profiel daarom
alleen lokaal, nooit op test of productie.

## Opnemen

Eenmalig: `npm install` en `npx playwright install chromium` in deze map.

1. Een lege PostgreSQL-database `rdsdemo` op poort 55433 (gebruiker en wachtwoord `rds`), bijvoorbeeld een wegwerp-cluster:
   ```bash
   initdb -D /tmp/pgdemo -U rds --pwfile=<(echo rds) -A md5
   pg_ctl -D /tmp/pgdemo -o "-p 55433 -k ''" -l /tmp/pgdemo.log start
   PGPASSWORD=rds createdb -h 127.0.0.1 -p 55433 -U rds rdsdemo
   ```
   Andere database? Zet `DEMO_DATASOURCE_URL`, `DEMO_DATASOURCE_USERNAME` en `DEMO_DATASOURCE_PASSWORD`.
2. De backend met het demo-profiel (poort 8667, naast een gewone backend op 8666):
   ```bash
   SPRING_PROFILES_ACTIVE=demo ./mvnw spring-boot:run
   ```
3. De twee frontends met de demo-proxy:
   ```bash
   cd frontend-employee && npx ng serve --port 4210 --proxy-config ../demo-film/proxy.demo.json
   cd frontend-booker && npx ng serve --port 4310 --proxy-config ../demo-film/proxy.demo.json
   ```
4. Demodata en opname:
   ```bash
   cd demo-film && npm run seed && npm run record
   ```
   Het filmpje komt in `demo-film/out/boekingsfilmpje.webm`. Kopieer het naar `docs/gebruikershandleiding/video/`.
   Het rollenfilmpje: `npm run record:rollen` (maakt buiten beeld medewerker Daan Mulder aan).
   Het templatefilmpje: `npm run record:templates` (ook op een verse, geseede database; het maakt buiten beeld zelf
   een voorbeeldboeking). Voor de PDF in beeld gebruikt het `sips` (macOS).
   Het beheerfilmpje: `npm run record:beheer` (op een verse, geseede database; het zet buiten beeld de huisstijl terug
   naar de standaardkleuren, zodat Sanne hem in beeld instelt).

Opnieuw opnemen kan alleen op een lege database (de seed maakt de organisatie één keer aan en elk script verwacht één
klant Anna de Vries). Begin dus voor elk filmpje met een nieuwe `rdsdemo` en een herstart van de backend.

Handig bij het aanpassen: `PACE=0.4 npm run record` (sneller), `HEADED=1 npm run record` (browser zichtbaar) en
`SNAPSHOTS=1` (een screenshot bij elke ondertitel). Neem de definitieve versie op zonder `SNAPSHOTS`: de screenshots
kosten tijd en geven haperingen.

**Stille stukken.** Na elke opname staat in `out/…/pauzes.txt` waar het beeld langer dan 1,2 seconde stilstaat
zonder dat er iets gebeurt (het script wacht dan op de pagina). Houd die lijst kort: zet een ondertitel neer terwijl
RDS werkt, of maak een vaste wachttijd korter. Ondertitels blijven staan zo lang als nodig is om ze te lezen
(± 16 tekens per seconde).

## Draaiboek boekingsfilmpje

1. Inloggen als Sanne (manager van Zonnige Reizen).
2. Anna de Vries registreren als prospect.
3. Nieuwe boeking: reizigers Anna en Mark, Villa Oliva (twee weken), een boottocht.
4. Offerte versturen → status Offerte, PDF en mail bij de boeking; de mail in Anna's postbus.
5. Anna gaat akkoord: Offerte bevestigd → status Boeking, betalingen aangemaakt, betaalmail.
6. Anna logt in op het reisportaal met een inlogcode en betaalt voorschot en restant → Voorschot, Betaald.
7. Melding "alles betaald" afhandelen.
8. Klok naar de reisdatum → Op reis; daarna naar na de reis → Weer thuis; meldingen afhandelen → Afgerond;
   statusgeschiedenis.

## Draaiboek templatefilmpje

1. E-mailtemplate "Reisbescheiden": onderwerp met boekingsnummer, tekst met variabelen (voornaam, vertrekdatum), vet,
   een logo uploaden en invoegen.
2. Vanuit de boeking van Anna: E-mail aan hoofdboeker, voorbeeld genereren, versturen; de mail in Anna's postbus.
3. Word-template "Reisbevestiging" in de editor: kop met boekingsnummer, aanhef, herhaalde tabellen voor reizigers en
   accommodaties.
4. Vanuit de boeking: Document, PDF, zichtbaar in het portaal; de eerste pagina van de echte PDF in beeld.

## Draaiboek beheerfilmpje

1. Huisstijl: van de standaardkleuren naar die van Zonnige Reizen; voorbeeld en opslaan.
2. Nieuwe collega: persoon Daan Mulder, account `daan.mulder` (wachtwoord moet gewijzigd worden), rol EMPLOYEE.
3. Leverancier Adriatic Homes (ADRIATIC) met adres in Poreč.
4. Accommodatie Appartement Lavanda (APP-LAVANDA): leverancier koppelen, adres toevoegen.
5. Activiteit Wijnproeverij in Motovun (tour).
6. Instellingen: offerte- en betaalmail, voorschot van 30 naar 25 procent.
7. Daan logt in, kiest een eigen wachtwoord en ziet het menu van een medewerker.

## Draaiboek rollenfilmpje

1. Systeemrollen: MANAGER en EMPLOYEE met slotje en aantal accounts; de matrix van EMPLOYEE is grijs.
2. Sanne maakt "Boekhouder": Betalingen wijzigen aanvinken haalt betalingen en boekingen lezen mee; lezen weghalen
   kan niet zolang wijzigen aan staat (melding van RDS); de geschiedenis van de rol.
3. "Teamleider" als kopie van EMPLOYEE, plus rollen beheren en toewijzen; Daan krijgt die rol.
4. Daan: MANAGER en Boekhouder alleen te bekijken (boven zijn niveau); bij "Kopie van" alleen EMPLOYEE en Teamleider;
   gearceerde vakjes in de matrix; MANAGER staat niet in de lijst bij zijn eigen account.
