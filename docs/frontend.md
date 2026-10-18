# Frontend: twee Angular-apps

| | `frontend-employee` | `frontend-booker` |
|---|---|---|
| Voor wie | medewerkers (MANAGER, EMPLOYEE, ADMIN) | klanten (bookers) |
| Dev-poort | 4200 | 4300 |
| Productie-pad (NGINX) | `/rds/` (build met `--base-href /rds/`) | `/booker/` |
| Token | JWT `type=EMPLOYEE`, `localStorage` sleutel `rds_token` | JWT `type=BOOKER`, `localStorage` sleutel `rds_booker_token` |
| Login | gebruikersnaam + wachtwoord (+ TOTP) | e-mailadres + boekingsnummer → OTP-code |
| Omvang | 16 feature-mappen, 56 spec-bestanden | 7 schermen, 1 spec |
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
| `bookings` | lijst, **detail** (hoofdscherm), boekingsregel-/activiteit-/bewerk-dialogen |
| `bookers`, `prospects`, `travelers` | bookers (+ concept-boeking starten), prospects (aanmeldproces), reizigers |
| `accommodations`, `suppliers`, `activities` | stamgegevens |
| `documents`, `templates` | documenten van boekingen; Word-templates (upload of editor) |
| `email-templates` | e-mailtemplates, preview- en verstuur-dialoog (prospect of boeking) |
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

### Lijsten met actie-iconen (inzien / bewerken / verwijderen)

Alle lijsten die direct vanuit het linkermenu bereikbaar zijn gebruiken hetzelfde grid: een Material-tabel met één vaste actiekolom, gevuld door `shared/components/row-actions.component.ts` (`<app-row-actions>`). **Klikken op de hele regel doet niets**; alleen de iconen werken.

| Lijst | Inzien (`*_READ`) | Bewerken (`*_UPDATE`) | Verwijderen (`*_DELETE`) |
|---|---|---|---|
| Boekingen | boekingdetail alleen-lezen (`?readonly=true`) | boekingdetail | ja, tenzij er documenten of betalingen aan hangen |
| Bookers, Prospects (`BOOKING_*`) | `BookerDialog` read-only | `BookerDialog` | ja |
| Documenten (`DOCUMENT_*`) | `DocumentViewDialog` (details + downloaden) | `DocumentEditDialog` (alleen de naam) | **nee** (geschiedenis) |
| Betalingen (`PAYMENT_*`) | `MolliePaymentViewDialog` (details + statushistorie) | `MolliePaymentEditDialog`, alleen voor een betaling die nog niet bij Mollie bestaat | **nee** (geschiedenis) |
| Accommodaties (`ACCOMMODATION_*`) | detail-dialoog | bewerkpagina | ja |
| Leveranciers (`SUPPLIER_*`) | `SupplierDetailComponent` alleen-lezen (`/suppliers/:id?readonly=true`) | detailpagina met adressen en gekoppelde accommodaties (`/suppliers/:id`, `/suppliers/new`) | ja |
| Activiteiten (`ACTIVITY_*`) | detailpagina alleen-lezen | detailpagina | ja |
| Templates (`TEMPLATE_*`) | `TemplateDialog` read-only (+ extra download-icoon) | `TemplateDialog` | ja |
| E-mailtemplates (`TEMPLATE_*`) | voorbeeld-dialoog (preview, met `EMAIL_SEND` ook versturen) | `EmailTemplateDialog` | ja |
| Personen, Accounts (`PERSON_*`, `ACCOUNT_*`) | detailpagina alleen-lezen | detailpagina | ja |

Conventies:
- **Alleen-lezen via query-parameter:** detailpagina's gaan in alleen-inzien met `?readonly=true` (formulier uitgeschakeld, opslaan-/toevoeg-/verwijderknoppen weg, titel "inzien"). In `booking-detail` doet `can(authority)` dat centraal: een wijzigende actie vraagt de authority **én** `!readOnly()`. Voor een nieuw item wordt `readonly` genegeerd.
- **Verwijderen:** altijd eerst `ConfirmService.confirmDelete(...)`. De **server weigert** (409) het verwijderen van een boeking, booker, accommodatie, leverancier of activiteit waaraan een boeking met documenten of betalingen hangt (`DeletionGuard`); de lijst toont dan `common.deleteBlocked` (`deleteErrorKey` in `shared/utils/delete-error.ts`).
- **Adressen beheren:** `shared/components/address-editor.component.ts` (`app-address-editor`) is een lijst + formulier zonder eigen API-calls: het meldt `create`/`update`/`remove` en de aanroeper koppelt aan de eigenaar. Gebruikt in `BookerDialogComponent` (alleen bij een bestaande booker, met `BOOKING_UPDATE`); accommodatie- en leveranciersdetail hebben hun eigen, oudere variant. Bij het verwijderen van een booker, accommodatie of leverancier ruimt de server de adressen op die nergens anders meer aan hangen (`AddressCleanup`).
- **"Nieuw" vanuit een keuzelijst:** `BookerSelectDialogComponent` heeft "Nieuwe boeker" (opent `BookerDialogComponent` in aanmaakmodus en kiest de nieuwe booker meteen, met `BOOKING_CREATE`); `BookingLineDialogComponent` kan een accommodatie en een leverancier aanmaken via `shared/components/quick-create-dialog.component.ts` (alleen code + naam; de rest vul je later op de detailpagina in). Heeft de gekozen accommodatie nog geen leverancier, dan kies of maak je er een en wordt de koppeling bij opslaan vastgelegd. Op de accommodatie-/leveranciersdetail maakt "Nieuwe leverancier"/"Nieuwe accommodatie" het record aan en koppelt het meteen.
- **Rollen en authorities:** `RoleDetailComponent` toont bij een bestaande rol een kaart met de gekoppelde authorities (`ROLEAUTHORITY_READ`), met koppelen (`_CREATE`) en ontkoppelen (`_DELETE`, met bevestiging). Rol↔authority is globaal (niet per organisatie); ADMIN heeft lezen/koppelen/ontkoppelen, MANAGER alleen lezen.
- **Documenten, betalingen en verstuurde e-mails zijn de waarheid-geschiedenis** en krijgen bewust geen verwijderknop.
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

Klein en alleen-lezen (behalve betalen). `core/auth/booker-auth.{service,guard,interceptor}`; schermen: `otp-login` (aanvragen + verifiëren), `dashboard`, `itinerary`, `accommodations`, `activities`, `documents`, `payments`. De betaalstatus wordt na terugkeer van Mollie gepolld (auto-refresh). Backend-endpoints: `/api/booker-auth/*` en `/api/booker-portal/*`, zie [bookerportal.md](bookerportal.md).

## Nieuw scherm toevoegen (checklist)

1. Model in `shared/models/` + export in `index.ts`.
2. Service in de feature-map (gebruik `ApiService`).
3. Component(en) standalone; route in `app.routes.ts` (lazy).
4. Menu-item in `layout.component.ts` met de juiste **authority**.
5. Vertalingen in `nl.json` en `en.json`.
6. Spec-bestand naast het component; draai `ng test` en `ng build`.
