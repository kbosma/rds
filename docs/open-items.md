# Openstaande punten, risico's en ideeën

Eerlijke lijst van wat niet af, niet getest of risicovol is, gevonden bij het nalopen van code en configuratie op 15-10-2026. Prioriteit: **H**oog / **M**idden / **L**aag. Haal een punt weg als het is opgelost, en noteer de oplossing in [design-decisions.md](design-decisions.md) als er een keuze achter zat.

## Beveiliging en configuratie

| # | Prio | Punt | Toelichting |
|---|---|---|---|
| 1 | M | **Geheimen in de repository** | `src/main/resources/application.yaml` staat in git en bevat het JWT-secret, databasegegevens en een Mollie-sleutel; `V2__initial_data.sql` bevat Mollie-sleutels per organisatie en `rds-platform.p12` (keystore) staat in git. De Mollie-sleutels zijn **test-only** (bevestigd door de gebruiker). Blijft staan: het JWT-secret en de keystore horen in een secret-store/omgevingsvariabelen zodra er echte data of een publieke omgeving komt, en een productie-Mollie-sleutel mag hier nooit komen. |
| 2 | H | **Eén globale Mollie-sleutel** | `MollieConfig` gebruikt `app.mollie.key`; `organization.mollie_key` wordt nergens gebruikt. Alle betalingen van alle organisaties gaan dus naar één Mollie-account. Fix: de REST-client per organisatie bouwen (sleutel van de boeking/organisatie). |
| 3 | H | **OTP-mail is een stub** | `OtpEmailService.sendOtp` logt de code. Klanten kunnen dus niet echt inloggen. De e-mailinfrastructuur (`EmailSender`, afzender per organisatie) bestaat nu; hergebruik die en maak er een systeem-template van. |
| 4 | M | **OTP-beheer** | `max-active-per-email` telt ook **verlopen** (niet-geverifieerde) codes mee: na een paar aanvragen kan een klant geen nieuwe code meer krijgen. Verlopen rijen worden nooit opgeruimd (`OtpRepository.deleteByExpiresAtBefore` bestaat, maar wordt nergens aangeroepen en er is geen scheduler). Er is geen teller voor foute pogingen (alleen de NGINX-rate-limit). Voeg opschoning en een limiet per code toe. |
| 5 | M | `account.expires_at` wordt **niet afgedwongen** | Het veld bestaat en is bewerkbaar, maar `CustomUserDetailsService` kijkt alleen naar `locked`. |
| 7 | M | **Publiek adres is http** | E-mailafbeeldingen en de Mollie-webhook gaan via `http://178.104.163.88`. Een domein met TLS (en `app.email.public-api-base-url` aanpassen) is het doel. |
| 8 | M | JWT in `localStorage`, geen intrekking | Een gestolen token is tot 1 uur geldig (employee én booker); geen refresh/revocation. Acceptabel voor nu, maar bewust: XSS-risico beperken door de editor-HTML nooit zonder sanitizer te renderen (de preview gebruikt een sandbox-iframe zonder scripts). |
| 9 | L | Actuator en `/monitoring` | Alleen via NGINX afgeschermd; controleer welke Actuator-endpoints Spring zelf blootstelt. |
| 10 | L | Mollie-webhook heeft geen handtekening | Mollie's klassieke webhooks zijn niet getekend; de backend haalt de status zelf op en valideert het id. Verder niets te doen, maar houd het in de gaten. |

## Functionaliteit en gedrag

| # | Prio | Punt | Toelichting |
|---|---|---|---|
| 11 | M | **E-mail is synchroon en zonder retry** | Een trage of falende relay komt als fout op de request terug; geen wachtrij, geen bijlagen, geen CC/BCC, geen tracking. Zie [email.md](email.md). |
| 12 | M | **SMTP in productie** | Lokaal is alles log-only. Controleer dat `SPRING_MAIL_*` op de server staat, dat `email_from` per organisatie gevuld is (alleen ADMIN kan dat bewerken) en dat SPF/DKIM bij de relay kloppen. |
| 13 | M | Twee manieren om een Mollie-betaling te starten | `POST /api/mollie/payments/create-at-mollie` (medewerker, maakt direct een betaling bij Mollie en een nieuw record) en de portal-flow (`…/pay/{id}`, werkt een bestaand record bij). Kies één leidend pad en verwijder of documenteer het andere. |
| 14b | L | Rol↔authority is globaal | Een wijziging in het rolscherm geldt voor alle organisaties tegelijk; ADMIN heeft `ROLEAUTHORITY_READ/CREATE/DELETE`, MANAGER alleen `_READ`. Ontkoppel je een authority die een ingelogde gebruiker nu gebruikt, dan merkt die dat pas bij een nieuw token (tot een uur). |
| 14a | L | Verwijderbescherming kijkt alleen naar documenten en betalingen | `DeletionGuard` weigert verwijderen als er documenten of betalingen aan hangen. Een boeking zonder die geschiedenis, of een accommodatie/leverancier/activiteit in zo'n boeking, mag nog wel weg en neemt dan zijn boekingsregels en -activiteiten mee (database-cascade). Is dat te ruim, breid de guard dan uit (bv. ook reizigers of de status). |
| 14 | M | Statusovergangen van een boeking zijn vrij | Geen toestandsmachine; elke status kan op elk moment gezet worden. Bepaal of dat zo moet blijven. |
| 15 | L | Word-template-editor: beperkingen | Geen geneste tabellen, geen kop-/voettekst of paginanummers, maximaal 64 kolommen, WebP niet; een geüploade .docx is niet te bewerken. Zie [templates.md](templates.md). |
| 16 | L | "In gebruik" van een afbeelding = tekst zoeken in de HTML | `LIKE` op `body_html`/`source_html`; geen echte koppeling afbeelding ↔ template. Bij veel templates of een formaatwijziging van het pad is een koppeltabel robuuster. |
| 17 | L | `${prospect.gender}` is nu `MAN` i.p.v. `man` | Bewuste wijziging voor één model; bestaande e-mailtemplates met die waarde (indien al in gebruik) kunnen anders ogen. |
| 18 | L | Bedragen in templates | Zonder `?string("#,##0.00")` toont FreeMarker `1250.00` als `1.250`. Bestaande, geüploade Word-templates kunnen dit probleem hebben. |
| 19 | L | Datums in templates zijn ISO-tekst | Geen lokale opmaak (`dd-MM-jjjj`); dat kan in de template (FreeMarker-functies) of centraal in `TemplateModels`. |

## Testen en kwaliteit

| # | Prio | Punt | Toelichting |
|---|---|---|---|
| 20 | M | **`frontend-booker` is vrijwel niet getest** | 1 spec-bestand voor 7 schermen en de OTP-flow. |
| 21 | M | **29 van 63 componenten in `frontend-employee` hebben geen spec** | o.a. boekingsregel-/activiteit-/bewerk-dialogen, organisatie-onboarding, rol-/authority-/accountdetails, profiel/TOTP-dialogen, accommodatie- en activiteitdetails, document-upload, de detailpagina's van persoon en account. 10 van 29 services hebben geen spec. |
| 22 | M | Geen test van volledige UI-flows (e2e) | Alles is unit-/MockMvc-niveau; de editor-in-een-browser is alleen met Karma getest. |
| 23 | L | Wegwerp-database is een handmatig recept | Zie [build-test-deploy.md](build-test-deploy.md); een Testcontainers-opzet zou dit overbodig maken (vereist Docker). |
| 24 | L | Geen CI-pipeline in de repository | Bouwen/testen/deployen gaat via lokale scripts. |

## Documentatie en repo-hygiëne (buiten `docs/`)

*Opgelost op 15-10-2026: de losse tekst onderaan `CLAUDE.md` is verwijderd (de regels staan in [working-agreements.md](working-agreements.md)) en `CLAUDE.md` verwijst nu naar de index, de werkafspraken en build-test-deploy.*

| # | Punt |
|---|---|
| 25 | `frontend-employee/README.md` en `frontend-booker/README.md` zijn de standaard Angular-CLI-tekst (noemen Angular 19.2); verwijs naar deze map of vervang ze. |
| 26 | Er is geen README in de repo-root; `docs/README.md` kan die rol vervullen (of een korte root-README die ernaar verwijst). |
| 27 | `access.log` en `application-rds-local.yaml` staan terecht in `.gitignore`; controleer periodiek dat er geen logs of lokale configuratie in een commit belanden. |

## Ideeën (nog niet gevraagd)

- Systeem-e-mails (OTP, welkom) als template per organisatie.
- Boekingsstatus automatisch laten volgen op betalingen (voorschot betaald → `voorschot`/`betaald`).
- Herhaalde tabellen met meer lijsten (adressen, betalingen) en een kop-/voettekst in Word-templates.
- Eén centrale foutvertaling in de frontend (`error.error.message` → vertaalde tekst via een foutcode).
