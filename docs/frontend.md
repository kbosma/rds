# Frontend: twee Angular-apps

| | `frontend-employee` | `frontend-booker` |
|---|---|---|
| Voor wie | medewerkers (MANAGER, EMPLOYEE, ADMIN) | klanten (bookers) |
| Dev-poort | 4200 | 4300 |
| Productie-pad (NGINX) | `/rds/` (build met `--base-href /rds/`) | `/booker/` |
| Token | JWT `type=EMPLOYEE`, `localStorage` sleutel `rds_token` | JWT `type=BOOKER`, `localStorage` sleutel `rds_booker_token` |
| Login | gebruikersnaam + wachtwoord (+ TOTP) | e-mailadres + boekingsnummer → OTP-code |
| Omvang | 16 feature-mappen, 56 spec-bestanden | 1 dashboard-pagina met 8 kaarten, 2 inlogschermen, 19 spec-bestanden |
| Taal | nl/en (`public/i18n/{nl,en}.json`) | nl/en |

Gemeenschappelijk: **Angular 22**, TypeScript 6, standalone componenten (geen NgModules), RxJS 7.8, Angular Material 22 (+ CDK), `@ngx-translate/core` 18, `zone.js`. `frontend-employee` gebruikt daarnaast **TipTap 3** (WYSIWYG-editor).

De API-basis is `/api` (employee: `environment.apiUrl`; booker: harde `/api/...`-paden). Dev-proxy (`proxy.conf.json`): `/api` → `http://localhost:8666` met pad-herschrijving naar `/rds/api`. In productie doet NGINX hetzelfde.

## `frontend-employee`

### Structuur (`src/app`)

```
core/
  auth/      auth.service (signals, JWT-decode), auth.guard, auth.interceptor (Bearer + 401 → logout)
  i18n/      language.service (nl standaard, keuze in localStorage 'app-language'), translate-loader
  services/  api.service  (generieke CRUD: getAll/getById/create/update/delete)
features/    één map per scherm-gebied (zie tabel)
shared/
  components/  confirm-dialog, language-switcher
  services/    confirm.service
  models/      TypeScript-interfaces (spiegel van de backend-DTO's), index.ts
  template-editor/  de gedeelde WYSIWYG-editor (zie hieronder)
translate-test.setup.spec.ts   # laadt de echte nl-vertalingen in alle specs
```

### Features

| Map | Inhoud |
|---|---|
| `layout` | zijmenu (items per authority), toolbar, taalwissel |
| `login` | login, TOTP-stap, herstelcode |
| `dashboard` | dashboard per rol (admin/manager/employee) |
| `bookings` | lijst, **detail** (hoofdscherm), boekingsregel-/activiteit-/bewerk-dialogen. Een boekingsactiviteit heeft één datum + van-/tot-tijd (`type="date"`/`type="time"`, 24-uurs); tot-tijd vóór van-tijd = eindigt de volgende dag (hint in dialoog, "(volgende dag)" in de tabel) |
| `bookers`, `prospects`, `travelers` | bookers (+ concept-boeking starten), prospects (aanmeldproces), reizigers |
| `accommodations`, `suppliers`, `activities` | stamgegevens |
| `documents`, `templates` | documenten van boekingen; Word-templates (upload of editor) |
| `email-templates` | e-mailtemplates beheren (lijst, editor-dialoog, alleen-lezen weergave) en de verstuur-dialoog met voorbeeld (alleen geopend vanuit een boeking of een prospect, met een vast doel) |
| `mollie` | betalingen per boeking en overzicht |
| `admin` | organisaties (+ onboarding-wizard), personen, accounts, rollen, authorities, thema |
| `profile` | mijn profiel, wachtwoord wijzigen, TOTP instellen/uitzetten |

Routes staan in `app.routes.ts` (lazy `loadComponent`/`loadChildren`, alles onder `authGuard` behalve `/login`).

### Conventies

- **Authorities, geen rollen.** Menu-items en knoppen worden getoond op basis van `authService.hasAuthority('…')` (menu: `NavItem.authority`, string of lijst = "een van"). Er is nergens in de UI meer een rolcontrole: het dashboard kiest op `ORGANIZATION_READ` (beheer) en `ACCOUNT_CREATE` (manager), en de personen-/accountlijsten tonen organisaties met `ORGANIZATION_READ`. (`AuthService.hasRole` bestaat nog, maar wordt niet gebruikt.)
- **Geen API-calls in componenten:** altijd via een service (`booking.service.ts`, …) die `ApiService` of `HttpClient` gebruikt.
- **Signals + standalone:** state in `signal()`/`computed()`; `input()` voor component-inputs; formulieren zijn reactive forms (of `ngModel` in kleine dialogen). Velden die via `ngModel` veranderen horen niet in een `computed` (die ziet de wijziging niet): gebruik een methode of een signal.
- **Dialogs:** Material dialogs; `ConfirmService.confirm()/confirmDelete()` (eigen dialoog) vervangt `window.confirm` **overal**; gebruik die ook voor nieuwe bevestigingen.
- **Meldingen:** `MatSnackBar`; foutmeldingen uit de backend (`error.error.message`) worden getoond waar ze nuttig zijn (template-render, e-mail versturen, template opslaan).
- **Vertalingen:** elke zichtbare tekst via `translate`-pipe / `translate.instant`; sleutels in `nl.json` én `en.json`. Nieuwe sleutels altijd in beide talen. `npm run check:i18n` (in `frontend-employee`) controleert dat elke in de code gebruikte sleutel in `nl.json` én `en.json` bestaat en dat beide bestanden dezelfde sleutels hebben; een ontbrekende sleutel toont anders de ruwe sleutel (bv. `travelers.addTraveler`) in de UI. Het script ziet ook sleutels in data-objecten (`labelKey: '…'`); alleen sleutels die pas tijdens het draaien worden opgebouwd (`'bookings.status_' + waarde`) controleert het niet, die controleer je met de beschikbare waarden (alle statussen hebben een vertaling). Editor-teksten staan onder `templateEditor.*`.
- **Thema:** de organisatie bepaalt `--theme-primary`, `--theme-accent`, `--theme-card-title` (CSS-variabelen, gezet door `ThemeService`); gebruik die variabelen i.p.v. vaste kleuren.
- **Opslaan beschermen tegen dubbel starten.** Elke opslaan-methode begint met `if (… || this.saving()) return;` (en zet `saving` bij een fout weer op `false`). Alleen de `[disabled]`-knop is niet genoeg: een tik plus klik komt binnen enkele milliseconden twee keer binnen, vóórdat Angular de knop heeft uitgeschakeld, en dat maakte een boekingsregel dubbel aan (twee rijen met 64 ms verschil). Een nieuw formulier krijgt dezelfde guard en een test die `onSubmit()` twee keer aanroept.
- **Tenant/rol-logica zit in de backend.** De UI verbergt alleen; de server is de enige echte controle.
- **Datums/bedragen:** datums als ISO-tekst (`jjjj-mm-dd`) tussen UI en API; `DatePipe`/`CurrencyPipe` voor weergave.

### Design (compact en kleurrijk)

Het gedeelde ontwerp staat in `src/styles.scss` van **beide** apps (de bestanden zijn gelijk; wijzig ze samen). Het bouwt voort op het prebuilt Material-thema `azure-blue`, maar overschrijft de Material-tokens op `html`:

- **Kleur volgt de organisatie.** `--mat-sys-primary` e.d. wijzen naar `--theme-primary`; afgeleide tinten (`--ui-primary-faint/soft/hover/strong/deep`) worden met `color-mix` berekend. Gebruik die i.p.v. vaste blauwtinten. Standaard (zonder organisatiethema) is teal `#0e8f8a`.
- **Compact:** velden 40px (tekst 14px, regelhoogte 20px, padding 10px, zodat tekst nooit wordt afgeknipt), tabelrijen en -kop 40px, knoppen 36px. Wijzig de hoogte via `--mat-form-field-container-height` en `--mat-form-field-container-vertical-padding` (samen: hoogte = regelhoogte + 2 × padding).
- **Tabellen:** getinte, hoofdletter-kop; om-en-om gekleurde rijen en hover komen globaal uit `.mat-mdc-row`; zet dus geen eigen `alt-row`-stijl meer in componenten.
- **Zijbalk:** donker (`--ui-primary-deep`), actief item in `--theme-primary`.
- **Kaarten:** de inhoud van een kaart met header krijgt `padding-top: 12px`, anders staat de eerste regel (bv. "Naam") bijna tegen de titel.
- **Dialoog:** Material geeft de inhoud direct na de titel geen ruimte erboven, waardoor het zwevende label van het eerste veld werd afgesneden; `styles.scss` zet daar `padding-top: 8px`.
- De uitklappijl van `mat-select` is 24px en wordt in `styles.scss` op 20px gezet, anders is een select 4px hoger dan een tekstveld.

### Betalingen in een boeking

De kaart *Betalingen* in het boekingsdetail toont per betaling alleen een oog-icoon (`PAYMENT_READ`, alleen lezen) dat `MolliePaymentViewDialogComponent` opent: de gegevens en de volledige statushistorie, zonder knoppen om iets te wijzigen. Statussen komen van Mollie en worden nooit gewijzigd of verwijderd (alleen-toevoegen). Een medewerker met `PAYMENT_RELINK` ziet daarnaast de knop *Naar andere boeking koppelen* (`MolliePaymentRelinkDialogComponent`: andere boeking + verplichte reden); de herkoppelgeschiedenis (van, naar, datum, door, reden) staat als tabel in hetzelfde dialoog en na een herkoppeling sluit het dialoog en herlaadt de lijst. Een medewerker met `PAYMENT_CORRECT` kan in dat dialoog een **correctie** registreren (`MolliePaymentCorrectionDialogComponent`: nieuwe status uit `open/paid/failed/canceled` en een verplichte reden); die verschijnt als nieuwe regel met de markering *Correctie*, naam en reden. Bij "Door" staat de leesbare naam van wie een regel aanmaakte (`createdByName` uit de backend; medewerker of boeker), "Systeem" voor Mollie en "Onbekend" als het id niet (meer) bij een naam past; nooit het ruwe id. De statusbadge (vertaald en gekleurd) komt uit `shared/components/payment-status-badge.component.ts` en wordt in het uitklapscherm en het dialoog gebruikt.

### Berichten en documenten (tijdlijn in de boeking)

`BookingMessagesCardComponent` (`features/bookings`) vervangt de losse documentenkaart: één lijst met e-mails aan de hoofdboeker, documenten en betalingen, nieuwste bovenaan (`buildTimeline` in `booking-timeline.ts`), met een filter (Alles, E-mail, Documenten, Betalingen). Het pictogram links toont de soort (`mail`, `description`, `credit_card`); de gekleurde vlakjes rechts de eigenschappen (e-mail: verstuurd/opnieuw verstuurd; document: portaal en formaat; betaling: de bestaande statusbadge en methode). De knop *Nieuw* biedt *E-mail aan hoofdboeker* (`EMAIL_SEND`, bestaand dialoog) en *Document* (`DOCUMENT_CREATE`, bestaand uploaddialoog); de losse e-mailknop op de hoofdboeker-kaart is vervallen. Een document toont *portaal* (groen) of *alleen intern*; het potloodicoon (`DOCUMENT_UPDATE`) opent `DocumentPortalDialogComponent`, waarmee alleen die zichtbaarheid te wijzigen is (naam, inhoud en boeking staan vast). Het aanmaakdialoog (genereren én uploaden) heeft een vinkje *Zichtbaar in het boekerportaal*, standaard uit. Inzien opent per soort het bestaande dialoog; een e-mail opent `SentEmailViewDialogComponent` (inhoud in een sandbox-iframe, *Opnieuw versturen* met `EMAIL_SEND`). Betalingen blijven daarnaast hun eigen kaart houden voor beheer (statushistorie, correctie, herkoppelen).

### Lijsten met actie-iconen (inzien / bewerken / verwijderen)

Alle lijsten die direct vanuit het linkermenu bereikbaar zijn gebruiken hetzelfde grid: een Material-tabel met één vaste actiekolom, gevuld door `shared/components/row-actions.component.ts` (`<app-row-actions>`). **Klikken op de hele regel doet niets**; alleen de iconen werken.

**Ook in tabellen op een detailscherm** (accommodaties, reizigers, activiteiten, documenten van een boeking) gebruik je `<app-row-actions>` met `class="actions-cell"` op de `td` en `class="actions-header"` op de `th`, zodat de iconen altijd naast elkaar op één regel staan. Als vangnet zet `styles.scss` `white-space: nowrap` op elke tabelcel die direct een `mat-icon-button` bevat; los icoon-knoppen in een cel wrappen dus ook niet meer onder elkaar.

| Lijst | Inzien (`*_READ`) | Bewerken (`*_UPDATE`) | Verwijderen (`*_DELETE`) |
|---|---|---|---|
| Boekingen | boekingdetail alleen-lezen (`?readonly=true`) | boekingdetail | ja, tenzij er documenten of betalingen aan hangen |
| Bookers, Prospects (`BOOKING_*`) | `BookerDialog` read-only | `BookerDialog` | ja |
| Betalingen (`PAYMENT_*`) | `MolliePaymentViewDialog` (details + statushistorie) | `MolliePaymentEditDialog`, alleen voor een betaling die nog niet bij Mollie bestaat | **nee** (geschiedenis) |
| Accommodaties (`ACCOMMODATION_*`) | detail-dialoog | bewerkpagina | ja |
| Leveranciers (`SUPPLIER_*`) | `SupplierDetailComponent` alleen-lezen (`/suppliers/:id?readonly=true`) | detailpagina met adressen en gekoppelde accommodaties (`/suppliers/:id`, `/suppliers/new`) | ja |
| Activiteiten (`ACTIVITY_*`) | detailpagina alleen-lezen | detailpagina | ja |
| Templates (`TEMPLATE_*`) | `TemplateDialog` read-only (+ extra download-icoon) | `TemplateDialog` | ja |
| E-mailtemplates (`TEMPLATE_*`) | `EmailTemplateDialog` alleen-lezen (geen voorbeeld of verzenden: dat kan alleen vanuit een boeking of prospect) | `EmailTemplateDialog` | ja |
| Personen, Accounts (`PERSON_*`, `ACCOUNT_*`) | detailpagina alleen-lezen | detailpagina | ja |

Conventies:
- **Alleen-lezen via query-parameter:** detailpagina's gaan in alleen-inzien met `?readonly=true` (formulier uitgeschakeld, opslaan-/toevoeg-/verwijderknoppen weg, titel "inzien"). In `booking-detail` doet `can(authority)` dat centraal: een wijzigende actie vraagt de authority **én** `!readOnly()`. Voor een nieuw item wordt `readonly` genegeerd.
- **Verwijderen:** altijd eerst `ConfirmService.confirmDelete(...)`. De **server weigert** (409) het verwijderen van een boeking, booker, accommodatie, leverancier of activiteit waaraan een boeking met documenten of betalingen hangt (`DeletionGuard`); de lijst toont dan `common.deleteBlocked` (`deleteErrorKey` in `shared/utils/delete-error.ts`).
- **Adressen beheren:** `shared/components/address-editor.component.ts` (`app-address-editor`) is een lijst + formulier zonder eigen API-calls: het meldt `create`/`update`/`remove` en de aanroeper koppelt aan de eigenaar. Gebruikt in `BookerDialogComponent` (alleen bij een bestaande booker, met `BOOKING_UPDATE`); accommodatie- en leveranciersdetail hebben hun eigen, oudere variant. Bij het verwijderen van een booker, accommodatie of leverancier ruimt de server de adressen op die nergens anders meer aan hangen (`AddressCleanup`).
- **"Nieuw" vanuit een keuzelijst:** `BookerSelectDialogComponent` heeft "Nieuwe boeker" (opent `BookerDialogComponent` in aanmaakmodus en kiest de nieuwe booker meteen, met `BOOKING_CREATE`); `BookingLineDialogComponent` kan een accommodatie en een leverancier aanmaken via `shared/components/quick-create-dialog.component.ts` (alleen code + naam; de rest vul je later op de detailpagina in). Heeft de gekozen accommodatie nog geen leverancier, dan kies of maak je er een en wordt de koppeling bij opslaan vastgelegd. Op de accommodatie-/leveranciersdetail maakt "Nieuwe leverancier"/"Nieuwe accommodatie" het record aan en koppelt het meteen.
- **Rollen en authorities:** `RoleDetailComponent` toont bij een bestaande rol een kaart met de gekoppelde authorities (`ROLEAUTHORITY_READ`), met koppelen (`_CREATE`) en ontkoppelen (`_DELETE`, met bevestiging). Rol↔authority is globaal (niet per organisatie); ADMIN heeft lezen/koppelen/ontkoppelen, MANAGER alleen lezen.
- **Documenten, betalingen en verstuurde e-mails zijn de waarheid-geschiedenis** en krijgen bewust geen verwijderknop (ook niet in de tijdlijn *Berichten en documenten*); ook `DocumentService` heeft geen `delete`.
- Een nieuwe lijst: kolom `actions`, `<app-row-actions [canView] [canEdit] [canDelete]>`, geen regelklik, specs voor icoon-zichtbaarheid per authority en voor elke actie.

### De gedeelde template-editor (`shared/template-editor/`)

Wordt gebruikt voor **e-mailtemplates** en **Word-templates**; details in [templates.md](templates.md).

| Bestand | Rol |
|---|---|
| `template-body-editor.component.ts` | TipTap-editor als `ControlValueAccessor` (waarde = HTML); toolbar, variabelenpaneel, tabellen, herhaalde tabellen, afbeeldingen (upload, slepen, plakken) |
| `template-variables.ts` | welke variabelen/herhaalde tabellen een soort template aanbiedt (`EMAIL_VARIABLE_GROUPS`, `DOCUMENT_VARIABLE_GROUPS`, `BOOKING_REPEAT_TABLES`) — namen **moeten** overeenkomen met de backend-contextklassen |
| `template-image-library.component.ts`, `template-image.service.ts` | afbeeldingenbibliotheek (API `/api/email-images`) |

Gebruik: `<app-template-body-editor [(ngModel)]="html" [variableGroups]="…" [repeatTables]="…">`.

### Tests

Jasmine + Karma op **Firefox headless** (`karma.conf.js`). `translate-test.setup.spec.ts` zorgt dat specs de echte vertalingen zien (anders geeft `translate.instant` de sleutel terug). Wie met `--include` een deel draait, moet dat setup-bestand óók includen. Component-specs mocken services met `jasmine.createSpyObj`. Zie [build-test-deploy.md](build-test-deploy.md).

## `frontend-booker`

Eén **dashboard** met alles van de eigen boeking op één pagina, zonder te klikken om iets te zien (alleen betalen en downloaden zijn acties). Het ontwerp en de afwegingen staan in [voorstel-booker-dashboard.md](voorstel-booker-dashboard.md); de API in [bookerportal.md](bookerportal.md).

### Structuur (`src/app`)

```
core/
  auth/      booker-auth.{service,guard,interceptor}                  (ongewijzigd)
  i18n/      language.service, translate-loader
  portal/
    portal.service.ts     alle aanroepen van /api/booker-portal/**
    portal.store.ts       signals + computed: fase, aftelling, tijdlijn, agenda, eerstvolgende, betaaltotalen, betalen, downloaden, betaalstatus verversen
    trip-model.ts         zuivere rekenfuncties (geen Angular): fase, tijdlijn, agenda, eerstvolgende, betalingen
    date-utils.ts         lokale datums (nooit new Date(tekst): dat verschuift een dag)
    message-model.ts      e-mails en documenten in één lijst (nieuwste eerst), filter, "toon alle"
    loadable.ts           één stuk gegevens met eigen laadtoestand (laden, klaar, fout)
    apply-theme.ts        huisstijl van de organisatie op :root, alleen geldige hexkleuren
    portal.tokens.ts      PORTAL_NOW, PORTAL_REDIRECT, PORTAL_SAVE_FILE (te vervangen in tests)
features/
  dashboard/ dashboard.component (raster + store), trip-hero, payment-alert, next-up, trip-timeline, stays, activities, payments-card, messages-card, message-dialog
  layout/    smalle balk met taal en uitloggen (geen navigatie)
  otp-login/ aanvragen en verifiëren van de code
shared/
  components/ section-card (titel + skeleton / fout / leeg / inhoud), event-title, language-switcher
  models/     portal.models (spiegel van de portal-DTO's)
testing/     portal-fixtures (vaste gegevens en een PortalService-spy voor specs)
```

### Indeling en responsive

- De pagina is zelf de **container** (`container: page / inline-size`); kaarten kiezen hun indeling met `@container page (…)`, niet met de viewport.
- Breekpunten: **telefoon < 600 px** (één kolom, in volgorde van urgentie, betaalbalk bovenaan, tijdlijn als verticale agenda, verblijven als zwiepbare kaarten), **tablet 600–999 px** (twee kolommen), **desktop ≥ 1000 px** (brede kolom met planning, smalle kolom met *wat komt eraan*, betalingen en documenten).
- Op telefoon en tablet doen de kolomwrappers niet mee (`display: contents`) en bepaalt `grid-template-areas` de volgorde; op desktop zijn het echte kolommen. De HTML-volgorde is dus de leesvolgorde voor schermlezers.
- De tijdlijn heeft **één model en twee weergaven** (balken met genummerde punten, en agenda); een container query toont de passende.
- De store hoort bij de pagina (`providers: [PortalStore]` op `DashboardComponent`): een volgende klant op hetzelfde apparaat begint met een lege toestand.

### Gedrag om te weten

- **Fase** (voor, tijdens, na de reis) volgt uit de datums van de boeking, met terugval op de verblijven; niet uit de status.
- **Berichten en documenten:** één lijst met de verzonden e-mails (`/messages`) en de vrijgegeven documenten, nieuwste bovenaan, met filter *Alles / E-mail / Documenten* (alleen als beide soorten bestaan) en maximaal zes regels tot *Toon nog n*. De lijst haalt alleen onderwerp en datum op; de inhoud van een mail komt pas bij het openen. Die staat in `MessageDialogComponent` in een `iframe` met `sandbox=""` (geen scripts, geen eigen herkomst) en `referrerpolicy="no-referrer"`. Mislukt één van de twee bronnen, dan toont de kaart wat er is met een melding en *Opnieuw proberen*; pas als beide mislukken is het een fout.
- **Kaart-isolatie:** elke kaart heeft een eigen `Loadable`; een fout in één kaart toont *Opnieuw proberen* en breekt de rest niet. De planning (tijdlijn, *wat komt eraan*) hangt van `overview`, verblijven en activiteiten af en toont één gecombineerde toestand.
- **Betaalstatus:** na `pay()` zet de store een vlag in `sessionStorage`. Bij terugkeer van Mollie ververst het dashboard de betalingen elke 2,5 s tot alles een eindstatus heeft (maximaal 13 keer); ook zolang een betaling `pending` of `authorized` is.
- **Oude paden** (`/payments`, `/itinerary`, `/documents`, `/accommodations`, `/activities`, `/dashboard`) verwijzen naar `/`. Mollie stuurt de klant na het betalen naar `/payments` (backend: `app.mollie.urls.redirect`).
- **Huisstijl:** `applyTheme` zet `--theme-primary`, `--theme-accent` en `--theme-card-title` uit `overview.organization` en herstelt de standaard bij weggaan; kleuren worden eerst op `#rrggbb` gecontroleerd.
- **Toegankelijkheid:** één `h1` (de kop), een `h2` per kaart met `aria-labelledby`, status altijd met tekst en pictogram (nooit alleen kleur), tikdoelen van 44 px op de betaalknop, `prefers-reduced-motion`, `env(safe-area-inset-*)`.
- **Datumnotatie** volgt de gekozen taal (`nl` of `en`); `nl` is geregistreerd in `app.config`, `en` is ingebouwd.

### Tests

Jasmine + Karma op **Firefox headless**, dezelfde opzet als `frontend-employee` (`karma.conf.js`, `translate-test.setup.spec.ts`, dat ook `nl` als locale registreert voor datums en bedragen). `npx ng test --watch=false --browsers=FirefoxHeadless` (met `MOZ_NO_REMOTE=1` als Firefox al open staat). De zuivere logica (`trip-model`, `date-utils`, `apply-theme`, `Loadable`) en de store (incl. betalen, downloaden en verversen met `fakeAsync`) hebben eigen specs; elke kaart heeft een spec voor inhoud, leeg, fout en acties. Gegevens komen uit `testing/portal-fixtures.ts`.

Lokaal bekijken zonder backend: een eigen proxy-config (`ng serve --proxy-config <bestand>`) naar een stub van `/api/booker-portal/**`, en een token met een geldige `exp` in `localStorage` (`rds_booker_token`).

## Nieuw scherm toevoegen (checklist)

1. Model in `shared/models/` + export in `index.ts`.
2. Service in de feature-map (gebruik `ApiService`).
3. Component(en) standalone; route in `app.routes.ts` (lazy).
4. Menu-item in `layout.component.ts` met de juiste **authority**.
5. Vertalingen in `nl.json` en `en.json`.
6. Spec-bestand naast het component; draai `ng test` en `ng build`.
