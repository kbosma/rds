# RDS — documentatie-index

**RDS = Reis Dossier Systeem**: een multi-tenant SaaS voor reisorganisaties om boekingen (dossiers) te beheren, documenten en e-mails te genereren en betalingen via Mollie af te handelen. Eén Spring Boot-backend, twee Angular-apps.

> **Nieuwe sessie? Lees in deze volgorde (±10 minuten):**
> 1. dit bestand (index + snelle feiten hieronder)
> 2. [overview.md](overview.md) — wat het systeem doet, voor wie, en hoe het in elkaar zit
> 3. [working-agreements.md](working-agreements.md) — hoe er met de gebruiker gewerkt wordt (taal, git, tests, grenzen)
> 4. [open-items.md](open-items.md) — wat nog openstaat
>
> Daarna alleen het document dat bij de taak past (tabel hieronder). De regels in `CLAUDE.md` (repo-root) blijven leidend; deze map is de uitleg erbij.

## Welk document bij welke vraag?

| Ik wil weten… | Open |
|---|---|
| Wat doet het systeem, wie gebruikt het, wat zijn de schermen? | [overview.md](overview.md) |
| Woorden als *prospect*, *hoofdboeker*, *tenant*, *herhaalde tabel*? | [glossary.md](glossary.md) |
| Hoe is de backend opgebouwd (lagen, pakketten, patronen)? | [architecture.md](architecture.md) |
| Hoe zijn de twee Angular-apps opgebouwd, welke conventies? | [frontend.md](frontend.md) |
| Welke entiteiten/tabellen, relaties, enums? | [database-model.md](database-model.md) |
| Wat is een boeking, de levenscyclus, prospect → boeker, concept-boeking? | [domain.md](domain.md) |
| JWT, rollen, authorities, TOTP, tenant-isolatie, afscherming? | [security.md](security.md) |
| Alle REST-endpoints met benodigde authority + voorbeelden? | [api-examples.md](api-examples.md) |
| Booker-portal (klant) en OTP-login? | [bookerportal.md](bookerportal.md) |
| Betalingen, webhook, Mollie-flow? | [mollie.md](mollie.md) |
| E-mailtemplates, versturen, SMTP, afbeeldingen in mail? | [email.md](email.md) |
| Gedeelde template-editor, Word-templates (.docx), herhaalde tabellen? | [templates.md](templates.md) |
| Bouwen, testen (met embedded PostgreSQL), deployen, poorten? | [build-test-deploy.md](build-test-deploy.md) |
| Waarom is iets zo ontworpen? Wat hebben we geleerd? | [design-decisions.md](design-decisions.md) |
| Wat is nog niet af of risicovol? | [open-items.md](open-items.md) |
| Afspraken met de gebruiker (taal, git, tests, grenzen)? | [working-agreements.md](working-agreements.md) |

## Snelle feiten

| | |
|---|---|
| Backend | Spring Boot 4.0.3, Java 21, Jetty (poort **8666**, context-path **`/rds`**), JPA (`ddl-auto: validate`), Flyway (V1–V8), MapStruct, PostgreSQL 17 (`rdsdb`) |
| Frontends | `frontend-employee` (medewerkers, dev-poort 4200) en `frontend-booker` (klanten, dev-poort 4300); Angular 22, standalone + signals, Angular Material, ngx-translate (nl/en), TypeScript 6 |
| Pakketten (backend) | `nl.puurkroatie.rds.{auth, booking, mollie, bookerportal, email, docgen, common}` |
| Multi-tenant | elke tenant-entiteit heeft `tenant_organization`; filtering via `TenantContext` (zie [security.md](security.md)) |
| Rechten in de UI | op **authorities**, nooit op rollen |
| Rollen | `ADMIN` (systeembeheer), `MANAGER` (eigen organisatie, volledig), `EMPLOYEE` (eigen organisatie, beperkt) |
| Templating | FreeMarker, afgeschermd; één model voor e-mail én Word (zie [templates.md](templates.md)) |
| Betalingen | Mollie (webhook via NGINX op het publieke IP) |
| Tests (stand 19-10-2026) | backend 697 (JUnit 5/Mockito/MockMvc), employee-frontend 562 specs (Jasmine/Karma, Firefox headless) |
| Datum van deze documentatie | laatst bijgewerkt 15-10-2026 |

## Over deze map

- Taal: Nederlands; technische termen, identifiers en code blijven zoals ze zijn.
- Feiten zijn waar mogelijk uit de code gehaald (bv. de endpointtabel in [api-examples.md](api-examples.md)). Wijkt een document af van de code, dan wint de code — corrigeer het document.
- `CLAUDE.md` (repo-root) verwijst naar deze index en naar de afzonderlijke documenten; de bestandsnamen zijn daarom stabiel. Nieuw document toevoegen ⇒ ook hier in de tabel en in de lijst "Context gebruik" van `CLAUDE.md`.
