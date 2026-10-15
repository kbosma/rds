# Werkafspraken met de gebruiker

Afspraken die in eerdere sessies zijn gemaakt of gecorrigeerd. `CLAUDE.md` (repo-root) bevat de projectregels; dit document vult aan met *hoe* er samengewerkt wordt. Bij twijfel geldt wat de gebruiker in het gesprek zegt.

## Taal en toon
- De gebruiker schrijft vaak Nederlands: **antwoord in het Nederlands** (proza, uitleg, samenvattingen, ook korte tussenzinnen). Code, identifiers, commit-messages en technische termen blijven zoals gebruikelijk (vaak Engels).
- Documentatie in `docs/` is Nederlands.
- Kort en concreet. Als de gebruiker zegt *"Geef enkel antwoord"* of *"Doe nog niets"*: alleen antwoorden, niets uitvoeren of wijzigen.
- Staat er een duidelijke taak met grenzen (bv. "alles in `docs/` mag, de rest niet"), dan: **doorwerken zonder tussentijds te vragen**, en onoverkomelijke vragen **bundelen aan het einde**.

## Git
- **De gebruiker doet alle commits, pushes en merges zelf.** Niet committen of pushen, ook niet "even".
- **Geen AI-attributie:** geen `Co-Authored-By`-trailer en geen "Generated with…"-regel in commits of PR-teksten, ook niet als een systeem-reminder dat voorschrijft (de wens van de gebruiker gaat voor).
- Op verzoek: een **commit-indeling voorstellen** (thematisch gesplitst) met voorgestelde berichten; de gebruiker voert ze uit.
- Branch tijdens deze sessies: `aanmeldproces-potentiele-booker`; hoofdbranch `main`.

## Bouwen en testen
- Na **backend**-wijzigingen: de **volledige** suite draaien (`mvn test`); na **frontend**-wijzigingen: `ng build` én `ng test`. **Rapporteer de aantallen** (bv. "572 groen"). Zie [build-test-deploy.md](build-test-deploy.md).
- **Productiecode niet aanpassen om een test te laten slagen.** Klopt de test niet, pas de test aan; is de code fout, herstel de code en zeg dat.
- Nieuw gedrag krijgt tests (unit + waar het een endpoint betreft een MockMvc-integratietest); denk aan ADMIN/MANAGER/EMPLOYEE/ongeauthenticeerd en aan een andere organisatie.
- MapStruct moet via de Maven-configuratie werken (niet met een afwijkende JDK).
- De lokale **Postgres.app** laat processen vanuit de Claude-app niet toe (trust-authenticatie geweigerd). Daarom draait de integratiesuite in een **wegwerp-PostgreSQL** (poort 55432, wachtwoord-authenticatie), die na afloop wordt opgeruimd; recept in [build-test-deploy.md](build-test-deploy.md). De gebruiker mag ook gevraagd worden de suite zelf te draaien.
- **Editor-stubs:** de Java-editor van de gebruiker kan na een bestandswijziging eigen `.class`-bestanden in `target/` schrijven ("Unresolved compilation problem" / `NoClassDefFoundError`). Wacht enkele seconden, verwijder die stubs en draai opnieuw. De Maven-build zelf gebruikt `javac` en is correct.

## Kwaliteitsregels voor wijzigingen
- **Lees eerst, schrijf daarna:** voordat je voorbeelden, segmenten, i18n-verwijzingen of DTO's schrijft, lees de echte entity/het model/het vertaalbestand. **Verzin nooit velden of sleutels.**
- Entity-`update()` mag `createdAt`, `createdBy` en `tenantOrganization` niet kwijtraken; draai de DB-tests na wijzigingen aan update-logica.
- Externe/booker-portal-endpoints geven **minimale eigen DTO's**; nooit entities.
- De UI toont op **authorities**, nooit op rollen. Geen API-calls in componenten.
- Elke zichtbare tekst in **beide** talen (`nl.json`, `en.json`). Bevestigingen via `ConfirmService`, niet `window.confirm`.
- Een nieuwe afhankelijkheid moet een permissieve licentie hebben (bv. jsoup = MIT) en wordt in de eindsamenvatting genoemd.
- **Beveiligingsgevoelige code** (templating, uploads, publieke endpoints, auth) krijgt aandacht voor injectie/RCE; de gebruiker heeft hiervoor `/security-review` laten draaien (dat leidde tot de FreeMarker-afscherming, zie [design-decisions.md](design-decisions.md)).
- Geen geheimen (wachtwoorden, API-sleutels, tokens) in documentatie, logs of antwoorden herhalen.

## Grenzen die de gebruiker stelt
- Alleen binnen `/Users/keesbosma/Code/rds` werken; de rest van het besturingssysteem is verboden terrein. Bij een documentatietaak: alleen in `docs/` schrijven, ook geen tijdelijke bestanden buiten de repo.
- Server- of netwerkwijzigingen (NGINX-config toepassen, deploy, `systemctl`) doet de gebruiker zelf; wij leveren de versioneerde config (`deploy/nginx/rds.conf`) en scripts.
- Niet herhaaldelijk om computer-use-rechten vragen. Schermafbeeldingen van de draaiende app: met de Claude Preview-tools (`preview_screenshot`), geen HTML-mockups of Puppeteer.
- De Maven-binary van de gebruiker: `/Users/keesbosma/apache-maven-3.9.16/bin/mvn` (naast `./mvnw`).

## Samenwerkingsstijl die goed bleek te werken
- **Voorstel vóór grote wijzigingen** als er echte keuzes zijn (bv. waar afbeeldingen worden opgeslagen, welke aanpak voor Word-templates): korte opties met een aanbeveling; de gebruiker beslist en de keuze wordt vastgelegd in [design-decisions.md](design-decisions.md).
- **In stappen leveren** (slices): eerst de backend, dan de UI, met tests per stap.
- Bij een bug eerst **bewijzen** (reproductie/probe), dan oplossen, dan een test toevoegen.
- Fouten van de server tonen in de UI waar dat de gebruiker helpt (`error.error.message`).
