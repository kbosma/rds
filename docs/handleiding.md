# RDS — Handleiding

**Reis Dossier Systeem (RDS)** — de volledige gebruikers- en beheerhandleiding.

| | |
|---|---|
| Doelgroep | medewerkers (EMPLOYEE), managers (MANAGER), systeembeheerders (ADMIN), klanten (boekers) en beheerders/integrators die de API gebruiken |
| Peildatum | 20-10-2026 (branch `main`, Flyway-migraties V1–V16) |
| Bron | de code en de migraties zelf. De rechtenmatrix (§2.4) en de endpointlijst (§9) zijn gegenereerd uit de SQL-migraties en de `@PreAuthorize`-annotaties; waar een eerder document afwijkt, wint de code. |
| Taal | Nederlands; schermnamen staan zoals ze in de Nederlandse interface heten, technische namen (authorities, endpoints, velden) staan ongewijzigd |

> **Hoe lees je dit?**
> - Wil je weten *wat een rol mag*: ga naar [§2 Rollen en authorities](#2-rollen-en-authorities).
> - Wil je een *taak uitvoeren* (boeking maken, document genereren, betaling vastleggen): [§6 Werkprocessen](#6-werkprocessen-stap-voor-stap).
> - Zoek je een *scherm*: [§4 Medewerkersapp](#4-de-medewerkersapp-frontend-employee).
> - Ben je *klant*: [§5 Boekerportaal](#5-het-boekerportaal-voor-klanten).
> - Bouw je een *koppeling*: [§9 API-referentie](#9-api-referentie).
> - Loopt iets vast: [§11 Problemen oplossen](#11-problemen-oplossen) en [§10 Bekende beperkingen](#10-bekende-beperkingen).

## Inhoud

1. [Wat is RDS?](#1-wat-is-rds)
2. [Rollen en authorities](#2-rollen-en-authorities)
3. [Inloggen en je eigen account](#3-inloggen-en-je-eigen-account)
4. [De medewerkersapp (`frontend-employee`)](#4-de-medewerkersapp-frontend-employee)
5. [Het boekerportaal (voor klanten)](#5-het-boekerportaal-voor-klanten)
6. [Werkprocessen stap voor stap](#6-werkprocessen-stap-voor-stap)
7. [Templates: variabelen, tabellen en afbeeldingen](#7-templates-variabelen-tabellen-en-afbeeldingen)
8. [Regels, beveiliging en foutmeldingen](#8-regels-beveiliging-en-foutmeldingen)
9. [API-referentie](#9-api-referentie)
10. [Bekende beperkingen](#10-bekende-beperkingen)
11. [Problemen oplossen](#11-problemen-oplossen)
12. [Beheer en configuratie](#12-beheer-en-configuratie)
13. [Bijlagen](#13-bijlagen)

---

## 1. Wat is RDS?

RDS is een **multi-tenant SaaS** voor reisorganisaties. Een medewerker beheert per reis een **boeking** (een dossier): hoofdboeker, reizigers, verblijven, activiteiten, documenten, e-mails en betalingen. Het systeem

- genereert **Word/PDF-documenten** uit sjablonen (templates),
- verstuurt **e-mails** uit sjablonen,
- laat klanten via een **portaal** hun eigen reis bekijken en betalen,
- verwerkt betalingen via **Mollie**.

Elke **organisatie** (tenant) ziet uitsluitend de eigen gegevens.

### 1.1 Twee apps, één backend

| App | Voor wie | Inloggen met | Adres in productie |
|---|---|---|---|
| **Medewerkersapp** (`frontend-employee`) | ADMIN, MANAGER, EMPLOYEE | gebruikersnaam + wachtwoord (+ 2FA indien aan) | `/rds/` |
| **Boekerportaal** (`frontend-booker`) | klanten | e-mailadres + boekingsnummer + eenmalige code (OTP) | `/booker/` |

Lokaal draaien de apps op poort 4200 (medewerkers) en 4300 (klanten); de backend op poort 8666 met context-path `/rds`.

### 1.2 Kernbegrippen

| Begrip | Betekenis |
|---|---|
| **Organisatie / tenant** | een klant van het SaaS-systeem; alle gegevens zijn per organisatie gescheiden |
| **Persoon → Account** | een persoon hoort bij één organisatie; een account (login) hoort bij één persoon |
| **Rol** | benoemde bundel rechten: `ADMIN`, `MANAGER`, `EMPLOYEE` |
| **Authority** | één granulair recht, bijvoorbeeld `BOOKING_READ`. In de menu's heet dit scherm **Rechten** |
| **Boeking** | het reisdossier, met boekingsnummer `BK-<jaar>-<5 cijfers>` en een status |
| **Boeker / Booker** | de opdrachtgever; heeft geen login in de medewerkersapp. Een boeking verwijst naar maximaal één *hoofdboeker* |
| **Prospect** | een potentiële klant: technisch een boeker met status `prospect` |
| **Reiziger** | iemand die meereist op één boeking |
| **Boekingsregel** | een verblijf in een boeking (accommodatie + leverancier + periode + prijs). In de interface heet dit blok *Accommodaties* |
| **Boekingsactiviteit** | een activiteit in een boeking (datum, tijden, trefpunt, prijs) |
| **Document** | een bestand bij een boeking: geüpload (PDF) of gegenereerd (PDF of DOCX) |
| **Template** | sjabloon met velden: *Word-template* (wordt document) of *e-mailtemplate* (wordt mail) |
| **Concept-boeking** | een voorgevuld, nog niet opgeslagen boekingsscherm |
| **Thema / Huisstijl** | kleuren en logo van de organisatie, zichtbaar in de hele interface |

### 1.3 Levenscyclus van een boeking

`aanvraag → offerte → boeking → voorschot → betaald → op reis → weer thuis → afgerond`

De status is een keuzelijst: er is **geen afgedwongen volgorde**. De medewerker zet de status via *Bewerken* in het boekingsdetail. De waarde in de API is lowercase (`aanvraag`, `opreis`, `weerthuis`, …), in templates de hoofdletternaam (`BOEKING`).

### 1.4 Twee vaste werkregels

- **E-mail versturen** kan alleen vanuit een **boeking** (naar de hoofdboeker) of vanuit een **prospect** (mail-icoon in *Prospects*).
- **Documenten maken** (genereren of uploaden) kan alleen vanuit een **boeking**.

In de schermen *Templates* en *E-mailtemplates* maak en beheer je alleen de templates zelf; je verstuurt of genereert daar niets.

---

## 2. Rollen en authorities

Dit hoofdstuk beschrijft hoe toegang werkt en hoe deze **op dit moment** is ingericht.

> **Bron en geldigheid.** De inrichting hieronder is afgeleid uit de Flyway-migraties `V2` (basis), `V6` (`EMAIL_SEND`), `V10` (`PAYMENT_CORRECT`), `V12` (`PAYMENT_RELINK`) en `V16` (haalt `DOCUMENT_DELETE` weg). Dat is de **standaardconfiguratie** van elke nieuwe database. Rol↔authority-koppelingen staan in de database en kunnen via het scherm *Rollen* gewijzigd zijn; de live database is bij het schrijven van deze handleiding niet uitgelezen (geen toegang). Controleer de werkelijke stand in *Rollen → rol openen → Authorities*.

### 2.1 De keten van toegang

```
ORGANIZATION ──< PERSON ──< ACCOUNT ──< ACCOUNT_ROLE >── ROLE ──< ROLE_AUTHORITY >── AUTHORITY
 (tenant)        (mens)      (login)      (koppeling)     (bundel)   (koppeling)        (recht)
```

1. Een gebruiker logt in met een **account**.
2. Het account heeft één of meer **rollen** (in de praktijk één).
3. Elke rol heeft een verzameling **authorities**.
4. Bij het inloggen worden de authorities in het **JWT-token** gezet (claim `authorities`, naast `roles`, `org`, `personId`, …).
5. De **backend** controleert bij *elk* endpoint met `@PreAuthorize("hasAuthority('…')")`.
6. De **frontend** toont menu-items en knoppen op basis van dezelfde authorities. De UI verbergt alleen; de server is de enige echte controle.

> **Belangrijkste regel van het project:** de interface kijkt naar **authorities, nooit naar rollen**. Een rolnaam beïnvloedt dus niets rechtstreeks; alleen de authorities die aan de rol hangen tellen. (Het dashboard kiest bijvoorbeeld op `ORGANIZATION_READ` en `ACCOUNT_CREATE`, niet op de rolnaam.)

### 2.2 Naamgeving van authorities

`<DOMEIN>_<ACTIE>` met actie `READ`, `CREATE`, `UPDATE` of `DELETE`. Daarnaast bestaan er drie bijzondere:

| Authority | Betekenis |
|---|---|
| `EMAIL_SEND` | e-mail versturen (los van het beheren van templates) |
| `PAYMENT_CORRECT` | de status van een betaling handmatig corrigeren |
| `PAYMENT_RELINK` | een betaling met reden aan een andere boeking hangen |

Er zijn in totaal **62 authorities**: 60 uit de basismigratie (`V2`) plus `EMAIL_SEND` (`V6`), `PAYMENT_CORRECT` (`V10`) en `PAYMENT_RELINK` (`V12`), min `DOCUMENT_DELETE` dat in `V16` is vervallen (een document wordt nooit verwijderd).

### 2.3 De drie rollen

| Rol | Bedoeld voor | Kern |
|---|---|---|
| **ADMIN** | systeembeheer van het hele platform | beheert organisaties, personen, accounts, rollen en authorities, **over alle organisaties heen**. Heeft **bewust geen** rechten op boekingen, stamgegevens, documenten, templates, e-mail of thema. Een ADMIN krijgt op die endpoints `403`. |
| **MANAGER** | beheerder van **één organisatie** | alles wat bij het werk en het beheer van de eigen organisatie hoort: boekingen, stamgegevens, templates, documenten, betalingen (incl. correctie en herkoppelen), huisstijl, en gebruikers (personen/accounts, en de rollen EMPLOYEE en MANAGER toewijzen). Kan rollen en authorities alleen *lezen*. |
| **EMPLOYEE** | dagelijks werk | boekingen en alles daaronder (bookers, prospects, reizigers, regels, activiteiten), documenten (volledig), betalingen aanmaken en bekijken, e-mail versturen. Templates, accommodaties, leveranciers en activiteiten alleen *lezen*. Eigen persoon en account alleen lezen/wijzigen. |
| *Boeker (klant)* | externe klant | geen rol en geen account: een **BOOKER-token** (na OTP) met vast `BOOKER_PORTAL_READ` en `BOOKER_PORTAL_UPDATE`, gebonden aan één boeking. |

Aantallen in de standaardconfiguratie: ADMIN **28** authorities, MANAGER **48**, EMPLOYEE **18**. `BOOKER_PORTAL_READ` en `BOOKER_PORTAL_UPDATE` bestaan wel als authority, maar zijn aan **geen enkele rol** gekoppeld.

### 2.4 Volledige matrix: authority × rol

Gegenereerd uit de migraties `V2`, `V6`, `V10`, `V12` en `V16`. De kolom *Endpoints* noemt de API-resources die de authority gebruiken (uit de `@PreAuthorize`-annotaties).

| # | Authority | Wat het toestaat | ADMIN | MANAGER | EMPLOYEE | Endpoints (resources) |
|--:|---|---|:--:|:--:|:--:|---|
| 1 | `ACCOMMODATION_CREATE` | accommodaties: aanmaken | – | ✓ | – | `/api/accommodation-addresses`, `/api/accommodations`, `/api/accommodation-suppliers` |
| 2 | `ACCOMMODATION_DELETE` | accommodaties: verwijderen | – | ✓ | – | `/api/accommodation-addresses`, `/api/accommodations`, `/api/accommodation-suppliers` |
| 3 | `ACCOMMODATION_READ` | accommodaties: bekijken (lijst en detail) | – | ✓ | ✓ | `/api/accommodation-addresses`, `/api/accommodations`, `/api/accommodation-suppliers` |
| 4 | `ACCOMMODATION_UPDATE` | accommodaties: wijzigen | – | ✓ | – | `/api/accommodations` |
| 5 | `ACCOUNTROLE_CREATE` | rollen aan accounts: aanmaken | ✓ | ✓ | – | `/api/account-roles` |
| 6 | `ACCOUNTROLE_DELETE` | rollen aan accounts: verwijderen | ✓ | ✓ | – | `/api/account-roles` |
| 7 | `ACCOUNTROLE_READ` | rollen aan accounts: bekijken (lijst en detail) | ✓ | ✓ | – | `/api/account-roles` |
| 8 | `ACCOUNT_CREATE` | accounts: aanmaken | ✓ | ✓ | – | `/api/accounts` |
| 9 | `ACCOUNT_DELETE` | accounts: verwijderen | ✓ | ✓ | – | `/api/accounts` |
| 10 | `ACCOUNT_READ` | accounts: bekijken (lijst en detail) | ✓ | ✓ | ✓ | `/api/accounts` |
| 11 | `ACCOUNT_UPDATE` | accounts: wijzigen | ✓ | ✓ | ✓ | `/api/accounts` |
| 12 | `ACTIVITY_CREATE` | activiteiten (stamgegevens): aanmaken | – | ✓ | – | `/api/activities` |
| 13 | `ACTIVITY_DELETE` | activiteiten (stamgegevens): verwijderen | – | ✓ | – | `/api/activities` |
| 14 | `ACTIVITY_READ` | activiteiten (stamgegevens): bekijken (lijst en detail) | – | ✓ | ✓ | `/api/activities` |
| 15 | `ACTIVITY_UPDATE` | activiteiten (stamgegevens): wijzigen | – | ✓ | – | `/api/activities` |
| 16 | `AUTHORITY_CREATE` | authorities: aanmaken | ✓ | – | – | `/api/authorities` |
| 17 | `AUTHORITY_DELETE` | authorities: verwijderen | ✓ | – | – | `/api/authorities` |
| 18 | `AUTHORITY_READ` | authorities: bekijken (lijst en detail) | ✓ | ✓ | – | `/api/authorities` |
| 19 | `AUTHORITY_UPDATE` | authorities: wijzigen | ✓ | – | – | `/api/authorities` |
| 20 | `BOOKER_PORTAL_READ` | het eigen reisschema, documenten, betalingen enz. bekijken (alleen via BOOKER-token) | – | – | – | `/api/booker-portal` |
| 21 | `BOOKER_PORTAL_UPDATE` | een betaling starten (alleen via BOOKER-token) | – | – | – | `/api/booker-portal` |
| 22 | `BOOKING_CREATE` | boekingen, boekers/prospects, reizigers, adressen, regels en activiteiten: aanmaken | – | ✓ | ✓ | `/api/addresses`, `/api/booker-addresses`, `/api/bookers`, `/api/booking-activities`, `/api/bookings`, `/api/booking-lines`, `/api/travelers` |
| 23 | `BOOKING_DELETE` | boekingen, boekers/prospects, reizigers, adressen, regels en activiteiten: verwijderen | – | ✓ | ✓ | `/api/addresses`, `/api/booker-addresses`, `/api/bookers`, `/api/booking-activities`, `/api/bookings`, `/api/booking-lines`, `/api/travelers` |
| 24 | `BOOKING_READ` | boekingen, boekers/prospects, reizigers, adressen, regels en activiteiten: bekijken (lijst en detail) | – | ✓ | ✓ | `/api/addresses`, `/api/booker-addresses`, `/api/bookers`, `/api/booking-activities`, `/api/bookings`, `/api/booking-lines`, `/api/travelers`, `/api/sent-emails` |
| 25 | `BOOKING_UPDATE` | boekingen, boekers/prospects, reizigers, adressen, regels en activiteiten: wijzigen | – | ✓ | ✓ | `/api/addresses`, `/api/bookers`, `/api/booking-activities`, `/api/bookings`, `/api/booking-lines`, `/api/travelers` |
| 26 | `DOCUMENT_CREATE` | documenten: aanmaken | – | ✓ | ✓ | `/api/documents` |
| 27 | `DOCUMENT_READ` | documenten: bekijken (lijst en detail) | – | ✓ | ✓ | `/api/documents` |
| 28 | `DOCUMENT_UPDATE` | documenten: wijzigen | – | ✓ | ✓ | `/api/documents` |
| 29 | `EMAIL_SEND` | e-mail versturen en opnieuw versturen | – | ✓ | ✓ | `/api/email-templates`, `/api/sent-emails` |
| 30 | `ORGANIZATION_CREATE` | organisaties: aanmaken | ✓ | – | – | `/api/organizations` |
| 31 | `ORGANIZATION_DELETE` | organisaties: verwijderen | ✓ | – | – | `/api/organizations` |
| 32 | `ORGANIZATION_READ` | organisaties: bekijken (lijst en detail) | ✓ | – | – | `/api/organizations` |
| 33 | `ORGANIZATION_THEME_CREATE` | huisstijl van de organisatie: aanmaken | – | ✓ | – | `/api/organization-themes` |
| 34 | `ORGANIZATION_THEME_DELETE` | huisstijl van de organisatie: verwijderen | – | ✓ | – | `/api/organization-themes` |
| 35 | `ORGANIZATION_THEME_READ` | huisstijl van de organisatie: bekijken (lijst en detail) | – | ✓ | – | `/api/organization-themes` |
| 36 | `ORGANIZATION_THEME_UPDATE` | huisstijl van de organisatie: wijzigen | – | ✓ | – | `/api/organization-themes` |
| 37 | `ORGANIZATION_UPDATE` | organisaties: wijzigen | ✓ | – | – | `/api/organizations` |
| 38 | `PAYMENT_CORRECT` | de status van een betaling corrigeren (nieuwe regel met reden) | ✓ | ✓ | – | `/api/mollie` |
| 39 | `PAYMENT_CREATE` | Mollie-betalingen en hun koppeling aan boekingen: aanmaken | – | ✓ | ✓ | `/api/booking-mollie-payments`, `/api/mollie` |
| 40 | `PAYMENT_DELETE` | geen enkel endpoint gebruikt dit: betalingen worden nooit verwijderd | – | ✓ | – | *(geen)* |
| 41 | `PAYMENT_READ` | Mollie-betalingen en hun koppeling aan boekingen: bekijken (lijst en detail) | – | ✓ | ✓ | `/api/booking-mollie-payments`, `/api/mollie` |
| 42 | `PAYMENT_RELINK` | een betaling met reden aan een andere boeking hangen | ✓ | ✓ | – | `/api/booking-mollie-payments` |
| 43 | `PAYMENT_UPDATE` | Mollie-betalingen en hun koppeling aan boekingen: wijzigen | – | ✓ | – | `/api/mollie` |
| 44 | `PERSON_CREATE` | personen: aanmaken | ✓ | ✓ | – | `/api/persons` |
| 45 | `PERSON_DELETE` | personen: verwijderen | ✓ | ✓ | – | `/api/persons` |
| 46 | `PERSON_READ` | personen: bekijken (lijst en detail) | ✓ | ✓ | ✓ | `/api/persons` |
| 47 | `PERSON_UPDATE` | personen: wijzigen | ✓ | ✓ | ✓ | `/api/persons` |
| 48 | `ROLEAUTHORITY_CREATE` | authorities aan rollen: aanmaken | ✓ | – | – | `/api/role-authorities` |
| 49 | `ROLEAUTHORITY_DELETE` | authorities aan rollen: verwijderen | ✓ | – | – | `/api/role-authorities` |
| 50 | `ROLEAUTHORITY_READ` | authorities aan rollen: bekijken (lijst en detail) | ✓ | ✓ | – | `/api/role-authorities` |
| 51 | `ROLE_CREATE` | rollen: aanmaken | ✓ | – | – | `/api/roles` |
| 52 | `ROLE_DELETE` | rollen: verwijderen | ✓ | – | – | `/api/roles` |
| 53 | `ROLE_READ` | rollen: bekijken (lijst en detail) | ✓ | ✓ | – | `/api/roles` |
| 54 | `ROLE_UPDATE` | rollen: wijzigen | ✓ | – | – | `/api/roles` |
| 55 | `SUPPLIER_CREATE` | leveranciers: aanmaken | – | ✓ | – | `/api/supplier-addresses`, `/api/suppliers` |
| 56 | `SUPPLIER_DELETE` | leveranciers: verwijderen | – | ✓ | – | `/api/supplier-addresses`, `/api/suppliers` |
| 57 | `SUPPLIER_READ` | leveranciers: bekijken (lijst en detail) | – | ✓ | ✓ | `/api/supplier-addresses`, `/api/suppliers` |
| 58 | `SUPPLIER_UPDATE` | leveranciers: wijzigen | – | ✓ | – | `/api/suppliers` |
| 59 | `TEMPLATE_CREATE` | Word-templates, e-mailtemplates en afbeeldingen: aanmaken | – | ✓ | – | `/api/document-templates`, `/api/email-images`, `/api/email-templates` |
| 60 | `TEMPLATE_DELETE` | Word-templates, e-mailtemplates en afbeeldingen: verwijderen | – | ✓ | – | `/api/document-templates`, `/api/email-images`, `/api/email-templates` |
| 61 | `TEMPLATE_READ` | Word-templates, e-mailtemplates en afbeeldingen: bekijken (lijst en detail) | – | ✓ | ✓ | `/api/document-templates`, `/api/email-templates` |
| 62 | `TEMPLATE_UPDATE` | Word-templates, e-mailtemplates en afbeeldingen: wijzigen | – | ✓ | – | `/api/document-templates`, `/api/email-images`, `/api/email-templates` |
| | **Totaal: 62** | | **28** | **48** | **18** | |

### 2.5 Dezelfde matrix per domein (leesversie)

Letters: **C**reate, **R**ead, **U**pdate, **D**elete, **S** = versturen. Een streepje betekent: geen recht.

| Domein | ADMIN | MANAGER | EMPLOYEE | Wat het domein dekt |
|---|:--:|:--:|:--:|---|
| `ORGANIZATION` | C R U D | – | – | organisaties (incl. afzenderadres en Mollie-sleutel) |
| `PERSON` | C R U D | C R U D | R U | personen |
| `ACCOUNT` | C R U D | C R U D | R U | accounts (inclusief vergrendelen en TOTP resetten) |
| `ACCOUNTROLE` | C R D | C R D | – | rollen aan een account hangen of afnemen |
| `ROLE` | C R U D | R | – | rollen |
| `AUTHORITY` | C R U D | R | – | authorities zelf |
| `ROLEAUTHORITY` | C R D | R | – | authorities aan een rol hangen |
| `BOOKING` | – | C R U D | C R U D | boekingen, boekers/prospects, reizigers, adressen, boekingsregels, boekingsactiviteiten, verzonden e-mails (lezen) |
| `ACCOMMODATION` | – | C R U D | R | accommodaties en hun adressen/leveranciers |
| `SUPPLIER` | – | C R U D | R | leveranciers en hun adressen |
| `ACTIVITY` | – | C R U D | R | activiteiten (stamgegevens) |
| `DOCUMENT` | – | C R U | C R U | documenten bij boekingen; genereren (geen verwijderen: een document wordt nooit verwijderd) |
| `PAYMENT` | – | C R U D\* | C R | Mollie-betalingen en koppeling aan boekingen |
| `PAYMENT_CORRECT` | ✓ | ✓ | – | statuscorrectie van een betaling |
| `PAYMENT_RELINK` | ✓ | ✓ | – | betaling herkoppelen met reden |
| `TEMPLATE` | – | C R U D | R | Word-templates, e-mailtemplates, afbeeldingenbibliotheek |
| `EMAIL_SEND` | – | S | S | e-mail versturen en opnieuw versturen |
| `ORGANIZATION_THEME` | – | C R U D | – | huisstijl van de eigen organisatie |
| `BOOKER_PORTAL` | – | – | – | alleen via BOOKER-token (zie §2.7) |

\* `PAYMENT_UPDATE` is alleen bruikbaar zolang een betaling nog niet bij Mollie bestaat. `PAYMENT_DELETE` bestaat als authority, maar er is **geen enkel endpoint** dat een betaling verwijdert (zie §8.3); de authority heeft dus geen effect.

> **Opvallende uitzonderingen**
> - **ADMIN heeft `PAYMENT_CORRECT` en `PAYMENT_RELINK`, maar niet `PAYMENT_READ`.** ADMIN kan de betaling dus niet zien waarop dat recht werkt; in de praktijk zijn deze twee rechten voor MANAGER bedoeld.
> - **MANAGER heeft géén `ORGANIZATION_*`.** Het afzenderadres (`email_from`) en de Mollie-sleutel van een organisatie kan alleen ADMIN bewerken.
> - **EMPLOYEE heeft `EMAIL_SEND` maar geen `TEMPLATE_CREATE`**: mail versturen mag, templates beheren niet.
> - **EMPLOYEE heeft `BOOKING_DELETE`** (en MANAGER ook): verwijderen van boekingen is dus niet voorbehouden aan MANAGER. De verwijderbeveiliging (§8.3) geldt voor beiden.

### 2.6 Welke rol ziet welk menu-item?

Het zijmenu toont een item als de gebruiker **minstens één** van de genoemde authorities heeft. Berekend uit `layout.component.ts` en de matrix:

| Menu-item (route) | Vereist (een van) | ADMIN | MANAGER | EMPLOYEE |
|---|---|:--:|:--:|:--:|
| Dashboard (`/dashboard`) | – | ✓ | ✓ | ✓ |
| Boekingen (`/bookings`) | `BOOKING_READ` | – | ✓ | ✓ |
| Boekers (`/bookers`) | `BOOKING_READ` | – | ✓ | ✓ |
| Prospects (`/prospects`) | `BOOKING_READ` | – | ✓ | ✓ |
| Betalingen (`/payments`) | `PAYMENT_READ` | – | ✓ | ✓ |
| *Sectie BEHEER* — Organisaties (`/admin/organizations`) | `ORGANIZATION_READ` | ✓ | – | – |
| *Sectie ORGANISATIE BEHEER* — Accommodaties | `ACCOMMODATION_CREATE`/`_UPDATE`/`_DELETE` | – | ✓ | – |
| Leveranciers | `SUPPLIER_CREATE`/`_UPDATE`/`_DELETE` | – | ✓ | – |
| Activiteiten | `ACTIVITY_CREATE`/`_UPDATE`/`_DELETE` | – | ✓ | – |
| Templates (Word) | `TEMPLATE_CREATE`/`_UPDATE`/`_DELETE` | – | ✓ | – |
| E-mailtemplates | `TEMPLATE_READ` | – | ✓ | ✓ |
| Personen (`/admin/persons`) | `PERSON_CREATE`/`PERSON_DELETE` | ✓ | ✓ | – |
| Accounts (`/admin/accounts`) | `ACCOUNT_CREATE`/`ACCOUNT_DELETE` | ✓ | ✓ | – |
| Rollen (`/admin/roles`) | `ROLE_CREATE`/`_UPDATE`/`_DELETE` | ✓ | – | – |
| Rechten (`/admin/authorities`) | `AUTHORITY_CREATE`/`_UPDATE`/`_DELETE` | ✓ | – | – |
| Huisstijl (`/admin/theme`) | `ORGANIZATION_THEME_UPDATE` | – | ✓ | – |
| *Sectie MIJN BEHEER* — Mijn gegevens (`/profile`) | `PERSON_UPDATE` | ✓ | ✓ | ✓ |
| Wachtwoord (`/change-password`) | `ACCOUNT_UPDATE` | ✓ | ✓ | ✓ |
| 2FA Instellingen (`/totp-settings`) | – | ✓ | ✓ | ✓ |

Gevolgen om te weten:

- **Een EMPLOYEE heeft `ACCOMMODATION_READ`, `SUPPLIER_READ` en `ACTIVITY_READ`** en kan die dus *kiezen* in een boekingsregel of -activiteit, maar ziet de beheerlijsten niet in het menu (die vragen een schrijfrecht).
- **Een MANAGER ziet Rollen en Rechten niet in het menu**, hoewel de leesrechten `ROLE_READ`/`AUTHORITY_READ` er zijn. Die zijn nodig voor het account-scherm (rol kiezen) en worden daar gebruikt.
- De route `/travelers` (Reizigers) bestaat, maar heeft **geen menu-item**: reizigers beheer je in het boekingsdetail.
- De routes zelf zijn alleen afgeschermd met een *inlog-controle* (`authGuard`), niet per authority. Typ je als EMPLOYEE `/admin/roles` in de adresbalk, dan opent het scherm wel, maar de server weigert de gegevens (`403`) en je ziet geen data of een foutmelding. Beveiliging zit in de backend.

### 2.7 Het boekerportaal heeft een eigen model

Een klant heeft **geen account en geen rol**. Na een geslaagde OTP-login krijgt de klant een token met `type=BOOKER` en het `bookingId`. De backend geeft daaraan **automatisch** twee authorities:

| Authority | Wat het toestaat |
|---|---|
| `BOOKER_PORTAL_READ` | de `GET`-endpoints onder `/api/booker-portal/**` van de **eigen boeking**: reisschema, boekingsregels, boekingsactiviteiten, accommodaties, activiteiten, documenten (alleen zichtbare), betalingen en betaalstatussen |
| `BOOKER_PORTAL_UPDATE` | `POST /api/booker-portal/payments/pay/{molliePaymentId}`: een betaling starten |

Een BOOKER-token werkt **niet** op `/api/bookings` e.d., en omgekeerd werkt een medewerkerstoken niet op de portal-endpoints. Elke portal-query is gebonden aan het `bookingId` uit het token; een betaling van een andere boeking wordt geweigerd.

### 2.8 Tenant-isolatie (organisatiegrenzen)

- Elke tenant-entiteit heeft een onveranderlijke `tenant_organization`; die wordt bij het aanmaken gevuld uit de ingelogde organisatie.
- **Services** filteren: ADMIN ziet alles, MANAGER en EMPLOYEE alleen de eigen organisatie. Een resource van een andere organisatie geeft `403` (of `404`).
- Verwijzingen worden óók gecontroleerd: je kunt geen boeker, accommodatie of boeking van een andere organisatie aan je eigen gegevens hangen.
- **Rollen en authorities zijn globaal**, niet per organisatie. Wijzig je in *Rollen* welke authorities `EMPLOYEE` heeft, dan geldt dat voor *alle* organisaties tegelijk.
- Bewuste uitzondering: e-mailafbeeldingen worden publiek uitgeleverd via een onraadbare UUID (een ontvanger heeft geen login).

### 2.9 Wie mag welke rol toewijzen?

Rollen zijn globaal en ADMIN omzeilt de organisatiecontroles. Daarom geldt voor `/api/account-roles`:

| Wie | Mag toewijzen/intrekken |
|---|---|
| ADMIN | alle rollen |
| Niet-ADMIN (bijv. MANAGER) | **alleen `EMPLOYEE` en `MANAGER`** |

Zo kan een manager zichzelf of een ander geen ADMIN maken. Een nieuwe of zelfgemaakte rol is dus standaard alleen door een ADMIN te beheren. Het account-scherm vraagt de toewijsbare rollen op via `GET /api/account-roles/assignable-roles` en toont alleen die. Een `403` geeft de melding *"Je mag deze rol niet toewijzen. Alleen een beheerder kan dat."*

### 2.10 De configuratie wijzigen

| Wat wil je | Hoe | Opmerkingen |
|---|---|---|
| Een authority aan een rol hangen of afnemen | *Rollen → rol openen → kaart Authorities → Authority toevoegen* / prullenbak-icoon | ADMIN: lezen/koppelen/ontkoppelen. MANAGER: alleen lezen. Geldt voor alle organisaties. |
| Een rol aan een account geven | *Accounts → account openen → Rol toevoegen* | zie §2.9 |
| Een nieuwe rol maken | *Rollen → Nieuwe rol* (alleen ADMIN) | krijgt nog geen authorities; die koppel je daarna |
| Een nieuwe authority maken | *Rechten → Nieuwe authority* | maakt alleen de naam aan. **Er is pas iets te beschermen als de code er een `@PreAuthorize` voor heeft.** Nieuwe authorities die de applicatie zelf gebruikt komen via een Flyway-migratie (zie `V6` als voorbeeld). |

**Wanneer werkt een wijziging?** Authorities zitten in het token (levensduur **1 uur**). Neem je een authority af terwijl iemand is ingelogd, dan merkt die dat pas bij een **nieuwe login/token** (tot een uur later). Wil je direct effect: laat de gebruiker uit- en weer inloggen of vergrendel het account.

### 2.11 Aanwezige demo-accounts (seed)

`V2__initial_data.sql` maakt twee organisaties met vier accounts. **Er staan hier bewust geen wachtwoorden**; de demo-gegevens zijn fictief en de seed zelf beschrijft het testwachtwoord.

| Gebruikersnaam | Persoon | Organisatie | Rol |
|---|---|---|---|
| `jan.vanbergen` | Jan van Bergen | Puurkroatie | ADMIN |
| `maria.jansen` | Maria Jansen | Puurkroatie | EMPLOYEE |
| `pieter.degroot` | Pieter de Groot | TechPartner BV | MANAGER |
| `sophie.vandijk` | Sophie van Dijk | TechPartner BV | EMPLOYEE |

Merk op: in de seed heeft **Puurkroatie geen MANAGER**, alleen een ADMIN en een EMPLOYEE. Wil je daar het volledige beheer (templates, huisstijl) testen, maak dan een MANAGER aan via *Accounts* of de onboarding-wizard.

### 2.12 Checklist: rechten controleren

1. Welke authorities heeft de rol? → *Rollen → rol openen*.
2. Heeft het account de rol? → *Accounts → account openen*.
3. Staat het account op *vergrendeld*? Dan kan niet worden ingelogd.
4. Is het token verlopen of van vóór de wijziging? → opnieuw inloggen.
5. Hoort het gevraagde object bij dezelfde organisatie? Zo niet → `403`/`404`, ook met het juiste recht.
6. Is de actie een alleen-toevoegen-regel (betaling, status, e-mail)? Dan bestaat bewerken/verwijderen niet, wat je rechten ook zijn.

---

## 3. Inloggen en je eigen account

### 3.1 Inloggen (medewerkers)

1. Open de medewerkersapp (`/rds/`). Zonder geldige sessie ga je naar `/login`.
2. Vul **Gebruikersnaam** en **Wachtwoord** in → **Inloggen**.
3. Heeft je account 2FA aan, dan volgt een tweede stap (§3.2).
4. Is bij je account *Wachtwoord moet gewijzigd worden* aangezet, dan word je naar het scherm *Wachtwoord* geleid met de melding *"Je moet je wachtwoord wijzigen voordat je verder kunt gaan."*
5. Je komt op het **Dashboard**.

Meldingen: *"Controleer gebruikersnaam en wachtwoord"* bij een fout. Een **vergrendeld** account wordt geweigerd. De inlogendpoints zijn in productie rate-limited via NGINX.

### 3.2 Twee-factor-authenticatie (2FA/TOTP)

Als TOTP aan staat, geeft het eerste inlogpunt een tijdelijk token (`TOTP_PENDING`) dat alleen de tweede stap toestaat.

- **Authenticatorcode:** de 6-cijferige code van je app (Google Authenticator, Authy, …) → **Verifiëren**.
- **Herstelcode:** kies *Herstelcode gebruiken* en voer één van je herstelcodes in. Een herstelcode kan één keer worden gebruikt.

### 3.3 Je eigen account beheren (sectie MIJN BEHEER)

| Scherm | Wat je er doet |
|---|---|
| **Mijn gegevens** | voornaam, tussenvoegsel en achternaam van je eigen persoon wijzigen |
| **Wachtwoord** | huidig wachtwoord + nieuw wachtwoord + bevestiging. De interface vraagt **minimaal 8 tekens** (de server accepteert minimaal 6; zie §10). Je moet het huidige wachtwoord kennen. |
| **2FA Instellingen** | status zien (*Actief*/*Niet actief*), 2FA **activeren** (QR-code scannen of de sleutel handmatig invoeren, bevestigen met een code, herstelcodes bewaren) en **deactiveren** (met een huidige code) |

Bewaar de herstelcodes veilig: ze worden alleen getoond bij het instellen.

### 3.4 Taal en uitloggen

Rechtsboven in de balk staan je naam met organisatie, de **taalwisselaar** (Nederlands/Engels; de keuze wordt in de browser onthouden) en **Uitloggen**. Het token (`rds_token`) staat in de lokale opslag van de browser en is **1 uur** geldig; daarna word je naar het inlogscherm gestuurd. Bij een `401` (behalve op de inlogschermen) word je automatisch uitgelogd.

### 3.5 Beheer van andermans account

Zie §4.15 (Accounts). Een beheerder kan een account vergrendelen, een wachtwoordwijziging afdwingen, een vervaldatum zetten en 2FA van iemand anders resetten (`ACCOUNT_UPDATE`).

---

## 4. De medewerkersapp (`frontend-employee`)

### 4.1 Opbouw van het scherm

- **Linkermenu** (donker, kleur volgt de huisstijl): alleen de items waarvoor je authorities hebt (§2.6).
- **Bovenbalk:** titel, je naam (organisatie), taalwisselaar, uitloggen.
- **Werkgebied:** het geopende scherm.
- **Lijsten** (Boekingen, Boekers, Prospects, Betalingen, Accommodaties, Leveranciers, Activiteiten, Templates, E-mailtemplates, Personen, Accounts, Organisaties, Rollen, Rechten) gebruiken allemaal hetzelfde grid met één kolom **Acties** met iconen. **Klikken op de hele regel doet niets**; alleen de iconen werken:

| Icoon | Betekenis | Vereist |
|---|---|---|
| oog | **Inzien** (alleen lezen) | het `*_READ`-recht van de lijst |
| potlood | **Bewerken** | het `*_UPDATE`-recht |
| prullenbak | **Verwijderen** (altijd met bevestigingsvenster) | het `*_DELETE`-recht |

Een icoon verschijnt alleen als je het recht hebt. Detailpagina's gaan in *alleen-inzien*-modus met `?readonly=true`: formulier uitgeschakeld, geen opslaan/verwijderen.

- **Meldingen** verschijnen onderaan als snackbar (opgeslagen, fout, enz.).
- **Dubbelklik-bescherming:** een opslaan-knop verwerkt een tweede klik niet.
- **Bevestigen:** verwijderen vraagt altijd om bevestiging via een eigen dialoog.

### 4.2 Dashboard

Het dashboard kiest op **authorities**:

| Jij hebt… | Je ziet… |
|---|---|
| `ORGANIZATION_READ` (ADMIN) | **Beheerdashboard:** welkomstkaart (organisatie, rol) en een *Organisaties overzicht* met aantallen personen en accounts |
| geen `ORGANIZATION_READ`, wel `ACCOUNT_CREATE` (MANAGER) | **Managerdashboard** (zie hieronder) |
| anders (EMPLOYEE) | welkomstkaart en een plaatshouder *"Deze pagina wordt binnenkort beschikbaar."* |

**Managerdashboard** (lopend jaar):

- *Boekingen {jaar}*: tegels **Totaal**, **Afgerond**, **Actief**, **Toekomstig**; klik opent de boekingenlijst.
- *Totale omzet {jaar}*, *Betaald {jaar}*, *Openstaand* (klik opent *Betalingen*).
- *Top 5 meest geboekte accommodaties {jaar}* en *Top 5 meeste omzet accommodaties {jaar}*.

### 4.3 Boekingen (lijst)

Menu **Boekingen** (`BOOKING_READ`).

- **Kolommen:** Boekingnummer, Van, Tot, Status, Totaal, Acties.
- **Zoeken:** op boekingnummer of boeker; **Periode van/tot** als filter.
- **Nieuwe boeking:** kies eerst een hoofdboeker in het venster *Hoofdboeker selecteren* (of maak met *Nieuwe boeker* meteen een nieuwe aan; vereist `BOOKING_CREATE`). Daarna opent een **concept-boeking** (§4.4).
- **Iconen:** inzien (`?readonly=true`), bewerken, verwijderen (zie §8.3 voor de beveiliging).

Van, Tot en Totaal zijn **berekend**: de periode uit de boekingsregels en activiteiten, het totaal als som van de regelprijzen en activiteitsprijzen. Ze worden niet apart ingevoerd.

### 4.4 Boeking: detailscherm (het hoofdscherm)

Titel: *Boeking bewerken — BK-…* (of *Boeking inzien* in alleen-lezen-modus). Het scherm bestaat uit kaarten. Wijzigende knoppen vragen het bijbehorende recht **én** dat je niet in alleen-lezen-modus zit.

**Concept-boeking.** Start je een boeking vanuit een boeker (`/bookings/new?bookerId=…`), dan is het scherm voorgevuld met de boeker en de melding *"Concept — nog niet opgeslagen. De boeking wordt pas aangemaakt zodra je iets toevoegt."* Er wordt **niets opgeslagen** tot je het eerste onderdeel toevoegt (reiziger, accommodatie, activiteit, betaling). Pas dan ontstaat de boeking en krijgt die een boekingsnummer (eerst bevestigen: *"Hiermee wordt een definitieve boeking aangemaakt…"*). Heeft de boeker al een lopende (niet-afgeronde) boeking, dan volgt een waarschuwing: *"Mogelijk is de verkeerde boeker gekozen. Toch doorgaan?"* Een prospect met een nieuwe boeking wordt automatisch een actieve boeker.

| Kaart | Inhoud | Acties (vereist recht) |
|---|---|---|
| **Boekinggegevens** | boekingsnummer, status, berekende periode en totaalbedrag | **Bewerken**: status kiezen (`BOOKING_UPDATE`) |
| **Hoofdboeker** | naam, roepnaam, telefoon, e-mail, geboortedatum | *Toevoegen* (koppelen, `BOOKING_CREATE`); *Bewerken* van de boekergegevens (`BOOKING_UPDATE`); *Verwijderen* = ontkoppelen van de boeking (`BOOKING_DELETE`, de boeker zelf blijft bestaan) |
| **Accommodaties** (boekingsregels) | accommodatie, leverancier, van, tot, prijs | toevoegen/bewerken/verwijderen (`BOOKING_CREATE`/`_UPDATE`/`_DELETE`) |
| **Activiteiten** | activiteit, datum en tijden, trefpunt, totaalprijs | toevoegen/bewerken/verwijderen |
| **Reizigers** | naam, geslacht, geboortedatum, initialen | toevoegen/bewerken/verwijderen |
| **Betalingen** (alleen met `PAYMENT_READ`) | omschrijving, bedrag, datum, status | **Nieuwe betaling** (`PAYMENT_CREATE`); oog-icoon opent het betalingsvenster met de statushistorie. In dat venster staan *Naar andere boeking koppelen* (`PAYMENT_RELINK`) en *Correctie registreren* (`PAYMENT_CORRECT`). Een betaling bewerken (potlood, `PAYMENT_UPDATE`) kan alleen in het scherm *Betalingen*, en alleen zolang de betaling nog niet bij Mollie bestaat. |
| **Berichten en documenten** (tijdlijn; documenten met `DOCUMENT_READ`) | e-mails aan de hoofdboeker, documenten en betalingen, nieuwste bovenaan, met filter *Alles/E-mail/Documenten/Betalingen* | **Nieuw → E-mail aan hoofdboeker** (`EMAIL_SEND`), **Nieuw → Document** (`DOCUMENT_CREATE`) |

**Boekingsregel (accommodatie) toevoegen.** Kies een accommodatie, de leverancier, *Van datum*, *Tot datum* en de prijs. Het systeem controleert de periodes:
- *"{x} overlapt met {y}"* — overlap met een andere regel;
- *"Geen accommodatie van {van} tot {tot}"* — een gat in het verblijf.
In beide gevallen kies je **Toch opslaan** of **Aanpassen**. Heeft de gekozen accommodatie nog geen leverancier, dan kies of maak je er een (de koppeling wordt bij opslaan vastgelegd). Met `ACCOMMODATION_CREATE`/`SUPPLIER_CREATE` kun je direct een accommodatie of leverancier aanmaken via *Nieuwe accommodatie*/*Nieuwe leverancier* (alleen code en naam; de rest vul je later aan).

**Activiteit toevoegen.** Kies een activiteit, *Datum*, *Van-tijd*, *Tot-tijd* (24-uurs), *Trefpunt* en *Totaalprijs*. Is de tot-tijd vóór de van-tijd, dan **eindigt de activiteit de volgende dag** (hint in het venster, *"(volgende dag)"* in de tabel). Datum, van-tijd en tot-tijd zijn verplicht.

**Reiziger toevoegen.** Voornaam en achternaam zijn verplicht; verder tussenvoegsel, initialen, geslacht (*man/vrouw*; de API kent ook *anders*) en geboortedatum.

**Boeking verwijderen.** Zie §8.3: een boeking met documenten, betalingen, herkoppelingen of verzonden e-mails kan **niet** worden verwijderd (`409`). Verwijderen neemt anders reizigers, boekingsregels, activiteiten en betalingskoppelingen mee.

### 4.5 Berichten en documenten (tijdlijn)

De tijdlijn in de boeking vervangt de oude losse documentenkaart.

- **Pictogram links** toont de soort (mail, document, betaling); **gekleurde vlakjes** rechts de eigenschappen:
  - e-mail: *verstuurd* of *opnieuw verstuurd*;
  - document: *portaal* (groen, zichtbaar voor de klant) of *alleen intern*, plus het formaat;
  - betaling: de statusbadge en de methode.
- **Inzien** opent per soort het bestaande venster. Een e-mail opent het verzonden bericht (inhoud in een afgeschermd iframe) met **Opnieuw versturen** (`EMAIL_SEND`).
- **Document → potloodicoon** (`DOCUMENT_UPDATE`): alleen de zichtbaarheid in het boekerportaal wijzigen.
- **Geen verwijderknop:** documenten, betalingen en verzonden e-mails zijn geschiedenis en kunnen niet worden verwijderd (ontwerpbesluit, §8.2). Er is ook geen API-endpoint voor: `DELETE /api/documents/{id}` geeft `405`. Een per ongeluk geüploade of gegenereerde stand blijft dus staan; zet *Zichtbaar in het boekerportaal* uit zodat de klant het niet ziet.

### 4.6 Documenten toevoegen

Documenten maak je **alleen vanuit een boeking**. **Nieuw → Document** opent *Document toevoegen* (`DOCUMENT_CREATE`) met twee onderdelen:

| Onderdeel | Hoe |
|---|---|
| **Genereren** | kies een **Template** (Word-template), kies **PDF** of **DOCX** en klik **Genereer**. De naam wordt `<sjabloonnaam> - <boekingsnummer> - <datum tijd>.<ext>`, zodat hetzelfde sjabloon vaker kan worden gebruikt. |
| **Uploaden** | **sleep** een bestand in het vak, of kies **Kies bestand**, of haal het op via een **URL** (*Ophalen*). In de interface zijn **alleen PDF-bestanden** toegestaan (*"Ongeldig bestandstype. Alleen PDF-bestanden zijn toegestaan."*). Geef een **Documentnaam**. |

Beide manieren hebben het vinkje **Zichtbaar in het boekerportaal** (standaard **uit**): de klant ziet het document alleen als dit aan staat. Achteraf wijzig je dat via het potloodicoon in de tijdlijn.

Opmerking: een document gaat als JSON (bytes) naar de server, niet als multipart. De uploadlimiet van 2 MB (§12) geldt daarom voor **afbeeldingen**; een aparte grootte-limiet voor documenten is in de code niet ingesteld (de standaardgrenzen van de webserver blijven gelden).

### 4.7 E-mail versturen

E-mail versturen kan op **twee plekken**, en nergens anders. In het scherm *E-mailtemplates* maak en beheer je alleen templates.

1. **Vanuit de boeking:** *Berichten en documenten → Nieuw → E-mail aan hoofdboeker* (`EMAIL_SEND`). De dialoog toont de boeking als vast doel; kies een template, bekijk eventueel met **Genereer voorbeeld** het resultaat en klik **Verstuur**. Bevestig *"E-mail versturen naar de hoofdboeker van boeking {nummer}?"*. De mail gaat naar het e-mailadres van de **hoofdboeker**. Heeft de boeking geen hoofdboeker of heeft die geen e-mailadres, dan wordt er niets verstuurd.
2. **Vanuit de prospect:** in *Prospects* het **mail-icoon** op de regel (`EMAIL_SEND`). Dezelfde dialoog, nu met de prospect als vast doel; bevestig *"Weet je zeker dat je deze e-mail naar {naam} wilt versturen?"*.

De afzender is het adres dat bij de organisatie is ingesteld (`email_from`, alleen ADMIN kan dat instellen). Is dat leeg, of ontbreekt het ontvangeradres, dan volgt een duidelijke foutmelding (`400`). Een mail **voor een boeking** wordt na succesvol versturen bewaard in de tijdlijn; een mail aan een losse prospect wordt niet bewaard. Is er lokaal geen SMTP-server ingesteld, dan wordt er niets echt verstuurd maar alleen gelogd (§12).

### 4.8 Boekers

Menu **Boekers** (`BOOKING_READ`). Kolommen: Naam, E-mailadres, Telefoon, Geboortedatum, Acties. Zoek op naam, e-mail of telefoon.

- **Nieuwe boeker** en bewerken: voornaam en achternaam en een geldig e-mailadres zijn verplicht; verder tussenvoegsel, roepnaam, telefoon, geslacht, geboortedatum, initialen, status.
- Een **rij-icoon** start een **concept-boeking** voor die boeker (heeft hij meerdere boekingen, dan kies je eerst: *"Er zijn meerdere boekingen voor {naam}"*).
- **Adressen** van een boeker beheer je in het boekerdialoog (alleen bij een bestaande boeker, met `BOOKING_UPDATE`). Een adres heeft straat, huisnummer, toevoeging, postcode, plaats, land en een **rol** (*woon-, facturatie-, accommodatie- of leveranciersadres*).
- Verwijderen: zie §8.3.

### 4.9 Prospects

Menu **Prospects**. Het aanmeldproces voor potentiële klanten.

1. **Registreer prospect** (status `prospect`, nog geen boeking).
2. Mail ze via het **mail-icoon** op hun regel in *Prospects* (§4.7).
3. **Maak boeker** zet de status op `active` (*"Prospect is nu een boeker"*).
4. Maak er een boeking voor aan. **Zodra er een boeking voor een prospect ontstaat, wordt die automatisch `active`.** Een boeker met een andere status (bijv. `nietactief`) wordt niet vanzelf weer actief.

Statussen van een boeker: `prospect`, `active`, `nietactief`.

### 4.10 Reizigers

Reizigers beheer je in het boekingsdetail. De losse route `/travelers` bestaat wel maar staat niet in het menu.

### 4.11 Betalingen (overzicht)

Menu **Betalingen** (`PAYMENT_READ`). Kolommen: Mollie ID (`tr_…`), Boeking, Datum, Omschrijving, Methode, Bedrag, Status, Acties; bovenaan samenvattende tegels. Zie §6.6 voor de hele betaalketen.

- **Oog-icoon:** het betalingsvenster met de gegevens en de volledige **statushistorie** (alleen lezen).
- **Potlood:** alleen voor een betaling die nog niet bij Mollie is aangemaakt (omschrijving en bedrag aanpassen). Is de betaling al bij Mollie, dan geeft de server `409` (*"Deze betaling bestaat al bij Mollie en kan niet meer worden gewijzigd."*).
- **Geen prullenbak:** betalingen worden nooit verwijderd.
- **Correctie registreren** (`PAYMENT_CORRECT`): nieuwe status uit *open/betaald/mislukt/geannuleerd* + een **reden** van minstens 5 tekens. Het wordt een nieuwe regel met de markering *Correctie*, wie en wanneer. Een correctie naar de huidige status wordt geweigerd. Statussen *pending*, *authorized* en *expired* bepaalt alleen Mollie.
- **Naar andere boeking koppelen** (`PAYMENT_RELINK`): kies een andere boeking van dezelfde organisatie en geef een reden (5–500 tekens). De geschiedenis (van, naar, datum, door, reden) staat als tabel in hetzelfde venster.

Statussen: Open, In afwachting, Geautoriseerd, Betaald, Mislukt, Geannuleerd, Verlopen.

### 4.12 Accommodaties, Leveranciers en Activiteiten (stamgegevens)

Sectie **ORGANISATIE BEHEER** (alleen zichtbaar met een schrijfrecht; zie §2.6).

| Scherm | Velden | Bijzonderheden |
|---|---|---|
| **Accommodaties** | *Code* (key) en *Naam* verplicht | adressen (met rol), **leveranciers koppelen/ontkoppelen**; lijst toont naam, code, leverancier, adres; zoeken op naam, code of leverancier |
| **Leveranciers** | *Code* en *Naam* verplicht | adressen, gekoppelde accommodaties; zoeken op naam of code |
| **Activiteiten** | *Naam* en *Type* verplicht, *Omschrijving* | type: **tour, excursie, ticket, transfer** |

Verwijderen van een accommodatie of leverancier neemt de bijbehorende boekingsregels mee (waarschuwing), tenzij een boeking met documenten of betalingen eraan hangt (`409`). Bij een activiteit worden de boekingsactiviteiten meegenomen. Adressen die nergens anders meer aan hangen worden opgeruimd.

### 4.13 Templates (Word)

Menu **Templates** (`TEMPLATE_CREATE/UPDATE/DELETE`; lezen kan met `TEMPLATE_READ`). Hier maak en beheer je alleen de templates; een document genereer je vanuit een boeking (§4.6). Kolommen o.a. Naam, Omschrijving, Soort (*Editor* of *Geüpload bestand*), Aangemaakt.

Bij **Nieuwe template** kies je **Soort template**:
- **Word-bestand uploaden** — sleep een `.docx` met velden zoals `${booking.bookingNumber}` (alleen `.docx`). Een geüpload bestand is niet in de editor te openen.
- **In de editor maken** — de WYSIWYG-editor (§7). Bij het opslaan wordt de HTML een echt Word-document (A4, marge 2,5 cm, Calibri 11).

Het oog-icoon opent de template alleen-lezen (voor een geüploade template met een **Downloaden**-knop). Bij het bewerken van een geüploade template kun je **omschakelen** naar de editor; opslaan vervangt dan het geüploade bestand (*"Let op…"*-waarschuwing).

### 4.14 E-mailtemplates

Menu **E-mailtemplates** (`TEMPLATE_READ`). Velden: **Naam**, **Onderwerp** (platte tekst, mag variabelen bevatten) en de **HTML-body** in dezelfde editor. Het oog-icoon toont de template alleen-lezen; er is hier **geen voorbeeld en geen verzendknop**: dat kan alleen vanuit een boeking of een prospect (§4.7). Aanmaken, wijzigen en verwijderen is aan MANAGER; een EMPLOYEE kan de templates alleen bekijken.

### 4.15 Beheer (ADMIN en MANAGER)

**Organisaties** (ADMIN; `ORGANIZATION_*`). Velden: *Naam*, *Afzender-e-mailadres* (`email_from`, voor mail aan prospects en boekers), *Mollie-sleutel*. In het detail zie je de gekoppelde personen. **Verwijderen** wordt geweigerd (`409`) zolang er nog gegevens met die organisatie aan hangen; de melding noemt de aantallen per tabel.

**Onboarding-wizard** (*Organisaties → Onboarding wizard*, ADMIN). Een nieuwe organisatie in vier stappen met een samenvatting:
1. **Organisatie** — organisatienaam;
2. **Persoon** — voornaam, tussenvoegsel, achternaam;
3. **Account** — gebruikersnaam, wachtwoord, optie *Wachtwoord moet gewijzigd worden*;
4. **Rol toewijzen** — kies de rol (meestal `MANAGER`).
Afronden maakt alles aan: *"Onboarding succesvol afgerond!"*

**Personen** (`PERSON_*`; ADMIN en MANAGER). Voornaam, achternaam (verplicht), tussenvoegsel en organisatie. De organisatie kies je alleen met `ORGANIZATION_READ` (ADMIN); een MANAGER maakt personen automatisch in de eigen organisatie aan. In het detail zie je de gekoppelde accounts.

**Accounts** (`ACCOUNT_*`; ADMIN en MANAGER). Lijst met een zoekveld (gebruikersnaam) en filterknoppen op rol (Alle/Admin/Manager/Medewerker) en organisatie; een legenda toont *Actief* en *Vergrendeld*. Een account heeft: gebruikersnaam, wachtwoord, persoon, **vergrendeld**, **wachtwoordwijziging afdwingen**, **vervaldatum**, en 2FA-status. Beheerfuncties:
- **Rol toevoegen/verwijderen** (§2.9);
- **2FA resetten** van een ander account (`ACCOUNT_UPDATE`);
- vergrendelen om inloggen te blokkeren.

**Rollen** en **Rechten** (alleen ADMIN in het menu). *Rollen* toont per rol de kaart *Authorities* met koppelen en ontkoppelen (met bevestiging). *Rechten* beheert de authority-namen zelf. Zie §2.10.

**Huisstijl** (MANAGER, `ORGANIZATION_THEME_UPDATE`). *Thema-instellingen*: **Primaire kleur**, **Accentkleur**, **Kaart-titel kleur** (hexcode `#rrggbb`) en **Logo URL** (maximaal 500 tekens), met een voorbeeld. De kleuren sturen de hele interface: balk, actief menu-item, tabelkoppen, knoppen. Zonder thema is de standaardkleur teal `#0e8f8a`.

### 4.16 Afbeeldingenbibliotheek (in de editor)

In de editor staat naast *Variabelen* het tabblad **Afbeeldingen**, de bibliotheek van **de eigen organisatie**. Uploaden (PNG, JPEG, GIF of WebP; **maximaal 2 MB**; type wordt uit de bytes bepaald, SVG is niet toegestaan), een afbeelding in de tekst slepen of aanklikken, en verwijderen. Verwijderen kan alleen als de afbeelding **ongebruikt** is (geen e-mailtemplate en geen Word-template uit de editor van dezelfde organisatie, `409` anders) en vraagt `TEMPLATE_DELETE`. Een al verstuurde mail toont een verwijderd plaatje niet meer; de bevestiging waarschuwt hiervoor.

---

## 5. Het boekerportaal (voor klanten)

Het portaal (`/booker/`) is **alleen-lezen**, behalve het **betalen**. Elke ingelogde klant ziet uitsluitend de gegevens van de **eigen boeking**.

### 5.1 Inloggen met een eenmalige code

1. Open het portaal. Voer uw **E-mailadres** en **Boekingnummer** in → **Verificatiecode aanvragen**.
2. Er wordt een 6-cijferige code verstuurd (geldig **10 minuten**; maximaal 3 actieve codes per e-mailadres). Het systeem antwoordt altijd hetzelfde, zodat niemand kan raden welke combinaties bestaan.
3. Voer de **Verificatiecode** in → **Verifiëren**. Bij een fout: *"Ongeldige of verlopen verificatiecode"*.
4. U bent 1 uur ingelogd.

> **Let op (huidige stand):** de OTP-mail wordt nog **niet echt verstuurd**; `OtpEmailService` schrijft de code alleen in het serverlog. Zie §10. In een test lees je de code uit het backend-log.

### 5.2 Schermen

| Scherm | Inhoud |
|---|---|
| **Overzicht** (*Mijn Boeking*) | boeking-ID en vier snelkoppelingen: Reisschema, Documenten, Activiteiten, Betalingen |
| **Reisschema** | de volledige planning: verblijven (check-in, check-out, aantal nachten, *doorlopend verblijf*) en activiteiten (tour/excursie/ticket/transfer, *hele dag*), op volgorde |
| **Documenten** | de documenten die de medewerker **zichtbaar heeft gemaakt**, met naam en datum |
| **Accommodaties** | de verblijven van de boeking met check-in, check-out en nachten |
| **Activiteiten** | activiteit, periode, trefpunt, totaalprijs |
| **Betalingen** | tegels **Totaal**, **Betaald**, **Openstaand**; per betaling omschrijving, bedrag, status, datum en een uitklapbare **statushistorie**; knop **Betalen** |

Let op: de documentenlijst toont naam en datum; er is in de huidige interface **geen downloadknop** (de API kent wel `GET /api/booker-portal/documents/{id}`).

### 5.3 Betalen

1. Bij een betaling met status **Open**, **Mislukt** of **Verlopen** staat de knop **Betalen**.
2. De portal vraagt de backend de betaling bij Mollie te starten; u gaat naar de **betaalpagina van Mollie**.
3. Na het betalen keert u terug naar het portaal. De pagina **ververst zichzelf** (elke 2,5 seconden) tot de uitkomst bekend is; de status wordt via de Mollie-webhook bijgewerkt en u ziet *Betaald* zodra die binnen is.

Statussen voor de klant: Open, In behandeling, Geautoriseerd, Betaald, Mislukt, Geannuleerd, Verlopen.

### 5.4 Taal en uitloggen

Het portaal heeft een taalwisselaar (Nederlands/Engels) en **Uitloggen** in het menu. Het token (`rds_booker_token`) wordt na 1 uur ongeldig.

---

## 6. Werkprocessen stap voor stap

### 6.1 Van prospect tot afgeronde boeking

| Stap | Wie | Wat |
|---|---|---|
| 1 | EMPLOYEE/MANAGER | **Prospects → Registreer prospect** (naam, e-mail, status `prospect`) |
| 2 | EMPLOYEE/MANAGER | **Prospects → mail-icoon** → template kiezen → voorbeeld → **Verstuur** |
| 3 | EMPLOYEE/MANAGER | **Maak boeker**, of laat het systeem dat doen zodra een boeking ontstaat |
| 4 | EMPLOYEE/MANAGER | **Boekers → rij-icoon** (concept-boeking) of **Boekingen → Nieuwe boeking** |
| 5 | EMPLOYEE/MANAGER | in de boeking: **Accommodaties** (verblijven), **Activiteiten**, **Reizigers** toevoegen; status op `offerte` |
| 6 | EMPLOYEE/MANAGER | **Document genereren** (offerte/bevestiging) met *Zichtbaar in het boekerportaal* aan |
| 7 | EMPLOYEE/MANAGER | **E-mail aan hoofdboeker** met de boekingsgegevens; status `boeking` |
| 8 | EMPLOYEE/MANAGER | **Nieuwe betaling** (voorschot, restant); status `voorschot` |
| 9 | klant | logt in op het portaal en **betaalt** |
| 10 | EMPLOYEE/MANAGER | status `betaald`, later `opreis`, `weerthuis`, `afgerond` |

De statussen volgen **niet automatisch** op betalingen: de medewerker zet ze.

### 6.2 Een nieuwe organisatie in gebruik nemen (ADMIN)

1. **Organisaties → Onboarding wizard**: organisatie, eerste persoon, account, rol `MANAGER`. Laat *Wachtwoord moet gewijzigd worden* aan.
2. Open daarna de organisatie en vul het **Afzender-e-mailadres** in (nodig om e-mail te kunnen versturen) en eventueel de Mollie-sleutel.
3. Laat de manager inloggen, het wachtwoord wijzigen en bij voorkeur **2FA** instellen.
4. De manager stelt de **Huisstijl** in, maakt **Accommodaties/Leveranciers/Activiteiten**, **Templates** en **E-mailtemplates** aan en maakt de overige accounts (EMPLOYEE) aan.

### 6.3 Een Word-template maken en een document genereren

1. **Templates → Nieuwe template** → *In de editor maken*.
2. Typ de tekst; voeg **variabelen** in (paneel *Variabelen*: klik of sleep), bv. boekingsnummer, hoofdboeker, totaalbedrag.
3. Reizigers of verblijven in een tabel? Gebruik **Tabel → Herhaalde tabel** (§7.3).
4. **Opslaan.**
5. In een boeking: **Nieuw → Document → Genereren**, kies de template en **PDF** of **DOCX**, eventueel *Zichtbaar in het boekerportaal*, **Genereer**.
6. Controleer het resultaat in de tijdlijn.

### 6.4 Een e-mailtemplate maken en versturen

1. **E-mailtemplates → Nieuw template**: naam, onderwerp (bv. `Uw boeking ${booking.bookingNumber}`), body.
2. Gebruik `${prospect.*}` voor de ontvanger en `${booking.*}` voor boekinggegevens (de laatste werken alleen als de mail *voor een boeking* wordt verstuurd).
3. **Opslaan.** Het scherm *E-mailtemplates* is alleen voor het beheren van templates: daar kun je niet voorbeeld bekijken of versturen.
4. Versturen: in een boeking *Nieuw → E-mail aan hoofdboeker*, of in *Prospects* het mail-icoon. Kies de template, klik **Genereer voorbeeld** en daarna **Verstuur** (`EMAIL_SEND`).

### 6.5 Een klant toegang geven tot het portaal

Een klant heeft alleen zijn **e-mailadres** (zoals vastgelegd bij de hoofdboeker) en het **boekingsnummer** nodig. Controleer daarom bij de hoofdboeker dat het e-mailadres klopt, deel het boekingsnummer mee en maak de relevante documenten zichtbaar in het portaal.

### 6.6 Betalingen vastleggen en afhandelen

```
medewerker                         klant (portaal)                 Mollie
    │ 1. Nieuwe betaling                │                              │
    │    (bedrag, omschrijving)         │                              │
    │    status OPEN, geen Mollie-id    │                              │
    │                                   │ 2. Betalen ─────────────────►│ betaling aangemaakt
    │                                   │ ◄── checkout-URL ────────────│ (tr_…)
    │                                   │ 3. betaalt op Mollie ───────►│
    │ ◄─────────── 4. webhook (id) ─────────────────────────────────── │
    │    backend haalt de échte status bij Mollie op en legt die vast   │
    │                                   │ 5. portaal toont "Betaald" ◄ │
```

- De **webhook is de enige bron van de status**, niet de terugkeer-redirect.
- Een betaling is eerst een **aankondiging** (nog te wijzigen), na de start bij Mollie **geschiedenis** (alleen toevoegen).
- Betaalde buiten Mollie om (bank)? Registreer een **Correctie** met reden.
- Aan de verkeerde boeking gehangen? **Naar andere boeking koppelen** met reden.
- Een betaling en haar statushistorie worden **nooit verwijderd**, ook niet door een databaseactie (databasetriggers weigeren dat).

### 6.7 Een medewerker aanmaken of blokkeren (MANAGER)

1. **Personen → Nieuwe persoon**; daarna **Accounts → Nieuw account** (gebruikersnaam, startwachtwoord, persoon; zet *Wachtwoord moet gewijzigd worden* aan).
2. **Rol toevoegen** (`EMPLOYEE` of `MANAGER`).
3. Vertrekt iemand: zet het account op **vergrendeld** (inloggen onmogelijk) of verwijder het.
4. Is iemand zijn 2FA-apparaat kwijt: **2FA resetten** bij dat account.

### 6.8 Een afwijking in een betaling rechtzetten

1. Open de boeking → kaart *Betalingen* → oog-icoon.
2. Onjuiste status? **Correctie registreren** (nieuwe status + reden).
3. Verkeerde boeking? **Naar andere boeking koppelen** (doelboeking + reden).
4. Beide acties staan met wie, wanneer en waarom in de historie; niets wordt overschreven.

---

## 7. Templates: variabelen, tabellen en afbeeldingen

E-mailtemplates en Word-templates delen **één editor**, **één bibliotheek** en **één gegevensmodel**.

### 7.1 De editor

Knoppen: lettertype en -grootte, **vet / cursief / onderstrepen**, opsomming, genummerde lijst, **tabel** (invoegen, kolom/rij toevoegen en verwijderen, tabel verwijderen), **afbeelding**, plus de zijpanelen **Variabelen** en **Afbeeldingen**. Variabelen voeg je in door te klikken of te slepen.

Koppen, links (`http`, `https`, `mailto`, `tel`), uitlijning, kleur, doorhalen, horizontale lijn, citaat en codeblok worden ondersteund. Een afbeelding selecteer je met een klik; met de greep rechtsonder maak je hem groter of kleiner (de beeldverhouding blijft behouden, minimaal 40 px).

### 7.2 Variabelen

**Ontvanger — `${prospect.*}`** (voor e-mail; bij een boeking is dit de hoofdboeker):

| Variabele | Inhoud |
|---|---|
| `${prospect.firstname}` | voornaam |
| `${prospect.prefix}` | tussenvoegsel |
| `${prospect.lastname}` | achternaam |
| `${prospect.fullName}` | voornaam tussenvoegsel achternaam |
| `${prospect.callsign}` | roepnaam |
| `${prospect.telephone}` | telefoon |
| `${prospect.emailaddress}` | e-mailadres |
| `${prospect.gender}` | geslacht (hoofdletternaam, bijv. `MAN`) |
| `${prospect.birthdate}` | geboortedatum (`jjjj-mm-dd`) |
| `${prospect.initials}` | initialen |

**Boeking — `${booking.*}`**:

| Variabele | Inhoud |
|---|---|
| `${booking.bookingNumber}` | boekingsnummer |
| `${booking.bookingStatus}` | status (hoofdletternaam, bijv. `BOEKING`) |
| `${booking.fromDate}` / `${booking.untilDate}` | periode (`jjjj-mm-dd`) |
| `${booking.totalSum}` | totaalbedrag (getal) |
| `${booking.booker.*}` | de hoofdboeker (dezelfde velden als `prospect.*`) |
| `booking.travelers` | lijst: `firstname`, `prefix`, `lastname`, `gender`, `birthdate`, `initials` |
| `booking.bookingLines` | lijst: `fromDate`, `untilDate`, `price`, `accommodation.{key,name,addresses}`, `supplier.{key,name,addresses}` |
| `booking.bookingActivities` | lijst: `activityName`, `activityType`, `fromDate`, `untilDate`, `meetingPoint`, `totalPrice` |

Een adres heeft `street`, `housenumber`, `housenumberAddition`, `postalcode`, `city`, `country`, `addressrole`. De editor biedt alleen velden aan die bestaan; een verzonnen veld geeft pas bij het samenvoegen een fout.

### 7.3 Herhaalde tabellen

Een tabel waarvan de **laatste rij** voor elk element van een lijst wordt herhaald; de rijen erboven (de kop) blijven één keer staan. In de editor: **Tabel → Herhaalde tabel** → *Reizigers*, *Accommodaties* of *Activiteiten*. Dat voegt een tabel in met kopregel en een rij met de passende velden. *Herhaling uitzetten* maakt er weer een gewone tabel van. Zonder elementen blijft alleen de kop over.

Technisch (voor een zelf geschreven template): `<table data-repeat="booking.travelers" data-item="t">` met in de laatste rij `${t.firstname}`. Lijst- en itemnaam worden strikt gevalideerd; iets anders geeft `400`.

### 7.4 Valkuilen

- **Bedragen:** zonder opmaak toont FreeMarker `1250.00` als `1.250`. De editor voegt `${booking.totalSum?string("#,##0.00")}` in; gebruik dat voor bedragen.
- Gebruik **dubbele** aanhalingstekens (`"…"`) in expressies, nooit enkele (ook niet in een geüpload `.docx`).
- Datums zijn ISO-tekst (`jjjj-mm-dd`); andere opmaak vergt FreeMarker-functies.
- Tekst als `[#` of `<#` in een Word-template wordt als instructie gelezen.

### 7.5 Beperkingen van Word-templates uit de editor

Geen geneste tabellen, maximaal 64 kolommen, afbeeldingen alleen PNG/JPEG/GIF (WebP wel in e-mail), geen kop- of voettekst, geen paginanummers, geen tekstvakken; per tabel één herhalende rij (de laatste). Afbeeldingen komen altijd uit de bibliotheek van de eigen organisatie, nooit via een externe URL.

---

## 8. Regels, beveiliging en foutmeldingen

### 8.1 Beveiligingsmaatregelen in het kort

- **JWT**, stateless; drie soorten token (`EMPLOYEE`, `TOTP_PENDING`, `BOOKER`), elk met een eigen levensduur (nu 1 uur).
- **Wachtwoorden** met BCrypt; optionele **TOTP-2FA** met herstelcodes voor medewerkers.
- **Rate-limits** (NGINX) op alle inlogendpoints, de OTP-aanvraag, de Mollie-webhook en de publieke afbeeldingen.
- **Templates** worden als niet-vertrouwd behandeld: FreeMarker draait afgeschermd (geen `?new`, geen `?api`, geen include/import, plat model zonder Java-objecten).
- **Geen entities in API-antwoorden**: alleen DTO's; een test laat de build falen als dat toch gebeurt.

### 8.2 Alleen-toevoegen-regels

| Wat | Gedrag |
|---|---|
| Betalingen (`mollie_payment`) | nooit verwijderen; databasetriggers weigeren `DELETE` en `TRUNCATE` |
| Statusregels van betalingen | nooit wijzigen of verwijderen; een correctie is een *nieuwe regel* |
| Koppeling betaling ↔ boeking | nooit losmaken; alleen herkoppelen met reden (nieuwe regel) |
| Herkoppelregels | alleen toevoegen |
| Verzonden e-mails (`sent_email`) | alleen toevoegen; opnieuw versturen maakt een nieuwe regel |
| Documenten | nooit verwijderen: geen knop en geen endpoint (`DELETE` geeft `405`); anders dan bij betalingen en e-mails zit er geen databasetrigger op |

### 8.3 Verwijderbescherming (HTTP `409`)

Documenten en betalingen zijn de "waarheid" en mogen niet stilletjes verdwijnen. De server weigert daarom het verwijderen van:

- een **boeking** met documenten, betalingen, een herkoppeling of verzonden e-mails;
- een **boeker, accommodatie, leverancier of activiteit** die voorkomt in een boeking met documenten of betalingen;
- een **organisatie** zolang er nog gegevens van die organisatie bestaan.

Melding in de UI: *"Kan niet verwijderd worden: er hangen documenten of betalingen aan. Die blijven bewaard als geschiedenis."* Betalingen en documenten kunnen nooit worden verwijderd (er is geen knop en geen endpoint). Een boeking die een document of betaling heeft, blijft dus altijd beschermd. De controle zit in de services en is dus niet te omzeilen via de API. Wat **niet** geblokkeerd wordt: een boeking of stamgegeven zonder documenten of betalingen; die verdwijnt met de gekoppelde regels en activiteiten (database-cascade).

### 8.4 HTTP-statuscodes

| Code | Betekenis |
|---|---|
| `200` | gelukt |
| `201` | aangemaakt |
| `204` | verwijderd, geen inhoud |
| `400` | ongeldige invoer (validatie, onbekende enumwaarde, ontbrekend afzender-/ontvangeradres, ongeldige afbeelding in een template) |
| `401` | niet ingelogd of token verlopen |
| `403` | ingelogd, maar geen recht of ander organisatie |
| `404` | niet gevonden (ook voor andermans resources, zonder te lekken) |
| `409` | botsing: verwijderbescherming, vergrendelde betaling, afbeelding in gebruik |
| `413` | bestand te groot |

Fouten komen terug als `{ "message": "…", "status": 400, "timestamp": "…" }`; de UI toont de `message` waar nuttig.

---

## 9. API-referentie

### 9.1 Conventies

- Basis: `http(s)://<host>/rds/api/...` (rechtstreeks op de backend), of `/api/...` via NGINX of de dev-proxy.
- Alles is **JSON**, behalve de upload van afbeeldingen (multipart) en downloads (octet-stream); een document wordt als JSON met bytes aangeleverd. Binaire velden gaan als bytearray of base64; downloads via de aparte `…/content`-endpoints.
- Authenticatie: `Authorization: Bearer <jwt>`.
- REST per resource: `GET /resources`, `GET /resources/{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`.
- **Enums zijn lowercase** in JSON; onbekende waarde → `400` met de toegestane waarden.
- Datums `jjjj-mm-dd`, tijdstippen ISO, bedragen als getal (`70.00`).
- Lijsten zijn tenant-gefilterd (ADMIN ziet alles).
- Het totaal aantal endpoints: **165**, verdeeld over 39 controllers.

**Voorbeeld — inloggen en lezen**

```bash
BASE=http://localhost:8666/rds

# inloggen (medewerker)
curl -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"userName":"<gebruiker>","password":"<wachtwoord>"}'
# antwoord: { token, ... }  of  { requiresTotp: true, tempToken }
TOKEN=<token uit het antwoord>

curl $BASE/api/bookings -H "Authorization: Bearer $TOKEN"
curl "$BASE/api/bookers?status=prospect" -H "Authorization: Bearer $TOKEN"
```

**Voorbeeld — document genereren en e-mail renderen**

```bash
curl -X POST $BASE/api/documents/generate -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"templateId":"<id>","bookingId":"<id>","outputFormat":"pdf"}'

# voor precies één van bookerId / bookingId
curl -X POST "$BASE/api/email-templates/<id>/render?bookingId=<id>" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE/api/email-templates/<id>/send?bookerId=<id>"    -H "Authorization: Bearer $TOKEN"
```

### 9.2 Veldregels (validatie)

| Resource | Verplicht | Overig |
|---|---|---|
| Boeking | `bookingStatus` | `bookingNumber` ≤ 14 tekens (wordt gegenereerd), `bookerId` optioneel |
| Boeker | `firstname`, `lastname` (≤ 255), `emailaddress` (geldig e-mail) | `status`: `prospect` / `active` / `nietactief` |
| Reiziger | `bookingId`, `firstname`, `lastname` | geslacht: `man`, `vrouw`, `anders` |
| Boekingsregel | `bookingId`, `accommodationId`, `supplierId` | `fromDate`, `untilDate`, `price` |
| Boekingsactiviteit | `bookingId`, `activityId`, `activityDate`, `fromTime`, `untilTime` | `meetingPoint`, `totalPrice`; `untilTime` < `fromTime` = volgende dag |
| Accommodatie / Leverancier | `key`, `name` (≤ 255) | |
| Activiteit | `name`, `activityType` | `activityType`: `tour`, `excursie`, `ticket`, `transfer` |
| Adres | `street`, `city`, `country` (≤ 255) | `addressrole`: `woon`, `factuur`, `accommodatie`, `leverancier` |
| Organisatie | `name` | `emailFrom`, `mollieKey` |
| Thema | kleuren `#rrggbb` | `logoUrl` ≤ 500 tekens |
| Wachtwoord wijzigen | huidig en nieuw wachtwoord | nieuw: minimaal 6 tekens (UI: 8) |

### 9.3 Alle endpoints met benodigde authority

*Gegenereerd uit de `@PreAuthorize`-annotaties van de controllers. `–` = publiek of alleen eigen account.*

#### Inloggen en eigen account

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| POST | `/api/auth/login` | – | Inloggen (wachtwoord) |
| POST | `/api/auth/login/totp` | – | Tweede stap: authenticatorcode |
| POST | `/api/auth/login/recovery` | – | Tweede stap: herstelcode |
| POST | `/api/auth/totp/setup` | – | 2FA instellen (QR en herstelcodes) |
| POST | `/api/auth/totp/verify` | – | 2FA bevestigen met een code |
| POST | `/api/auth/totp/disable` | – | 2FA uitzetten |
| PUT | `/api/auth/change-password` | – | Eigen wachtwoord wijzigen |

#### Beheer: organisaties, personen, accounts, rollen, rechten, thema

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| GET | `/api/organizations` | `ORGANIZATION_READ` | Lijst |
| GET | `/api/organizations/{id}` | `ORGANIZATION_READ` | Eén opvragen |
| POST | `/api/organizations` | `ORGANIZATION_CREATE` | Aanmaken |
| PUT | `/api/organizations/{id}` | `ORGANIZATION_UPDATE` | Wijzigen |
| DELETE | `/api/organizations/{id}` | `ORGANIZATION_DELETE` | Verwijderen |
| GET | `/api/organization-themes` | `ORGANIZATION_THEME_READ` | Lijst |
| GET | `/api/organization-themes/{id}` | `ORGANIZATION_THEME_READ` | Eén opvragen |
| GET | `/api/organization-themes/my-theme` | `ORGANIZATION_THEME_READ` | Thema van de eigen organisatie |
| POST | `/api/organization-themes` | `ORGANIZATION_THEME_CREATE` | Aanmaken |
| PUT | `/api/organization-themes/{id}` | `ORGANIZATION_THEME_UPDATE` | Wijzigen |
| DELETE | `/api/organization-themes/{id}` | `ORGANIZATION_THEME_DELETE` | Verwijderen |
| GET | `/api/persons` | `PERSON_READ` | Lijst |
| GET | `/api/persons/{id}` | `PERSON_READ` | Eén opvragen |
| POST | `/api/persons` | `PERSON_CREATE` | Aanmaken |
| PUT | `/api/persons/{id}` | `PERSON_UPDATE` | Wijzigen |
| DELETE | `/api/persons/{id}` | `PERSON_DELETE` | Verwijderen |
| GET | `/api/accounts` | `ACCOUNT_READ` | Lijst |
| GET | `/api/accounts/{id}` | `ACCOUNT_READ` | Eén opvragen |
| POST | `/api/accounts` | `ACCOUNT_CREATE` | Aanmaken |
| PUT | `/api/accounts/{id}` | `ACCOUNT_UPDATE` | Wijzigen |
| DELETE | `/api/accounts/{id}` | `ACCOUNT_DELETE` | Verwijderen |
| DELETE | `/api/accounts/{id}/totp` | `ACCOUNT_UPDATE` | 2FA van het account resetten |
| GET | `/api/account-roles` | `ACCOUNTROLE_READ` | Lijst |
| GET | `/api/account-roles/assignable-roles` | `ACCOUNTROLE_READ` | Rollen die de ingelogde gebruiker mag toewijzen/intrekken |
| GET | `/api/account-roles/{accountId}/{roleId}` | `ACCOUNTROLE_READ` | Eén opvragen |
| POST | `/api/account-roles` | `ACCOUNTROLE_CREATE` | Aanmaken |
| DELETE | `/api/account-roles/{accountId}/{roleId}` | `ACCOUNTROLE_DELETE` | Verwijderen |
| GET | `/api/roles` | `ROLE_READ` | Lijst |
| GET | `/api/roles/{id}` | `ROLE_READ` | Eén opvragen |
| POST | `/api/roles` | `ROLE_CREATE` | Aanmaken |
| PUT | `/api/roles/{id}` | `ROLE_UPDATE` | Wijzigen |
| DELETE | `/api/roles/{id}` | `ROLE_DELETE` | Verwijderen |
| GET | `/api/authorities` | `AUTHORITY_READ` | Lijst |
| GET | `/api/authorities/{id}` | `AUTHORITY_READ` | Eén opvragen |
| POST | `/api/authorities` | `AUTHORITY_CREATE` | Aanmaken |
| PUT | `/api/authorities/{id}` | `AUTHORITY_UPDATE` | Wijzigen |
| DELETE | `/api/authorities/{id}` | `AUTHORITY_DELETE` | Verwijderen |
| GET | `/api/role-authorities` | `ROLEAUTHORITY_READ` | Lijst |
| GET | `/api/role-authorities/{roleId}/{authorityId}` | `ROLEAUTHORITY_READ` | Eén opvragen |
| POST | `/api/role-authorities` | `ROLEAUTHORITY_CREATE` | Aanmaken |
| DELETE | `/api/role-authorities/{roleId}/{authorityId}` | `ROLEAUTHORITY_DELETE` | Verwijderen |

#### Boekingen en klanten

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| GET | `/api/bookings` | `BOOKING_READ` | Lijst |
| GET | `/api/bookings/{id}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/bookings` | `BOOKING_CREATE` | Aanmaken |
| PUT | `/api/bookings/{id}` | `BOOKING_UPDATE` | Wijzigen |
| DELETE | `/api/bookings/{id}` | `BOOKING_DELETE` | Verwijderen |
| GET | `/api/bookers` | `BOOKING_READ` | Lijst |
| GET | `/api/bookers/{id}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/bookers` | `BOOKING_CREATE` | Aanmaken |
| PUT | `/api/bookers/{id}` | `BOOKING_UPDATE` | Wijzigen |
| DELETE | `/api/bookers/{id}` | `BOOKING_DELETE` | Verwijderen |
| GET | `/api/booker-addresses` | `BOOKING_READ` | Lijst |
| GET | `/api/booker-addresses/{bookerId}/{addressId}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/booker-addresses` | `BOOKING_CREATE` | Aanmaken |
| DELETE | `/api/booker-addresses/{bookerId}/{addressId}` | `BOOKING_DELETE` | Verwijderen |
| GET | `/api/travelers` | `BOOKING_READ` | Lijst |
| GET | `/api/travelers/{id}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/travelers` | `BOOKING_CREATE` | Aanmaken |
| PUT | `/api/travelers/{id}` | `BOOKING_UPDATE` | Wijzigen |
| DELETE | `/api/travelers/{id}` | `BOOKING_DELETE` | Verwijderen |
| GET | `/api/addresses` | `BOOKING_READ` | Lijst |
| GET | `/api/addresses/{id}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/addresses` | `BOOKING_CREATE` | Aanmaken |
| PUT | `/api/addresses/{id}` | `BOOKING_UPDATE` | Wijzigen |
| DELETE | `/api/addresses/{id}` | `BOOKING_DELETE` | Verwijderen |
| GET | `/api/booking-lines` | `BOOKING_READ` | Lijst |
| GET | `/api/booking-lines/booking/{bookingId}` | `BOOKING_READ` | Regels van een boeking |
| GET | `/api/booking-lines/{bookingLineId}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/booking-lines` | `BOOKING_CREATE` | Aanmaken |
| PUT | `/api/booking-lines/{bookingLineId}` | `BOOKING_UPDATE` | Wijzigen |
| DELETE | `/api/booking-lines/{bookingLineId}` | `BOOKING_DELETE` | Verwijderen |
| GET | `/api/booking-activities` | `BOOKING_READ` | Lijst |
| GET | `/api/booking-activities/booking/{bookingId}` | `BOOKING_READ` | Activiteiten van een boeking |
| GET | `/api/booking-activities/{bookingActivityId}` | `BOOKING_READ` | Eén opvragen |
| POST | `/api/booking-activities` | `BOOKING_CREATE` | Aanmaken |
| PUT | `/api/booking-activities/{bookingActivityId}` | `BOOKING_UPDATE` | Wijzigen |
| DELETE | `/api/booking-activities/{bookingActivityId}` | `BOOKING_DELETE` | Verwijderen |

#### Stamgegevens

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| GET | `/api/accommodations` | `ACCOMMODATION_READ` | Lijst |
| GET | `/api/accommodations/{id}` | `ACCOMMODATION_READ` | Eén opvragen |
| POST | `/api/accommodations` | `ACCOMMODATION_CREATE` | Aanmaken |
| PUT | `/api/accommodations/{id}` | `ACCOMMODATION_UPDATE` | Wijzigen |
| DELETE | `/api/accommodations/{id}` | `ACCOMMODATION_DELETE` | Verwijderen |
| GET | `/api/accommodation-addresses` | `ACCOMMODATION_READ` | Lijst |
| GET | `/api/accommodation-addresses/{accommodationId}/{addressId}` | `ACCOMMODATION_READ` | Eén opvragen |
| POST | `/api/accommodation-addresses` | `ACCOMMODATION_CREATE` | Aanmaken |
| DELETE | `/api/accommodation-addresses/{accommodationId}/{addressId}` | `ACCOMMODATION_DELETE` | Verwijderen |
| GET | `/api/accommodation-suppliers` | `ACCOMMODATION_READ` | Lijst |
| GET | `/api/accommodation-suppliers/{accommodationId}/{supplierId}` | `ACCOMMODATION_READ` | Eén opvragen |
| POST | `/api/accommodation-suppliers` | `ACCOMMODATION_CREATE` | Aanmaken |
| DELETE | `/api/accommodation-suppliers/{accommodationId}/{supplierId}` | `ACCOMMODATION_DELETE` | Verwijderen |
| GET | `/api/suppliers` | `SUPPLIER_READ` | Lijst |
| GET | `/api/suppliers/{id}` | `SUPPLIER_READ` | Eén opvragen |
| POST | `/api/suppliers` | `SUPPLIER_CREATE` | Aanmaken |
| PUT | `/api/suppliers/{id}` | `SUPPLIER_UPDATE` | Wijzigen |
| DELETE | `/api/suppliers/{id}` | `SUPPLIER_DELETE` | Verwijderen |
| GET | `/api/supplier-addresses` | `SUPPLIER_READ` | Lijst |
| GET | `/api/supplier-addresses/{supplierId}/{addressId}` | `SUPPLIER_READ` | Eén opvragen |
| POST | `/api/supplier-addresses` | `SUPPLIER_CREATE` | Aanmaken |
| DELETE | `/api/supplier-addresses/{supplierId}/{addressId}` | `SUPPLIER_DELETE` | Verwijderen |
| GET | `/api/activities` | `ACTIVITY_READ` | Lijst |
| GET | `/api/activities/{id}` | `ACTIVITY_READ` | Eén opvragen |
| POST | `/api/activities` | `ACTIVITY_CREATE` | Aanmaken |
| PUT | `/api/activities/{id}` | `ACTIVITY_UPDATE` | Wijzigen |
| DELETE | `/api/activities/{id}` | `ACTIVITY_DELETE` | Verwijderen |

#### Documenten en templates

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| GET | `/api/documents` | `DOCUMENT_READ` | Lijst |
| GET | `/api/documents/booking/{bookingId}` | `DOCUMENT_READ` | Documenten van een boeking |
| GET | `/api/documents/{id}/content` | `DOCUMENT_READ` | Inhoud downloaden |
| GET | `/api/documents/{id}` | `DOCUMENT_READ` | Eén opvragen |
| POST | `/api/documents` | `DOCUMENT_CREATE` | Aanmaken |
| PUT | `/api/documents/{id}` | `DOCUMENT_UPDATE` | Alleen `visibleInPortal` wijzigen |
| POST | `/api/documents/generate` | `DOCUMENT_CREATE` | Genereren uit een Word-template (pdf of docx) |
| GET | `/api/document-templates` | `TEMPLATE_READ` | Lijst |
| GET | `/api/document-templates/{id}` | `TEMPLATE_READ` | Eén opvragen |
| GET | `/api/document-templates/{id}/content` | `TEMPLATE_READ` | Het .docx downloaden |
| POST | `/api/document-templates` | `TEMPLATE_CREATE` | Aanmaken |
| PUT | `/api/document-templates/{id}` | `TEMPLATE_UPDATE` | Wijzigen |
| DELETE | `/api/document-templates/{id}` | `TEMPLATE_DELETE` | Verwijderen |

#### E-mail en afbeeldingen

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| GET | `/api/email-templates` | `TEMPLATE_READ` | Lijst |
| GET | `/api/email-templates/{id}` | `TEMPLATE_READ` | Eén opvragen |
| POST | `/api/email-templates` | `TEMPLATE_CREATE` | Aanmaken |
| PUT | `/api/email-templates/{id}` | `TEMPLATE_UPDATE` | Wijzigen |
| DELETE | `/api/email-templates/{id}` | `TEMPLATE_DELETE` | Verwijderen |
| POST | `/api/email-templates/{id}/render` | `TEMPLATE_READ` | Voorbeeld; precies één van `bookerId` of `bookingId` |
| POST | `/api/email-templates/{id}/send` | `EMAIL_SEND` | Versturen; precies één van `bookerId` of `bookingId` |
| GET | `/api/sent-emails/booking/{bookingId}` | `BOOKING_READ` | Verzonden e-mails van een boeking |
| GET | `/api/sent-emails/{id}` | `BOOKING_READ` | Eén verzonden e-mail met bewaarde HTML |
| POST | `/api/sent-emails/{id}/resend` | `EMAIL_SEND` | Opnieuw versturen (nieuwe regel) |
| POST | `/api/email-images` | `TEMPLATE_CREATE` of `TEMPLATE_UPDATE` | Afbeelding uploaden (multipart `file`) |
| GET | `/api/email-images` | `TEMPLATE_CREATE` of `TEMPLATE_UPDATE` | Bibliotheek van de eigen organisatie |
| DELETE | `/api/email-images/{id}` | `TEMPLATE_DELETE` | Verwijderen |
| GET | `/api/public/email-images/{id}` | – | Afbeelding uitleveren (voor mailclients) |

#### Betalingen (Mollie)

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| GET | `/api/mollie/payments` | `PAYMENT_READ` | Lijst |
| GET | `/api/mollie/payments/{id}` | `PAYMENT_READ` | Eén opvragen |
| POST | `/api/mollie/payments` | `PAYMENT_CREATE` | Aanmaken |
| PUT | `/api/mollie/payments/{id}` | `PAYMENT_UPDATE` | Wijzigen |
| POST | `/api/mollie/payments/create-at-mollie` | `PAYMENT_CREATE` | Direct bij Mollie aanmaken |
| POST | `/api/mollie/payments/webhook` | – | Webhook van Mollie (`?id=tr_…`) |
| GET | `/api/mollie/payment-status-entries` | `PAYMENT_READ` | Lijst |
| GET | `/api/mollie/payment-status-entries/by-payment/{molliePaymentId}` | `PAYMENT_READ` | Statushistorie van een betaling |
| POST | `/api/mollie/payment-status-entries/by-payment/{molliePaymentId}` | `PAYMENT_CORRECT` | Handmatige correctie `{status, reason}` |
| GET | `/api/booking-mollie-payments` | `PAYMENT_READ` | Lijst |
| GET | `/api/booking-mollie-payments/{bookingId}` | `PAYMENT_READ` | Betalingen van een boeking |
| GET | `/api/booking-mollie-payments/{bookingId}/{molliePaymentId}` | `PAYMENT_READ` | Eén opvragen |
| POST | `/api/booking-mollie-payments` | `PAYMENT_CREATE` | Aanmaken |
| GET | `/api/booking-mollie-payments/{molliePaymentId}/relinks` | `PAYMENT_READ` | Herkoppelgeschiedenis van een betaling |
| POST | `/api/booking-mollie-payments/{molliePaymentId}/relink` | `PAYMENT_RELINK` | Betaling herkoppelen naar een andere boeking (met reden) |

#### Klantportaal

| Methode | Pad | Authority | Omschrijving |
|---|---|---|---|
| POST | `/api/booker-auth/request-otp` | – | OTP aanvragen |
| POST | `/api/booker-auth/verify-otp` | – | OTP verifiëren; geeft een BOOKER-token |
| GET | `/api/booker-portal/itinerary` | `BOOKER_PORTAL_READ` | Reisschema van de boeking |
| GET | `/api/booker-portal/booking-lines` | `BOOKER_PORTAL_READ` | Lijst |
| GET | `/api/booker-portal/booking-activities` | `BOOKER_PORTAL_READ` | Lijst |
| GET | `/api/booker-portal/accommodations` | `BOOKER_PORTAL_READ` | Lijst |
| GET | `/api/booker-portal/activities` | `BOOKER_PORTAL_READ` | Lijst |
| GET | `/api/booker-portal/documents` | `BOOKER_PORTAL_READ` | Alleen documenten die zichtbaar zijn in het portaal |
| GET | `/api/booker-portal/documents/{id}` | `BOOKER_PORTAL_READ` | Eén zichtbaar document van de eigen boeking |
| GET | `/api/booker-portal/payments` | `BOOKER_PORTAL_READ` | Lijst |
| GET | `/api/booker-portal/payments/status-entries` | `BOOKER_PORTAL_READ` | Statushistorie van de betalingen |
| POST | `/api/booker-portal/payments/pay/{molliePaymentId}` | `BOOKER_PORTAL_UPDATE` | Betaling bij Mollie starten; geeft de checkout-URL |


### 9.4 Toegang op padniveau (`SecurityConfig`)

| Pad | Toegang |
|---|---|
| `/api/auth/login`, `/api/auth/login/totp`, `/api/auth/login/recovery` | publiek |
| `/api/booker-auth/**` | publiek (OTP aanvragen en verifiëren) |
| `/api/mollie/payments/webhook` | publiek (het id wordt gevalideerd: `tr_[A-Za-z0-9]+`) |
| `GET /api/public/email-images/*` | publiek (alleen GET) |
| `/monitoring/**` | publiek in Spring, in NGINX beperkt tot localhost en het beheer-IP |
| `/api/booker-portal/**` en overige `/api/**` | ingelogd, daarna `@PreAuthorize` per methode |

---

## 10. Bekende beperkingen

Eerlijke lijst van wat nu niet af of risicovol is. Volledige lijst: [open-items.md](open-items.md).

| Onderwerp | Stand |
|---|---|
| **OTP-mail is een stub** | klanten krijgen hun inlogcode nog niet per mail; de code staat in het serverlog. Klanten kunnen dus niet echt inloggen tot dit is gekoppeld aan de e-mailinfrastructuur. |
| **OTP-beheer** | verlopen codes tellen mee voor het maximum van 3 en worden niet opgeruimd; er is geen teller voor foute pogingen (alleen de NGINX-rate-limit). |
| **Geen automatische vergrendeling** | na foutieve inlogpogingen wordt een account niet vanzelf vergrendeld; `locked` zet een beheerder handmatig. |
| **`expires_at` van een account** | wordt bewaard en is bewerkbaar, maar wordt **niet afgedwongen** bij het inloggen. |
| **Eén Mollie-sleutel voor alle organisaties** | de sleutel per organisatie (`mollie_key`) wordt niet gebruikt voor API-aanroepen; alle betalingen gaan naar één Mollie-account. |
| **Twee manieren om een betaling bij Mollie te starten** | de portal-flow (`pay/{id}`, leidend) en `POST /api/mollie/payments/create-at-mollie` (medewerker). |
| **Statusovergangen van een boeking zijn vrij** | geen toestandsmachine; statussen volgen niet automatisch op betalingen. |
| **Wachtwoordregel verschilt** | de interface eist minimaal 8 tekens, de server accepteert bij *wachtwoord wijzigen* minimaal 6. |
| **Employee-dashboard** | is nog een plaatshouder. |
| **Documenten zijn niet te verwijderen** | een verkeerd geüpload of gegenereerd document blijft staan; het kan alleen uit het klantportaal worden gehaald (*Zichtbaar in het boekerportaal* uit). |
| **Portal-documenten** | worden getoond, maar er is nog geen downloadknop. |
| **E-mail** | synchroon verzonden, geen wachtrij of herpoging, geen bijlagen, geen CC/BCC, geen tracking. |
| **Token in browseropslag** | geen intrekking/refresh; een gestolen token is tot 1 uur geldig. |
| **Rol↔authority is globaal** | een wijziging geldt voor alle organisaties tegelijk en werkt pas bij een nieuw token. |
| **Publiek adres is http** | e-mailafbeeldingen en de Mollie-webhook gaan nu via een IP-adres zonder TLS. |
| **Test- en demogegevens** | de configuratie bevat fictieve geheimen en Mollie-testsleutels; die horen in een echte omgeving niet in de repository. |

---

## 11. Problemen oplossen

| Symptoom | Waarschijnlijke oorzaak | Oplossing |
|---|---|---|
| Menu-item ontbreekt | je rol heeft de vereiste authority niet | §2.6; vraag een beheerder de rol te controleren |
| Scherm opent maar blijft leeg of geeft een fout | geen recht op de data (`403`) of ander organisatie | §2.12 |
| Na een rechtenwijziging verandert er niets | het token bevat nog de oude authorities | uit- en inloggen |
| *"Controleer gebruikersnaam en wachtwoord"* | verkeerde gegevens, of het account is vergrendeld | wachtwoord controleren; beheerder vragen te ontgrendelen |
| Je moet steeds een nieuw wachtwoord kiezen | *Wachtwoord moet gewijzigd worden* staat aan | wachtwoord wijzigen; het vinkje vervalt daarna |
| 2FA-apparaat kwijt | geen toegang tot de authenticator | herstelcode gebruiken; anders laat een beheerder 2FA resetten |
| *"Kan niet verwijderd worden…"* (`409`) | er hangen documenten, betalingen, herkoppelingen of verzonden e-mails aan | bewust; gegevens blijven bewaard |
| *"Deze betaling bestaat al bij Mollie…"* | de betaling is al gestart | niet meer te wijzigen; gebruik een Correctie of Herkoppelen |
| E-mail versturen mislukt met `400` | geen afzenderadres bij de organisatie, of de hoofdboeker heeft geen e-mailadres | afzenderadres laten instellen (ADMIN); e-mailadres bij de hoofdboeker invullen |
| *"Onbekende of lege placeholder … `${booking}`"* | een template met `${booking.*}` is voor een prospect gebruikt | verstuur voor een boeking, of haal de boekingsvelden weg |
| Mail verstuurd maar niets aangekomen | lokaal: log-only; op de server: relay/SPF/DKIM | §12.3 |
| Afbeelding niet zichtbaar in ontvangen mail | het publieke adres is niet bereikbaar | NGINX-regel voor `/api/public/email-images/` en `app.email.public-api-base-url` controleren |
| Template-fout *"Onbekende afbeelding"* (`400`) | de afbeelding hoort bij een andere organisatie of bestaat niet | afbeelding uit de eigen bibliotheek gebruiken |
| Bedrag in document toont `1.250` i.p.v. `1.250,00` | geen opmaak in de expressie | `?string("#,##0.00")` gebruiken |
| Klant kan niet inloggen op het portaal | combinatie e-mail + boekingsnummer klopt niet, of OTP-mail is een stub | gegevens controleren; code uit het serverlog (§10) |
| Klant ziet een document niet | *Zichtbaar in het boekerportaal* staat uit | potloodicoon in de tijdlijn |
| Klant ziet de betaalstatus niet bijgewerkt | de webhook is nog niet binnen of niet bereikbaar | even wachten (de pagina ververst); webhook-URL en NGINX controleren |
| Een verkeerd document staat in de boeking | documenten kunnen niet worden verwijderd | zet *Zichtbaar in het boekerportaal* uit (potloodicoon) en gebruik de naam/een nieuw document om het te vervangen |
| Document uploaden geweigerd | geen PDF (de interface staat alleen PDF toe) | PDF gebruiken; is het bestand erg groot, controleer dan de logs van de server |

---

## 12. Beheer en configuratie

Voor beheerders; de volledige technische documentatie staat in [build-test-deploy.md](build-test-deploy.md), [security.md](security.md), [email.md](email.md) en [mollie.md](mollie.md).

### 12.1 Omgeving

| Onderdeel | Waarde |
|---|---|
| Backend | Spring Boot 4, Java 21, Jetty; poort **8666**, context-path **`/rds`**; luistert alleen op `127.0.0.1` |
| Database | PostgreSQL 17 (`rdsdb`); schema via **Flyway** (V1–V16), JPA staat op `validate` |
| Frontends | Angular 22; medewerkers dev-poort 4200, klanten 4300 |
| Reverse proxy | NGINX (`deploy/nginx/rds.conf`): `/rds/`, `/booker/`, `/api/`; rate-limits; afkappen van scanner-paden |
| Tests | embedded PostgreSQL (de tests starten zelf een tijdelijke database) |

### 12.2 Belangrijke instellingen (`application.yaml`, prefix `app.`)

| Sleutel | Betekenis | Standaard |
|---|---|---|
| `app.jwt.expiration-ms` | levensduur medewerkerstoken | 1 uur |
| `app.jwt.booker-expiration-ms` | levensduur klanttoken | 1 uur |
| `app.otp.expiry-minutes` | geldigheid OTP | 10 |
| `app.otp.max-active-per-email` | max. actieve OTP's per e-mailadres | 3 |
| `app.mollie.key` | Mollie-API-sleutel (`Bearer …`), **één globale sleutel** | testsleutel |
| `app.mollie.urls.webhook` | publiek bereikbare webhook-URL | publiek IP via NGINX |
| `app.mollie.urls.redirect` | waar de browser na betalen heen gaat (de klant-app) | – |
| `app.email.public-api-base-url` | absoluut adres voor afbeeldingen in verzonden mail | publiek adres |
| `app.email.image.max-bytes` | maximale afbeeldingsgrootte | 2 MB |
| `spring.servlet.multipart.max-file-size` / `max-request-size` | uploadlimiet voor multipart-uploads (de **afbeeldingenbibliotheek**) | 2 MB / 3 MB (houd gelijk aan de afbeeldingslimiet) |

Wachtwoorden, sleutels en tokens horen **niet** in documentatie of logs en in een echte omgeving in omgevingsvariabelen of een secret-store.

### 12.3 E-mailverzending

- Staat `spring.mail.host` **leeg**, dan draait de log-only-verzender: er wordt niets echt verstuurd, alleen gelogd (From/To/Subject/body). Handig lokaal.
- Staat `host` **gezet**, dan wordt via SMTP aan een externe relay afgeleverd. Op de server via `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`; poort 587 = STARTTLS.
- De app is een SMTP-**client**, geen mailserver. Voor het afzenderdomein per organisatie moet de relay geautoriseerd zijn: **SPF, DKIM en DMARC** moeten kloppen, anders belandt mail in spam.

### 12.4 Mollie lokaal testen

`start/scripts/start-mollie-tunnel.sh` start een Cloudflare quick-tunnel en schrijft de URL in `application-rds-local.yaml` (profiel `rds-local`, niet committen). De tunnel-URL wisselt bij elke start. Zonder bereikbare webhook komt een betaling wel bij Mollie aan, maar wordt de status niet bijgewerkt.

### 12.5 Een nieuwe authority of rol toevoegen (ontwikkelaar)

1. Nieuwe Flyway-migratie die de authority invoegt (`authority_id` volgt de reeks `d1000000-…-0000000000NN`) en aan de juiste rollen koppelt (zie `V6`, `V10`, `V12` als voorbeeld).
2. `@PreAuthorize("hasAuthority('…')")` op de nieuwe endpoints.
3. In de frontend de zichtbaarheid koppelen aan de authority (menu: `NavItem.authority`; knop: `authService.hasAuthority(…)`), nooit aan een rol.
4. Tests voor ADMIN, MANAGER, EMPLOYEE en ongeauthenticeerd.

---

## 13. Bijlagen

### Bijlage A — Waardelijsten (enums)

| Enum | Waarden (API, lowercase) |
|---|---|
| Boekingsstatus | `aanvraag`, `offerte`, `boeking`, `voorschot`, `betaald`, `opreis`, `weerthuis`, `afgerond` |
| Boekerstatus | `prospect`, `active`, `nietactief` |
| Geslacht | `man`, `vrouw`, `anders` |
| Adresrol | `woon`, `factuur`, `accommodatie`, `leverancier` |
| Activiteitstype | `tour`, `excursie`, `ticket`, `transfer` |
| Betaalstatus | `open`, `pending`, `authorized`, `paid`, `failed`, `canceled`, `expired` |
| Correctiestatussen | `open`, `paid`, `failed`, `canceled` |
| Betaalmethode | `ideal`, `creditcard`, `bancontact`, `sofort`, `banktransfer`, `paypal`, `belfius`, `kbc`, `eps`, `giropay`, `przelewy24`, `applepay`, `googlepay`, `in3`, `klarna`, `riverty` |
| Uitvoerformaat document | `pdf`, `docx` |

Opmerking: in de interface heet de boekingsstatus `opreis` *Op reis* en `weerthuis` *Weer thuis*. In templates is de waarde de hoofdletternaam (bijv. `OPREIS`).

### Bijlage B — Overzicht schermen en routes

| Route | Scherm | Menu-recht |
|---|---|---|
| `/login` | inloggen (+ 2FA, herstelcode) | publiek |
| `/dashboard` | dashboard (admin/manager/employee) | – |
| `/bookings`, `/bookings/new?bookerId=…`, `/bookings/:id` | boekingen, concept-boeking, detail | `BOOKING_READ` |
| `/bookers` | boekers | `BOOKING_READ` |
| `/prospects` | prospects | `BOOKING_READ` |
| `/travelers` | reizigers (geen menu-item) | – |
| `/accommodations` (+ detail) | accommodaties | `ACCOMMODATION_C/U/D` |
| `/suppliers` (+ detail) | leveranciers | `SUPPLIER_C/U/D` |
| `/activities` (+ detail) | activiteiten | `ACTIVITY_C/U/D` |
| `/templates` | Word-templates | `TEMPLATE_C/U/D` |
| `/email-templates` | e-mailtemplates | `TEMPLATE_READ` |
| `/payments` | betalingen | `PAYMENT_READ` |
| `/admin/organizations` (+ `new`, `onboarding`, `:id`) | organisaties en onboarding | `ORGANIZATION_READ` |
| `/admin/persons` (+ `new`, `:id`) | personen | `PERSON_CREATE`/`DELETE` |
| `/admin/accounts` (+ `new`, `:id`) | accounts | `ACCOUNT_CREATE`/`DELETE` |
| `/admin/roles` (+ `new`, `:id`) | rollen | `ROLE_C/U/D` |
| `/admin/authorities` (+ `new`, `:id`) | rechten | `AUTHORITY_C/U/D` |
| `/admin/theme` | huisstijl | `ORGANIZATION_THEME_UPDATE` |
| `/profile` | mijn gegevens | `PERSON_UPDATE` |
| `/change-password` | wachtwoord wijzigen | `ACCOUNT_UPDATE` |
| `/totp-settings` | 2FA-instellingen | – |

Portaal (`frontend-booker`): `/login`, `/verify`, `/dashboard`, `/itinerary`, `/documents`, `/accommodations`, `/activities`, `/payments`.

### Bijlage C — Authority → wat je in de interface verliest of krijgt

| Authority | Zichtbaar/mogelijk in de UI |
|---|---|
| `BOOKING_READ` | menu Boekingen/Boekers/Prospects; inzien-iconen; tijdlijn met verzonden e-mails |
| `BOOKING_CREATE` | *Nieuwe boeking*/*Nieuwe boeker*; toevoegen van reizigers, accommodaties, activiteiten |
| `BOOKING_UPDATE` | bewerken van boeking, status, boeker, adressen, regels |
| `BOOKING_DELETE` | verwijderen van boekingen, boekers, reizigers, regels, activiteiten |
| `ACCOMMODATION_*`, `SUPPLIER_*`, `ACTIVITY_*` | READ: kiezen in een boeking; C/U/D: menu en beheer; in de boeking snel aanmaken met `_CREATE` |
| `DOCUMENT_READ` | documenten in de tijdlijn |
| `DOCUMENT_CREATE` | *Nieuw → Document* (uploaden/genereren) |
| `DOCUMENT_UPDATE` | zichtbaarheid in het portaal wijzigen |
| `PAYMENT_READ` | menu Betalingen; kaart Betalingen in een boeking; oog-icoon |
| `PAYMENT_CREATE` | *Nieuwe betaling* |
| `PAYMENT_UPDATE` | potlood, alleen voor een betaling zonder Mollie-id |
| `PAYMENT_CORRECT` | *Correctie registreren* |
| `PAYMENT_RELINK` | *Naar andere boeking koppelen* |
| `TEMPLATE_READ` | menu E-mailtemplates (alleen-lezen weergave), templates kiezen en een voorbeeld genereren in de verstuur-dialoog |
| `TEMPLATE_CREATE/UPDATE/DELETE` | menu Templates (Word), aanmaken/wijzigen/verwijderen, afbeeldingen uploaden/verwijderen |
| `EMAIL_SEND` | *Verstuur* in de dialoog vanuit een boeking of prospect, het mail-icoon in *Prospects*, *E-mail aan hoofdboeker*, *Opnieuw versturen* |
| `ORGANIZATION_*` | menu Organisaties, onboarding, beheerdashboard |
| `PERSON_*`, `ACCOUNT_*` | Personen/Accounts, Mijn gegevens/Wachtwoord |
| `ROLE_*`, `AUTHORITY_*`, `ROLEAUTHORITY_*`, `ACCOUNTROLE_*` | Rollen/Rechten beheren; rollen aan accounts hangen |
| `ORGANIZATION_THEME_*` | menu Huisstijl; de kleuren en het logo |

### Bijlage D — Verwijzingen

| Onderwerp | Document |
|---|---|
| Overzicht en architectuur | [overview.md](overview.md), [architecture.md](architecture.md) |
| Domein en begrippen | [domain.md](domain.md), [glossary.md](glossary.md) |
| Beveiliging | [security.md](security.md) |
| Frontends | [frontend.md](frontend.md) |
| Klantportaal | [bookerportal.md](bookerportal.md) |
| Betalingen | [mollie.md](mollie.md) |
| E-mail en templates | [email.md](email.md), [templates.md](templates.md) |
| Datamodel | [database-model.md](database-model.md) |
| API-voorbeelden | [api-examples.md](api-examples.md) |
| Bouwen, testen, deployen | [build-test-deploy.md](build-test-deploy.md) |
| Openstaande punten | [open-items.md](open-items.md) |
