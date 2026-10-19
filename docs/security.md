# Security

Samenvatting: stateless JWT, multi-tenant per organisatie, rechten op **authorities**, optionele TOTP-2FA voor medewerkers, OTP-login voor klanten, en een afgeschermde template-engine omdat templates door gebruikers geschreven worden. Bekende risico's staan in [open-items.md](open-items.md).

## Tokens (JWT, HS-ondertekend, `JwtTokenProvider`)

| `type` | Wie | Levensduur | Belangrijkste claims |
|---|---|---|---|
| `EMPLOYEE` | ingelogde medewerker | `app.jwt.expiration-ms` (nu 1 uur) | `sub`=accountId, `org`, `personId`, `userName`, `personName`, `organizationName`, `authorities`, `roles` |
| `TOTP_PENDING` | tussenstap na wachtwoord als TOTP vereist is | kort | `sub`=accountId; geeft alleen toegang tot de TOTP-/herstelcode-login |
| `BOOKER` | klant na OTP | `app.jwt.booker-expiration-ms` (nu 1 uur) | `sub`=bookerId, `bookingId` |

Het token wordt door beide frontends in `localStorage` bewaard en als `Authorization: Bearer …` meegestuurd. Een `401` (behalve op login-endpoints) logt de gebruiker uit. Een token zonder `type` geldt als `EMPLOYEE`.

`JwtAuthenticationFilter` (vóór de Spring-filter): valideert het token, zet de `SecurityContext` en de ThreadLocals (`TenantContext` of `BookerContext`) en ruimt ze in een `finally` op. Een `BOOKER`-token krijgt vast `BOOKER_PORTAL_READ` en `BOOKER_PORTAL_UPDATE`; een `TOTP_PENDING`-token alleen een pseudo-authority `TOTP_PENDING`.

## Endpoint-toegang (`SecurityConfig`)

CSRF uit (stateless, token in header), sessies `STATELESS`.

| Pad | Toegang |
|---|---|
| `/api/auth/login`, `/api/auth/login/totp`, `/api/auth/login/recovery` | publiek |
| `/api/booker-auth/**` | publiek (OTP aanvragen/verifiëren) |
| `/api/mollie/payments/webhook` | publiek (Mollie roept dit aan; id wordt gevalideerd, zie [mollie.md](mollie.md)) |
| `GET /api/public/email-images/*` | publiek (alleen GET; onraadbare UUID; zie [email.md](email.md)) |
| `/monitoring/**` | publiek in Spring (JavaMelody); in **NGINX** beperkt tot `127.0.0.1` + beheer-IP (`deny all`) |
| `/api/booker-portal/**`, overige `/api/**` | ingelogd; daarna `@PreAuthorize` per methode |

Elke controller-methode heeft `@PreAuthorize("hasAuthority('…')")`; de volledige lijst staat in [api-examples.md](api-examples.md). Endpoints zonder annotatie die niet publiek zijn (TOTP-instellen, wachtwoord wijzigen) werken alleen op het eigen account.

## Rollen en authorities

61 granulaire authorities (`<DOMEIN>_<ACTIE>`, actie = CREATE/READ/UPDATE/DELETE, plus `EMAIL_SEND`). Seed (V2 + V6) — letters = C(reate) R(ead) U(pdate) D(elete), S = send:

| Domein | ADMIN | MANAGER | EMPLOYEE |
|---|:--:|:--:|:--:|
| ORGANIZATION | CRUD | – | – |
| PERSON | CRUD | CRUD | R U |
| ACCOUNT | CRUD | CRUD | R U |
| ACCOUNTROLE | C R D | C R D | – |
| ROLE | CRUD | R | – |
| AUTHORITY | CRUD | R | – |
| ROLEAUTHORITY | C R D | R | – |
| PAYMENT_CORRECT (status van een betaling corrigeren, V10) | ✓ | ✓ | – |
| PAYMENT_RELINK (betaling met reden aan een andere boeking hangen, V12) | ✓ | ✓ | – |
| BOOKING (boekingen, bookers, reizigers, adressen, regels, activiteiten) | – | CRUD | CRUD |
| ACCOMMODATION, SUPPLIER, ACTIVITY | – | CRUD | R |
| DOCUMENT | – | CRUD | CRUD |
| PAYMENT | – | CRUD | C R |
| TEMPLATE (Word + e-mail + afbeeldingen) | – | CRUD | R |
| EMAIL_SEND | – | S | S |
| ORGANIZATION_THEME | – | CRUD | – |
| BOOKER_PORTAL_READ/UPDATE | – | – | – (alleen via een BOOKER-token) |

- **ADMIN = systeembeheer**: bewust geen boekings-, template- of e-mailrechten. Vandaar `403` voor ADMIN op die endpoints (ook in de tests).
- De rol-authority-koppelingen staan in de database en zijn in het beheer te wijzigen; nieuwe authorities komen via een Flyway-migratie (zie V6 voor `EMAIL_SEND` als voorbeeld).
- **Frontend:** componenten en menu-items worden getoond op basis van authorities, nooit rollen. Het dashboard kiest bijvoorbeeld op `ORGANIZATION_READ` (beheer) en `ACCOUNT_CREATE` (manager); organisaties tonen vraagt `ORGANIZATION_READ`.

## Tenant-isolatie

- Elke tenant-entiteit heeft `tenant_organization`; `@PrePersist` vult die uit `TenantContext`; de kolom is `updatable = false`.
- **Services** doen de controle: `ADMIN` ziet alles, anderen alleen `tenantOrganization == TenantContext.getOrganizationId()` (`findByTenantOrganization`, `verifyOrganization` → `AccessDeniedException` → 403).
- Er is **bewust geen tenant-filter** op: het publiek uitleveren van een e-mailafbeelding (de ontvanger heeft geen organisatie) en op het booker-portal-pad dat aan één boeking gebonden is.
- **Afbeeldingen/templates:** een template mag alleen afbeeldingen van de eigen organisatie bevatten (`TemplateImages`), anders `400` zonder te verraden of de afbeelding elders bestaat.

## Authenticatie van medewerkers

1. `POST /api/auth/login` met gebruikersnaam + wachtwoord (BCrypt). Een **vergrendeld** account (`locked`) wordt geweigerd. (`expires_at` wordt momenteel niet afgedwongen: zie [open-items.md](open-items.md).)
2. Heeft het account `totp_enabled`, dan volgt een `TOTP_PENDING`-token en een tweede stap: `/login/totp` (6-cijferige code) of `/login/recovery` (herstelcode).
3. `must_change_password` zorgt dat de app na de login een wachtwoordwijziging afdwingt (`/api/auth/change-password`).
4. TOTP instellen: `/api/auth/totp/setup` (QR + herstelcodes), bevestigen met `/totp/verify`, uitzetten met `/totp/disable`. Een beheerder kan TOTP van een ander account resetten (`DELETE /api/accounts/{id}/totp`, `ACCOUNT_UPDATE`).
5. NGINX beperkt de login-endpoints tot een lage frequentie (zie hieronder).

## Authenticatie van klanten

OTP per e-mail + boekingsnummer, token gebonden aan één boeking: zie [bookerportal.md](bookerportal.md). **Let op:** de OTP-mail is nog een stub (logt de code); zie [open-items.md](open-items.md).

## Afscherming van templates (zeer belangrijk)

Word- en e-mailtemplates worden door gebruikers (MANAGER) geschreven en zijn dus **niet vertrouwd**. FreeMarker kan anders met één regel een commando op de server uitvoeren (`?new` → `Execute`) of via Java-reflectie (`${x.class…}`) bij klassen komen. Maatregelen (`FreemarkerHardening`, `TemplateModels`, `EmailRenderServiceImpl`):

- `?new` uit (`ALLOWS_NOTHING_RESOLVER`), `?api` uit, geen `include`/`import` (geen template-loader).
- Het model is **plat**: alleen maps, lijsten, tekst, getallen en booleans (datums → tekst, enums → naam). Geen Java-beans, dus geen `class`-property.
- Voor e-mail: de body is `HTMLOutputFormat` (waarden worden HTML-ge-escaped); herhaalde tabellen valideren lijst- en itemnaam strikt (identifiers) voordat die in een FreeMarker-instructie komen.
- De `.docx` uit de editor gaat door **dezelfde** afgeschermde straat; er is een test die een payload in de editor typt en bevestigt dat die geblokkeerd wordt (`HtmlToDocxConverterTest`, `DocgenTemplateInjectionTest`).
- Afbeeldingen: type uit de **bytes** (PNG/JPEG/GIF/WebP, geen SVG), maximaal 2 MB; in een Word-template alleen uit de eigen bibliotheek, nooit via een URL opgehaald (geen SSRF).

## Netwerklaag (NGINX, `deploy/nginx/rds.conf`)

- Aparte `server`-blokken: intern/TLS (`software.kbtg`) en het **publieke IP** (alleen wat nodig is: Mollie-webhook en publieke e-mailafbeeldingen).
- Rate-limits: `login_limit` (employee-login, TOTP, herstelcode, booker-OTP), `mollie_limit` (webhook), `email_image_limit` (afbeeldingen).
- Scanner-/exploit-paden (`/.…`, `.php`, `/vendor/`, `.env`, `/mcp`, `/graphql`, …) worden met `444` afgekapt.
- `/api/` → `http://127.0.0.1:8666/rds/api/`; de backend luistert alleen op `127.0.0.1`.

## Geschiedenis niet kwijtraken (verwijderbescherming)

Aangemaakte documenten en betalingen zijn de "waarheid" en mogen niet verdwijnen. De database zou ze echter stilletjes meeverwijderen (`ON DELETE CASCADE`) zodra een boeking, of iets waaraan een boeking hangt, wordt verwijderd. `DeletionGuard` (`booking/service`) weigert daarom met **409 Conflict** (`DeletionBlockedException`) het verwijderen van:
- een **boeking** met documenten, betalingen of een herkoppeling (als van- of naar-boeking);
- een **booker, accommodatie, leverancier of activiteit** die voorkomt in een boeking met documenten of betalingen.

De controle zit in de services (dus niet te omzeilen via de API) en geldt voor iedereen met de verwijder-authority. Documenten en betalingen zelf hebben in de UI geen verwijderknop.

**Organisatie verwijderen:** `OrganizationDeletionGuard` (`auth/service`) weigert met **409** zolang er nog data met `tenant_organization` = die organisatie is. De tabellen worden uit `information_schema` gehaald (elke tabel met een kolom `tenant_organization`), dus een nieuwe tenant-tabel is automatisch meegenomen; de melding noemt de aantallen per tabel. Reden: die kolommen hebben geen foreign key naar `organization`, een verwijderde organisatie zou verweesde data achterlaten. Verplaatsen of eerst opruimen is aan de beheerder. Verzonden e-mails worden niet bewaard, dus daar valt niets te beschermen; e-mailtemplates zijn gewoon te verwijderen.

## Foutafhandeling

`@ControllerAdvice` (`GlobalExceptionHandler`), antwoorden `{ message, status, timestamp }`. Een onbekende of onbevoegde bron geeft bewust dezelfde soort melding (geen lekken over andermans data). Tabel met statuscodes: [architecture.md](architecture.md).

## Regels bij nieuwe code

- Nieuwe endpoint ⇒ `@PreAuthorize` met een bestaande of nieuwe authority (nieuwe via Flyway) en een test voor ADMIN/EMPLOYEE/MANAGER/ongeauthenticeerd.
- Nieuwe tenant-entiteit ⇒ `tenant_organization` NOT NULL, service-controle, test dat een andere organisatie niets ziet.
- **Verwijzingen controleren, niet alleen het object zelf.** Een `create`/`update` die een ander object via id koppelt (boeking, booker, accommodatie, …) moet ook de organisatie van díe verwijzing controleren (`verifyOrganization(...)`), anders kan een gebruiker een object van een andere tenant aan zijn eigen gegevens hangen. Zo is dat bij `BookingServiceImpl.resolveBooker`, `DocumentServiceImpl` en `TravelerServiceImpl` (`resolveBooking`).
- **Rollen toewijzen:** rollen zijn globaal en `ADMIN` omzeilt alle tenantcontroles. Een niet-ADMIN (bv. MANAGER) mag via `/api/account-roles` alleen `EMPLOYEE` en `MANAGER` toewijzen of intrekken (`AccountRoleService.ROLES_MANAGEABLE_BY_NON_ADMIN`); anders kan een manager zichzelf ADMIN maken. Een nieuwe of aangepaste rol is dus standaard alleen door ADMIN te beheren. De frontend vraagt via `GET /api/account-roles/assignable-roles` welke rollen de gebruiker mag beheren (geen rolnamen in de UI) en toont alleen die; een 403 bij toewijzen of intrekken geeft een duidelijke melding.
- **Nooit entities in een response.** `/api/account-roles` gaf eerder de `AccountRole`-entity terug en lekte daarmee `passwordHash`, TOTP-geheim, herstelcodes en `mollieKey`; nu `AccountRoleResponseDto` (alleen ids en rolnaam). Hetzelfde is gedaan voor `/api/role-authorities` (`RoleAuthorityResponseDto`). `NoEntityInApiTest` laat de build falen zodra een controller-methode (parameter of return, ook geneste typen) of een DTO een JPA-entity gebruikt.
- Extern bereikbare endpoints ⇒ minimale eigen DTO's.
- Geen wachtwoorden, sleutels of tokens loggen of in documentatie zetten.
