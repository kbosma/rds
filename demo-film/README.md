# Boekingsfilmpje

Een video van een fictieve klant van prospect tot afgeronde reis, opgenomen in de echte schermen van RDS
(medewerkersapp en boekerportaal) met ondertitels. Het resultaat staat in de gebruikershandleiding
(`docs/gebruikershandleiding/video/boekingsfilmpje.webm`, hoofdstuk 12).

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

Opnieuw opnemen kan alleen op een lege database (de seed maakt de organisatie één keer aan en het script verwacht één
klant Anna de Vries). Begin dus met een nieuwe `rdsdemo` en een herstart van de backend.

Handig bij het aanpassen: `PACE=0.4 npm run record` (sneller) en `HEADED=1 npm run record` (browser zichtbaar).

## Draaiboek

1. Inloggen als Sanne (manager van Zonnige Reizen).
2. Anna de Vries registreren als prospect.
3. Nieuwe boeking: reizigers Anna en Mark, Villa Oliva (twee weken), een boottocht.
4. Offerte versturen → status Offerte, PDF en mail bij de boeking; de mail in Anna's postbus.
5. Anna gaat akkoord: Offerte bevestigd → status Boeking, betalingen aangemaakt, betaalmail.
6. Anna logt in op het reisportaal met een inlogcode en betaalt voorschot en restant → Voorschot, Betaald.
7. Melding "alles betaald" afhandelen.
8. Klok naar de reisdatum → Op reis; daarna naar na de reis → Weer thuis; meldingen afhandelen → Afgerond;
   statusgeschiedenis.
