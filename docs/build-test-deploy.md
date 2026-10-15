# Bouwen, testen, draaien en deployen

## Vereisten

- JDK 21, Maven 3.9 (`./mvnw` of de eigen installatie, bv. `/Users/keesbosma/apache-maven-3.9.16/bin/mvn`)
- Node + npm (Angular 22), een browser voor `ng test` (Firefox of Chrome)
- PostgreSQL 17 lokaal (Postgres.app): database `rdsdb`, gebruiker/wachtwoord `rds`/`rds` op `localhost:5432` (zie `application.yaml`)

## Lokaal draaien

```bash
# backend (poort 8666, context-path /rds, alleen op 127.0.0.1); Flyway migreert bij het starten
./mvnw spring-boot:run

# medewerkers-app  → http://localhost:4200  (dev-proxy: /api → http://localhost:8666/rds/api)
cd frontend-employee && npm install && npm start

# klanten-app      → http://localhost:4300
cd frontend-booker && npm install && npm start
```

- E-mail is lokaal **log-only** zolang `spring.mail.host` niet gezet is (niets wordt echt verstuurd; de mail komt in het log).
- Mollie lokaal: `start/scripts/start-mollie-tunnel.sh` (Cloudflare quick-tunnel) schrijft de publieke webhook-URL in `application-rds-local.yaml`; start de backend met profiel `rds-local`; stoppen met `stop-mollie-tunnel.sh`. De tunnel-URL verandert bij elke start.
- De OTP-code voor de klantenportal staat in het backend-log (zie [bookerportal.md](bookerportal.md)).

## Backend bouwen en testen

```bash
mvn clean install        # compileert (incl. MapStruct), draait alle tests, bouwt de jar
mvn test                 # alleen de tests
mvn -q -DskipTests compile
mvn -q -Dtest='NaamTest' -DfailIfNoTests=false test   # één klasse
```

- Unit-tests (Mockito) hebben geen database nodig. De **integratietests** (`*ControllerTest`, `ApplicationTests`) starten de hele Spring-context met `@SpringBootTest` + MockMvc en draaien `@Transactional` (rollback per test) tegen de seeddata van V2. Basisklassen: `AbstractControllerTest` (organisaties, login-helpers) en `AbstractBookingControllerTest` (vaste UUID's voor boekingen, bookers, …).
- Stand 15-10-2026: **597 tests, 0 failures** (waarvan ±50 testklassen); jsoup-, POI- en xdocreport-gedrag wordt door `HtmlToDocxConverterTest` end-to-end gedekt.
- `DeleteVerificationControllerTest` controleert voor elke resource dat een delete het record **echt** weghaalt (GET 200 → DELETE 204 → GET 404; daarna `flush()`/`clear()` omdat een MockMvc-IT in één transactie draait en de persistence-context anders een database-cascade verbergt).
- Nieuwe migratie ⇒ nieuw bestand `V<n>__omschrijving.sql`; de volledige suite valideert het schema (`ddl-auto: validate`).

### Wegwerp-database voor de volledige suite

Handig als de lokale Postgres.app geen verbindingen van de Claude-app toestaat, of om de suite zonder bijwerkingen te draaien. Alles staat in een tijdelijke map die na afloop verdwijnt.

```bash
PGBIN=/Applications/Postgres.app/Contents/Versions/17/bin
BASE=$(mktemp -d); LOG="$BASE/test.log"
cleanup() { "$PGBIN/pg_ctl" -D "$BASE/data" -m fast stop >/dev/null 2>&1; rm -rf "$BASE"; }
trap cleanup EXIT
echo "wegwerp-wachtwoord" > "$BASE/pw"
"$PGBIN/initdb" -D "$BASE/data" -U postgres --auth-host=scram-sha-256 --auth-local=scram-sha-256 \
    --pwfile="$BASE/pw" -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$BASE/data" -l "$BASE/server.log" \
    -o "-p 55432 -c listen_addresses=127.0.0.1 -c unix_socket_directories=" -w start >/dev/null
export PGPASSWORD="wegwerp-wachtwoord"
"$PGBIN/psql" -h 127.0.0.1 -p 55432 -U postgres -q \
    -c "CREATE ROLE rds LOGIN PASSWORD 'rds';" -c "CREATE DATABASE rdsdb OWNER rds;"
export SPRING_DATASOURCE_URL="jdbc:postgresql://127.0.0.1:55432/rdsdb" \
       SPRING_DATASOURCE_USERNAME=rds SPRING_DATASOURCE_PASSWORD=rds
./mvnw test > "$LOG" 2>&1; echo "mvn exit: $?"
grep -E "Tests run:.*Skipped: [0-9]+$|BUILD (SUCCESS|FAILURE)" "$LOG" | tail -3
```

Let op bij een eigen schijf-/map-keuze: de map moet op dezelfde machine staan en mag niet bij de repo horen. Draai dit niet tegen de echte `rdsdb`.

### Bekende kuren
- **Editor-stubs in `target/`** ("Unresolved compilation problem"): wacht een paar seconden na het opslaan, verwijder de betrokken `.class`-bestanden en draai opnieuw; Maven zelf is correct.
- Een test die op een niet-bestaande boeking/booker uit de seed leunt: kijk naar de UUID's in de basisklassen en in `V2__initial_data.sql`.
- Wijzig je een FreeMarker-instelling in `FreemarkerHardening`: die past de **gedeelde** xdocreport-configuratie aan, dus een test kan niet "onbeveiligd" vergelijken (zie `DocgenTemplateInjectionTest`).

## Frontend bouwen en testen

```bash
cd frontend-employee   # idem frontend-booker
npx ng build                                   # standaardbuild (controleert o.a. of alles compileert)
npx ng build --configuration production --base-href /rds/     # productie (employee)
npx ng test --watch=false --browsers=FirefoxHeadless          # alle specs
npx ng test --watch=false --browsers=FirefoxHeadless \
    --include='src/app/shared/template-editor/**/*.spec.ts' \
    --include='src/app/translate-test.setup.spec.ts'          # een deel (setup altijd meenemen!)
```

- Stand 15-10-2026: **501 specs, 0 failures** in `frontend-employee`; `frontend-booker` heeft 1 spec.
- `src/app/translate-test.setup.spec.ts` laadt de echte nl-vertalingen in elke spec; wie specs selecteert met `--include` moet dat bestand mee-includen, anders zie je vertaalsleutels in plaats van tekst.
- TipTap in een test: de editor draait echt in Firefox; plak/drop-gedrag test je door de ProseMirror-handlers rechtstreeks aan te roepen (synthetische `ClipboardEvent`s dragen geen bestanden).
- Dev-proxy en `base href`: zie [frontend.md](frontend.md).

## Deployen

Scripts staan in `deploy/scripts/` en gebruiken `ssh`/`scp` naar `root@software.kbtg`:

| Script | Wat |
|---|---|
| `build-deploy-backend.sh` | `mvn clean package -DskipTests`, `systemctl stop rds`, jar naar `/opt/rds`, `systemctl start rds` |
| `build-deploy-frontend-employee.sh` | `ng build --configuration production --base-href /rds/`, kopieert naar `/var/www/rds`, `systemctl reload nginx` |
| `build-deploy-frontend-booker.sh` | idem met `--base-href /booker/` naar `/var/www/booker` |
| `build-deploy-all.sh` | alle drie achter elkaar |

**NGINX** (`deploy/nginx/rds.conf`, versioneerde kopie): `/rds/` → employee-app, `/booker/` → booker-app, `/api/` → `http://127.0.0.1:8666/rds/api/`, rate-limits op login/OTP/webhook/afbeeldingen, scanner-blokkade en `/monitoring` alleen voor beheer-IP's. **Het toepassen van die config op de server doet de gebruiker zelf** (kopiëren naar `sites-available`, `nginx -t`, reload). De `limit_req_zone`-regels horen in het `http{}`-blok van `nginx.conf`.

**Publiek IP (`178.104.163.88`)**: staat alleen open voor de Mollie-webhook en de publieke e-mailafbeeldingen (`/api/public/email-images/<uuid>`); `app.email.public-api-base-url` en `app.mollie.urls.webhook` verwijzen daarheen. Dat adres is nu **http**; een eigen domein met TLS is de nette eindsituatie (dan alleen die twee instellingen aanpassen).

**Serverconfig** (SMTP, geheimen) hoort in omgevingsvariabelen (`SPRING_MAIL_HOST`, …), niet in de repository.

## Logging en monitoring
- Jetty-access-log: `/opt/rds/log/access.log` (rotatie 30 dagen); lokaal profiel `rds-local` schrijft naar `access.log` in de werkmap.
- JavaMelody op `/monitoring` (SQL, HTTP-statistieken); alleen via NGINX voor beheer-IP's.
- Actuator is aanwezig; controleer welke endpoints open staan voordat je de server publiek maakt.
