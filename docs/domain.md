# Domein

Het volledige tabelmodel staat in [database-model.md](database-model.md); begrippen in [glossary.md](glossary.md). Hier staat wat het model **betekent** en welke regels gelden.

## Tenant (organisatie)

Het systeem is multi-tenant per **ORGANIZATION**. Elke tenant-entiteit heeft `tenantOrganization` (UUID, onveranderlijk) en audit-velden (`createdAt/By`, `modifiedAt/By`). Een gebruiker ziet en wijzigt uitsluitend data van de eigen organisatie; zie [security.md](security.md).

Een organisatie heeft daarnaast: een **Mollie-sleutel** (`mollie_key`), een **afzenderadres voor e-mail** (`email_from`), en een **thema** (`organization_theme`: primaire/accentkleur, logo-URL, kaarttitelkleur).

## Gebruikersmodel (auth)

`ORGANIZATION → PERSON → ACCOUNT → (ACCOUNT_ROLE) ROLE → (ROLE_AUTHORITY) AUTHORITY`

- Een **persoon** hoort bij één organisatie; een **account** (login) hoort bij één persoon.
- Een account kan vergrendeld zijn, een vervaldatum hebben, een wachtwoordwijziging afdwingen en **TOTP** (2FA) hebben.
- Rollen: `ADMIN`, `MANAGER`, `EMPLOYEE`. Rechten zitten op **authorities** (granulair, bv. `BOOKING_READ`); de UI en `@PreAuthorize` kijken naar authorities.

## Boekingsdomein

```
Booker ──< Booking >── (hoofdboeker, optioneel)
Booking ──< Traveler
Booking ──< BookingLine >── Accommodation, Supplier
Booking ──< BookingActivity >── Activity
Booking ──< Document
Booking ──< BookingMolliePayment >── MolliePayment ──< MolliePaymentStatusEntry
Accommodation ──< AccommodationSupplier >── Supplier
Booker / Accommodation / Supplier ──< (koppeltabel) >── Address
DocumentTemplate, EmailTemplate, EmailImage   (per organisatie, los van een boeking)
```

| Begrip | Betekenis |
|---|---|
| **Booking** | het reisdossier. Heeft een **boekingsnummer** (`BK-<jaar>-<5 cijfers>`, gegenereerd, uniek) en een **status**. `fromDate`, `untilDate` en `totalSum` worden **afgeleid** uit de boekingsregels (min/max datum, som van prijzen) plus de activiteiten — ze worden niet apart opgeslagen. |
| **Booker** | de opdrachtgever/hoofdboeker (persoon, geen login). Een boeking verwijst naar maximaal één booker (de koppeling mag leeg zijn). |
| **Traveler** | een reiziger bij één boeking (naam, geslacht, geboortedatum, initialen). |
| **Accommodation** / **Supplier** | verblijfplaats en leverancier; een **BookingLine** koppelt een boeking aan een combinatie met periode en prijs. |
| **Activity** | activiteit (tour, excursie, ticket, transfer); **BookingActivity** plaatst die in een boeking met datum/tijd, ontmoetingspunt en totaalprijs. |
| **Address** | herbruikbaar adres met rol (woon, factuur, accommodatie, leverancier) |
| **Document** | een bestand bij een boeking (geüpload of gegenereerd uit een template; docx of pdf) |
| **MolliePayment** | een (verwachte of echte) betaling; losstaand van Booking, gekoppeld via een koppeltabel (maximaal één boeking per betaling, afgedwongen met een UNIQUE-constraint) |

### Levenscyclus van een boeking

`AANVRAAG → OFFERTE → BOEKING → VOORSCHOT → BETAALD → OPREIS → WEERTHUIS → AFGEROND`

De status is een enum (`BookingStatus`, in de database bewaakt door een CHECK-constraint). **De status kies je niet vrij**: `PUT /api/bookings/{id}` met een andere status geeft `400`. Het systeem zet hem (offerte versturen, offerte bevestigen, betalingen, reisdatums); een medewerker kan alleen terugzetten (met reden) en afronden. In de API en UI is de waarde lowercase (`aanvraag`, …), in het template-model de hoofdletter-naam (`BOEKING`).

![Stroomdiagram boekingsstatussen](img/boeking-statusflow.svg)

Het diagram toont de **automatische statussen** (stap 1 t/m 5, alle gebouwd): paars = handmatig met de rol die het mag, groen = systeem, oranje gestreept = terugval. Een nieuwe boeking start als `AANVRAAG`, *Offerte versturen* zet `OFFERTE`, het vinkje *Offerte bevestigd* zet `BOEKING` en maakt de betalingen aan (zie *Automatische betalingen*), de statusengine zet daarna `VOORSCHOT`, `BETAALD`, `OPREIS` en `WEERTHUIS` en rondt af (`AFGEROND`) zodra de boeking weer thuis is en alle meldingen zijn afgehandeld (zie *Statusengine en notificaties*). Een MANAGER kan ook zelf afronden. *Terugzetten met reden* kan naar elke eerdere status; zolang er niets betaald is mogen EMPLOYEE en MANAGER dat, daarna alleen een MANAGER. Een terugboeking via Mollie zet de status één stap terug (`BETAALD → VOORSCHOT`, `VOORSCHOT → BOEKING`).

### Booker, prospect en het aanmeldproces

Een **prospect** is **geen apart type**: het is een `Booker` met `status = PROSPECT` (kolom `booker.status`, migratie V4; waarden `PROSPECT`, `ACTIVE`, `NIETACTIEF`). Zo blijft het datamodel klein en kan een prospect zonder verhuizing een gewone boeker worden.

1. Medewerker registreert een potentiële klant op het scherm *Prospects* (status `PROSPECT`, nog geen boeking).
2. Mail met een e-mailtemplate versturen: mail-icoon op de regel in het scherm *Prospects* (template kiezen, voorbeeld bekijken, verzenden).
3. Vanaf een boeker (rij-icoon) of via de boekingenlijst een **concept-boeking** starten. **Een boeking ontstaat alleen vanuit een bestaande boeker** (de API weigert een boeking zonder `bookerId`, en een nieuwe boeking begint altijd als `AANVRAAG`); in het keuzevenster staat dus geen *Nieuwe boeker* meer.
4. **De status van een boeker volgt uit zijn boekingen** en is niet te kiezen (`BookerStatusUpdater`, sinds V17): geen boeking `PROSPECT`, minstens één boeking die nog niet is afgerond `ACTIVE`, alle boekingen afgerond `NIETACTIEF`. Elke nieuwe boeker begint als `PROSPECT`; een `status` in het verzoek wordt genegeerd. De backend rekent de status opnieuw na aanmaken, koppelen, ontkoppelen, een statuswijziging en verwijderen van een boeking. De knop *Maak boeker* is vervallen.

### Offerte bevestigen

De hoofdboeker bevestigt de (laatste) offerte van een **boeking**: `booking.quote_confirmed` met `quote_confirmed_at` (V17). Een medewerker zet het vinkje *Offerte bevestigd* in de dialoog *Boekinggegevens*. Dat kan alleen in status `OFFERTE` en met een hoofdboeker; de server zet dan het moment (`now()`) en de status op `BOEKING`. Uitvinken kan niet (`400`); terugzetten gaat later via een statuswijziging met reden.

### Offerte versturen

`POST /api/bookings/{id}/send-quote` (`QUOTE_SEND`, EMPLOYEE en MANAGER; `QuoteService`, sinds V18). Kan in status `AANVRAAG` of `OFFERTE`, zolang de offerte niet bevestigd is, en alleen met een hoofdboeker met e-mailadres. In één transactie:

1. de status wordt `OFFERTE` (eerst, zodat document en mail die status al tonen);
2. met de **offertetemplate** uit de organisatie-instellingen wordt een PDF gemaakt en als document bij de boeking bewaard, **zichtbaar in het portaal**;
3. de **offertemail** gaat naar de hoofdboeker met die PDF als bijlage; de verzonden mail wordt bewaard met een verwijzing naar het document (`sent_email.attachment_document_id`), zodat *Opnieuw versturen* dezelfde PDF weer meestuurt.

Mislukt een stap (PDF, mail), dan wordt alles teruggedraaid. Opnieuw versturen in `OFFERTE` maakt een nieuwe PDF en mail; eerdere offertes blijven staan.

### Organisatie-instellingen

`organization_settings` (V18): per organisatie één rij met keuzes die het systeem nodig heeft. Offerte (V18): `quote_document_template_id` en `quote_email_template_id` (beide optioneel; zonder beide kan geen offerte verstuurd worden). Betalingen (V19): `deposit_percentage` (1–100, standaard 30), `deposit_weeks_before_departure` (standaard 12), `balance_weeks_before_departure` (standaard 6; het voorschot moet eerder vervallen dan het restant) en `payment_email_template_id` (optioneel). Een gekozen template moet van de eigen organisatie zijn; verwijderen van de template maakt de keuze leeg (`ON DELETE SET NULL`). Zonder opgeslagen rij gelden de standaardwaarden. API: `GET`/`PUT /api/organization-settings/mine`.

### Automatische betalingen

Bij het bevestigen van de offerte (vinkje *Offerte bevestigd*, status wordt `BOEKING`) maakt `PaymentPlanService` in dezelfde transactie de betalingen aan, koppelt ze aan de boeking (status `OPEN`, nog niet bij Mollie) en stuurt de **betaalmail** naar de hoofdboeker als de organisatie er een heeft gekozen. Het schema (`PaymentPlan`, pure berekening) gaat uit van het totaal (verblijven plus activiteiten) en de **vertrekdatum** (de vroegste begindatum van de verblijven):

| Situatie (vandaag) | Betalingen |
|---|---|
| restanttermijn (vertrek − y weken) ligt nog voor ons | **VOORSCHOT** (x% van het totaal, op centen afgerond) uiterlijk vertrek − x weken, of vandaag als dat al voorbij is; **RESTANT** (de rest) uiterlijk vertrek − y weken |
| restanttermijn is al voorbij | één **DEFINITIEF**: het hele bedrag, uiterlijk vandaag |
| voorschot is 100% | alleen een VOORSCHOT |

Zonder verblijf met een prijs kan niet bevestigd worden (`400`, er verandert niets). Handmatig vastgelegde betalingen hebben soort **OVERIG** (ook alle betalingen van vóór V19) en tellen niet mee in het schema.

**Restant herberekenen.** Na elke wijziging van een verblijf of activiteit (toevoegen, wijzigen, verwijderen) rekent het systeem bij een bevestigde boeking het restant (of de definitieve betaling) opnieuw uit: totaal min voorschot. Dat gebeurt alleen zolang die betaling nog niet bij Mollie bestaat; zou het restant 0 of negatief worden, dan blijft het bedrag staan (gelogd).

**In templates** staan de betalingen als `booking.payments` (zie [templates.md](templates.md)), zodat de betaalmail ze kan opsommen.

### Concept-boeking

`/bookings/new?bookerId=…` opent het boekingsdetail voorgevuld met de hoofdboeker, maar **persisteert niets**. De boeking wordt pas aangemaakt (`ensureBookingPersisted`) zodra de eerste onderdelen worden toegevoegd (reiziger, boekingsregel, activiteit, betaling, …). Is er al een lopende (niet-afgeronde) boeking voor die boeker, dan vraagt het scherm eerst bevestiging. Een nieuwe boeking zonder boeker wordt teruggestuurd naar het overzicht.

### Statusengine en notificaties

`BookingStatusEngine` (pakket `bookingstatus`) bepaalt de status van een bevestigde boeking (status `BOEKING` t/m `WEERTHUIS`; `AANVRAAG`, `OFFERTE` en `AFGEROND` laat hij met rust) met een pure berekening (`StatusTarget`):

| Betalingen | Datum (vandaag) | Status |
|---|---|---|
| niets betaald | – | `BOEKING` |
| een deel betaald (het voorschot) | – | `VOORSCHOT` |
| alles betaald | vóór de vertrekdatum | `BETAALD` |
| alles betaald | vanaf de vertrekdatum t/m de terugkeerdatum | `OPREIS` |
| alles betaald | na de terugkeerdatum | `WEERTHUIS` |

"Betaald" kijkt naar de betalingen uit het betalingsschema (voorschot, restant, definitief); heeft een boeking die niet (van vóór stap 3), dan naar alle betalingen. Mislukte, geannuleerde en verlopen betalingen tellen niet mee; zonder betalingen beslist de engine niets. Vertrek = vroegste begindatum, terugkeer = laatste einddatum van de verblijven.

**Automatisch afronden** (stap 5): staat een boeking op `WEERTHUIS` en heeft ze geen openstaande notificaties meer, dan zet de engine haar op `AFGEROND` (statusgeschiedenis: *Systeem: weer thuis en alle meldingen afgehandeld*) en rekent de status van de boeker opnieuw uit (alle boekingen afgerond = `NIETACTIEF`). De notificatie *Weer thuis* moet dus eerst afgehandeld zijn. Een boeking die al op `WEERTHUIS` stond zonder notificaties (van vóór stap 4) wordt bij de eerstvolgende run afgerond.

**Wanneer.** Direct na het afhandelen van een notificatie (voor die boeking), direct na elke nieuwe betaalstatus (Mollie-webhook of correctie, via het event `PaymentStatusRecordedEvent` in dezelfde transactie), bij het **inloggen** van een medewerker (alle boekingen van diens organisatie, eigen transactie; een fout breekt het inloggen niet) en **elke nacht** om 02:15 (alle organisaties). Instelbaar onder `app.status-engine` (`on-login`, `cron`); in tests staat `on-login` uit.

**Terugboeking.** Meldt Mollie een teruggeboekt bedrag (`amountChargedBack`), dan legt de webhook de betaalstatus `CHARGED_BACK` vast (ook als correctie te registreren). Die betaling telt dan niet meer als betaald en de engine zet de status terug (bv. `BETAALD → VOORSCHOT`).

**Notificaties** (`notification`, V20): bij het bereiken van `BETAALD` (*Alles betaald: de reisgegevens kunnen verstuurd worden*), `OPREIS`, `WEERTHUIS`, en bij een terugval (*Betaling teruggedraaid*). Springt de status over een mijlpaal heen (bv. in één keer betaald tijdens de reis), dan komen alle bijbehorende notificaties. Geen dubbele: zolang er een open notificatie van dezelfde soort is, komt er geen nieuwe. Een medewerker handelt een notificatie af (wie en wanneer); verwijderd wordt er niets. Wat de knop *Reisgegevens versturen* moet doen is nog niet bepaald.

**Terugzetten en afronden.** `POST /api/bookings/{id}/status-revert` met `{targetStatus, reason}` (reden 5–500 tekens) zet terug naar een eerdere status: met `BOOKING_STATUS_REVERT` (EMPLOYEE, MANAGER) zolang er niets betaald is, daarna alleen met `BOOKING_STATUS_REVERT_PAID` (MANAGER; anders `403`). Terug naar `AANVRAAG` of `OFFERTE` maakt de bevestiging van de offerte ongedaan (opnieuw bevestigen maakt geen nieuwe betalingen: het schema bestaat al). Let op: zet je terug binnen `BOEKING`–`WEERTHUIS`, dan rekent de engine bij de volgende gelegenheid de status opnieuw uit. `POST /api/bookings/{id}/complete` (`BOOKING_COMPLETE`, MANAGER) rondt af, met optionele toelichting.

**Statusgeschiedenis** (`booking_status_change`, V20, alleen-toevoegen): elke statuswijziging met van, naar, door het systeem of een medewerker, reden, wie en wanneer. `GET /api/bookings/{id}/status-changes` (`BOOKING_READ`).

## Documenten en templates

- **DocumentTemplate** (Word, `.docx`) → met een boeking samengevoegd tot een **Document** (docx of pdf). Naam: `<sjabloonnaam> - <boekingsnummer> - <datum tijd>.ext` (het tijdstip voorkomt naamconflicten bij herhaald gebruik).
- **EmailTemplate** → met een booker of boeking samengevoegd tot onderwerp + HTML, te bekijken (voorbeeld) of te versturen, alleen vanuit een boeking of een prospect.
- Beide gebruiken **hetzelfde model** (`booking.*`, bij e-mail ook `prospect.*`) en dezelfde editor: zie [templates.md](templates.md).

## Betalen

Het systeem maakt bij het bevestigen van de offerte het betalingsschema aan (zie *Automatische betalingen*); een medewerker kan daarnaast zelf een betaling vastleggen (soort OVERIG). De klant betaalt in de portal; de webhook werkt de status bij (`OPEN → … → PAID`). Zie [mollie.md](mollie.md).

## Domeinregels om te onthouden

- **Geschiedenis blijft:** een boeking (en een booker, accommodatie, leverancier of activiteit waarin zo'n boeking voorkomt) met documenten of betalingen kan niet verwijderd worden (409). Documenten en betalingen hebben geen verwijderfunctie (geen knop en geen endpoint; `DELETE` geeft `405`). Zie [security.md](security.md).
- Altijd tenant-filtering respecteren; nooit een entity naar buiten (DTO's).
- Entities zijn onveranderlijk; een update behoudt `createdAt/By` en `tenantOrganization`.
- Booker-portal-endpoints geven **minimale** eigen DTO's en zijn gebonden aan de boeking uit het token.
- Een afbeelding in de bibliotheek hoort bij één organisatie en wordt nooit tussen organisaties gedeeld.
