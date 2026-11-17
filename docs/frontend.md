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
  auth/      auth.service (signals, JWT-decode, authorities, can()), access (ACCESS: authorities per scherm),
             auth.guard, authority.guard, auth.interceptor (Bearer + 401 → logout)
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

Routes staan in `app.routes.ts` (lazy `loadComponent`/`loadChildren`, alles onder `authGuard` behalve `/login`). Elke pagina behalve dashboard en 2FA-instellingen heeft ook `authorityGuard` met `data: { access: ACCESS.… }`; zonder recht ga je naar het dashboard met de melding `common.noAccess`. `app.routes.spec.ts` laat de build falen bij een route zonder guard.

### Conventies

- **Authorities, geen rollen.** Wat een scherm nodig heeft staat één keer in `core/auth/access.ts` (`ACCESS`, met `anyOf`/`allOf`); het menu (`NavItem.access`) en de route-guards lezen daaruit. Knoppen en kaarten gebruiken `authService.hasAuthority('…')` of `authService.can(ACCESS.…)`. `AuthService.authorities` is een signal, zodat alles opnieuw tekent bij een nieuw token. Er is geen `hasRole` meer; rolnamen komen alleen als tekst in beeld (welkomstkop, rolfilter in de accountlijst, die de rollen uit de lijst zelf haalt).
- **Een kaart haalt alleen op wat mag.** Een kaart of dashboard die een eigen API-aanroep doet, toont zich en roept aan alleen met de bijbehorende authority (bijv. betalingen met `PAYMENT_READ`, documenten met `DOCUMENT_READ` in de boekingsdetails; de dashboards via `ACCESS.adminDashboard`/`managerDashboard`). Zo geeft een gedeeltelijke set rechten (eigen rol) nooit 403-fouten.
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

Het ontwerp (inclusief de actiekleuren `act-*` en de lijsttint `zebra-rows`) staat in `src/styles.scss`. Kleuren, actiekleuren en tabelstijl zijn in **beide** apps gelijk; de **dichtheid en de gedeelde pagina-opbouw** hieronder gelden alleen voor `frontend-employee` (het boekerportaal is voor klanten, ook op de telefoon, en blijft ruimer). Wijzig gemeenschappelijke onderdelen (kleuren, `act-*`, tabellen) in beide bestanden. Het bouwt voort op het prebuilt Material-thema `azure-blue`, maar overschrijft de Material-tokens op `html`:

- **Kleur volgt de organisatie.** `--mat-sys-primary` e.d. wijzen naar `--theme-primary`; afgeleide tinten (`--ui-primary-faint/soft/hover/strong/deep`) worden met `color-mix` berekend. Gebruik die i.p.v. vaste blauwtinten. Standaard (zonder organisatiethema) is teal `#0e8f8a`. Grijze tekst is altijd `var(--ui-text-muted)`, geen losse `#888`/`#666`.
- **Compact (medewerkersportaal):** basistekst 13px; velden 36px (tekst 13px, regelhoogte 20px, padding 8px, zodat tekst nooit wordt afgeknipt), tabelrijen en -kop 34px, knoppen 32px (label 13px, icoon 18px), icoonknoppen 32px met een icoon van 20px, knoppengroepen (`mat-button-toggle`) 30px. Wijzig de veldhoogte via `--mat-form-field-container-height` en `--mat-form-field-container-vertical-padding` (samen: hoogte = regelhoogte + 2 × padding). Datum- en tijdvelden krijgen expliciet `height: 20px`, anders maakt de browser ze te laag en vallen de cijfers onderaan weg.
- **Tabellen:** getinte, hoofdletter-kop; om-en-om gekleurde rijen en hover komen globaal uit `.mat-mdc-row`; zet dus geen eigen `alt-row`-stijl meer in componenten. De om-en-om tint is bewust zacht (`--ui-primary-faint`, 5% van de organisatiekleur; de kop is 12%, hover 18%). Een lijst die geen tabel is (zoals de tijdlijn *Berichten en documenten* in het boekingdetail) krijgt dezelfde tint en hover met de klasse `zebra-rows` op de lijst; de directe kinderen zijn de regels (`shared/components/row-stripes.spec.ts` bewaakt dat de tint zacht blijft). `app-row-actions` is een blok-element, anders reserveert de cel ruimte voor letterstaarten en wordt de rij hoger.
- **Zijbalk:** donker (`--ui-primary-deep`), actief item in `--theme-primary`, tekst en iconen als lichte tinten van de organisatiekleur (`--sidenav-*` in de layout, geen vaste teal), groepskoppen in gewone schrijfwijze (12px/600), 212px breed. De werkbalk toont geen app-titel meer (die staat in de zijbalk). Met de knop links in de werkbalk klap je hem in tot 56px (alleen iconen; de naam verschijnt als tooltip via `title`). De keuze wordt per browser onthouden (`localStorage` `rds_sidenav_collapsed`). Gebruik in de layout geen `MatTooltip`: die trekt ~70 kB overlay-code de startbundel in (budget 700 kB).
- **Kaarten:** binnenruimte 12px boven/onder en 16px opzij; titel 15px/600. De inhoud van een kaart met header krijgt extra `padding-top`, anders staat de eerste regel (bv. "Naam") bijna tegen de titel.
- **Dialoog:** Material geeft de inhoud direct na de titel geen ruimte erboven, waardoor het zwevende label van het eerste veld werd afgesneden; `styles.scss` zet daar `padding-top: 8px`.
- **Vlakken:** dialogen, keuzelijsten en menu's zijn wit (de `--mat-sys-surface*`-tokens wijzen naar wit, `--ui-canvas` en `--ui-line`); het prebuilt thema gaf ze een lavendeltint.
- **Knoppen:** de hoofdactie (`mat-raised-button`: *Opslaan*, *Nieuwe …*) is gevuld in `--theme-primary` met witte tekst en zonder schaduw; `color="warn"` op zo'n knop is rood (`--act-delete`). *Annuleren* en *Sluiten* zijn rustige tekstknoppen **zonder** icoon. Een icoon in een knop is altijd 18px, ook als het binnen `@if` staat (dan komt het in het label terecht; `styles.scss` vangt dat op).
- **Grote dialogen met een editor** (templates, e-mailtemplates) open je met `width: '1100px', maxWidth: '92vw', panelClass: 'editor-dialog'`; de inhoud mag dan tot `92vh` hoog worden (Material begrenst anders op 65vh) en de editor groeit mee.
- **Bedragen** altijd met de `money`-pipe (`shared/pipes/money.pipe.ts`): `€ 8.790,75`, met een vaste spatie. De app draait met `LOCALE_ID` `nl-NL` (ook in de tests, via `translate-test.setup.spec.ts`), dus ook `number`/`date` volgen de Nederlandse notatie. Gebruik geen `currency`-pipe of `&euro; {{ x | number }}` meer.
- **Paginator:** teksten komen uit `translatePaginator` (`shared/paginator-intl.ts`, sleutels `paginator.*`), die app.config bij het opstarten met een dynamische import laadt en op de root-`MatPaginatorIntl` zet. Geen `{ provide: MatPaginatorIntl, … }` in app.config: dat trekt paginator, select en overlay (~125 kB) de startbundel in. Het paginaformaat-veld is 32px. Zet onder een paginator geen losse "x gevonden"-regel.
- De uitklappijl van `mat-select` is 24px en wordt in `styles.scss` op 20px gezet, anders is een select 4px hoger dan een tekstveld.
- **Zoek- en filtervelden** (`.filter-field`, `.search-field`, binnen `.filter-bar`/`.filter-row`) reserveren geen lege hint-ruimte onder het veld; zet zoeken en filters waar het past op één regel (zie de boekingenlijst). Het zoekicoon staat links (`matPrefix`). Keuzefilters (zoals rol en organisatie bij Accounts) zijn een `mat-button-toggle-group`, geen losse pilknoppen.
- **Formulieren:** `.row` lijnt velden en knoppen bovenaan uit (een knop naast een veld rekt niet mee). Zet velden die bij elkaar horen op één regel (voornaam/tussenvoegsel/achternaam, telefoon/e-mail; zie het boekerdialoog).

**Gedeelde pagina-opbouw (medewerkersportaal).** Elk scherm gebruikt dezelfde klassen uit `styles.scss`; definieer ze **niet** opnieuw in een component (dan wint de lokale variant en lopen schermen weer uiteen):

| Klasse | Gebruik |
|---|---|
| `h1` / `.page-title` | paginatitel (20px/600) |
| `.page-header` | kopregel: optionele terugknop + `h1` + knoppen rechts |
| `.back-link` | link "terug naar …" boven de titel |
| `.detail-card` | kaart met formulier of gegevens (max. 760px); in het boekingdetail zonder maximum (twee kolommen 3fr/2fr: tabellen links; onder 1100px één kolom) |
| `.section-card` | tweede en volgende kaart onder elkaar (12px ertussen) |
| `.card-grid` | kaarten naast elkaar op brede schermen |
| `.row` + `.flex-1/2/3` | velden naast elkaar in een formulier |
| `.actions` | knoppenbalk onder een formulier, rechts uitgelijnd |
| `.filter-bar`, `.filter-field`, `.search-field`, `.table-container`, `.no-data`, `.count-text`, `.actions-header`, `.actions-cell` | lijstschermen |
| `.loading`, `.empty-text`, `.muted`, `.error-text` | status- en hulpteksten |
| `.page-subtitle` | grijze regel onder de paginatitel (bv. organisatie en rol op het dashboard, via `app-welcome-header`) |
| `.cell-num`, `.cell-nowrap` | tabelcellen: bedragen rechts zonder afbreken / datums, periodes en codes zonder afbreken (zet `cell-num` op `th` én `td`) |
| `.badge` + `.badge-info/-success/-update/-warning/-danger/-neutral` | statuslabel in de kleur van de betekenis (uit het `act-*`-palet); `.badge-cap` voor een ruwe waarde met hoofdletter. Boekings- en betalingsstatus hebben een eigen component: `app-booking-status-badge`, `app-payment-status-badge` |
| `.kv-list` (`<dl>` met `dt`/`dd`) | gegevens als label + waarde in kaarten en alleen-lezen dialogen (geen dubbele punt, geen hoofdletterlabels) |
| `.kpi-cards` + `.kpi-card` (`.kpi-neutral/-success/-warning`) | KPI-tegels: wit, rand links en bedrag in de kleur van de betekenis (`.kpi-icon`, `.kpi-label`, `.kpi-value`) |
| `.tone-card` (`.tone-deep`) | gekleurde kaart in een donkere tint van de organisatiekleur met witte titel en tekst (bv. top-5 op het dashboard); zet zelf `--card-title-color` |
| `app-empty-state` (`.empty-state`) | lege toestand: icoon + zin + aanmaakknop (ng-content) bij een lege lijst; met `[filtered]="bron.length > 0"` "Niets gevonden" bij zoeken. In een tabel binnen `td.no-data` van `*matNoDataRow` |

**Controle op afgekapte tekst.** Na een wijziging aan maten of opbouw: loop alle schermen en dialogen langs (bv. 1280×800 en 1440×900, zijbalk in- en uitgeklapt) en controleer dat geen label, invoerveld, knop of tabelcel tekst afkapt (boven, onder of opzij), dat hints niet over knoppen vallen en dat de regelhoogte nergens kleiner is dan ±1,15 × de lettergrootte. Meet in dialogen pas na de openingsanimatie (die schaalt het venster).

### Betalingen in een boeking

De kaart *Betalingen* in het boekingsdetail toont per betaling alleen een oog-icoon (`PAYMENT_READ`, alleen lezen) dat `MolliePaymentViewDialogComponent` opent: de gegevens en de volledige statushistorie, zonder knoppen om iets te wijzigen. Statussen komen van Mollie en worden nooit gewijzigd of verwijderd (alleen-toevoegen). Een medewerker met `PAYMENT_RELINK` ziet daarnaast de knop *Naar andere boeking koppelen* (`MolliePaymentRelinkDialogComponent`: andere boeking + verplichte reden); de herkoppelgeschiedenis (van, naar, datum, door, reden) staat als tabel in hetzelfde dialoog en na een herkoppeling sluit het dialoog en herlaadt de lijst. Een medewerker met `PAYMENT_CORRECT` kan in dat dialoog een **correctie** registreren (`MolliePaymentCorrectionDialogComponent`: nieuwe status uit `open/paid/failed/canceled` en een verplichte reden); die verschijnt als nieuwe regel met de markering *Correctie*, naam en reden. Bij "Door" staat de leesbare naam van wie een regel aanmaakte (`createdByName` uit de backend; medewerker of boeker), "Systeem" voor Mollie en "Onbekend" als het id niet (meer) bij een naam past; nooit het ruwe id. De statusbadge (vertaald en gekleurd) komt uit `shared/components/payment-status-badge.component.ts` en wordt in het uitklapscherm en het dialoog gebruikt.

### Berichten en documenten (tijdlijn in de boeking)

`BookingMessagesCardComponent` (`features/bookings`) vervangt de losse documentenkaart: één lijst met e-mails aan de hoofdboeker, documenten en betalingen, nieuwste bovenaan (`buildTimeline` in `booking-timeline.ts`), met een filter (Alles, E-mail, Documenten, Betalingen). Het pictogram links toont de soort (`mail`, `description`, `credit_card`); de gekleurde vlakjes rechts de eigenschappen (e-mail: verstuurd/opnieuw verstuurd; document: portaal en formaat; betaling: de bestaande statusbadge en methode). De knop *Toevoegen* biedt *E-mail aan hoofdboeker* (`EMAIL_SEND`, bestaand dialoog) en *Document* (`DOCUMENT_CREATE`, bestaand uploaddialoog); de losse e-mailknop op de hoofdboeker-kaart is vervallen. Een document toont *portaal* (groen) of *alleen intern*; het potloodicoon (`DOCUMENT_UPDATE`) opent `DocumentPortalDialogComponent`, waarmee alleen die zichtbaarheid te wijzigen is (naam, inhoud en boeking staan vast). Het aanmaakdialoog (genereren én uploaden) heeft een vinkje *Zichtbaar in het boekerportaal*, standaard uit. Inzien opent per soort het bestaande dialoog; een e-mail opent `SentEmailViewDialogComponent` (inhoud in een sandbox-iframe, *Opnieuw versturen* met `EMAIL_SEND`). Betalingen blijven daarnaast hun eigen kaart houden voor beheer (statushistorie, correctie, herkoppelen).

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
- **"Nieuw" vanuit een keuzelijst:** `BookerSelectDialogComponent` kiest alleen uit bestaande boekers (een boeking ontstaat alleen vanuit een bestaande boeker; nieuwe klanten registreer je in *Prospects*); `BookingLineDialogComponent` kan een accommodatie en een leverancier aanmaken via `shared/components/quick-create-dialog.component.ts` (alleen code + naam; de rest vul je later op de detailpagina in). Heeft de gekozen accommodatie nog geen leverancier, dan kies of maak je er een en wordt de koppeling bij opslaan vastgelegd. Op de accommodatie-/leveranciersdetail maakt "Nieuwe leverancier"/"Nieuwe accommodatie" het record aan en koppelt het meteen.
- **Rollen en authorities:** rollen horen bij één organisatie. `RoleListComponent` toont het aantal accounts per rol, een slotje bij systeemrollen (alleen inzien) en de melding nieuwe rechten met *Gezien*. `RoleDetailComponent` toont de rechten als matrix (`RoleAuthorityMatrixComponent`): alleen wat de gebruiker zelf mag uitdelen is aan te vinken, vereisten zet de server mee aan, een weigering (403/409) toont de uitleg van de server. Een nieuwe rol kan starten als kopie. Onderaan de geschiedenis uit het rechtenlogboek. Authorities zelf zijn alleen te lezen (`AuthorityListComponent`, voor het platform).
- **Documenten, betalingen en verstuurde e-mails zijn de waarheid-geschiedenis** en krijgen bewust geen verwijderknop (ook niet in de tijdlijn *Berichten en documenten*); ook `DocumentService` heeft geen `delete`.
- **Bijwerken = de hele resource meesturen.** `PUT` vervangt alles; stuur dus `{ ...huidig, ...wijziging }` (bv. de boeking met `bookerId` én `bookingStatus`). Een gedeeltelijke body koppelde eerder ongemerkt de hoofdboeker los bij een statuswijziging.
- Een nieuwe lijst: kolom `actions`, `<app-row-actions [canView] [canEdit] [canDelete]>`, geen regelklik, specs voor icoon-zichtbaarheid per authority en voor elke actie.
- **Kleur per risico:** elk actie-icoon krijgt de kleur van zijn risico (zie hieronder). Gebruik daarvoor altijd een `act-*`-klasse, nooit `color="primary"` of `color="warn"` op een `mat-icon-button`.

#### Actie-iconen en hun risicokleur

Een icoon-knop of een tekstknop met rand (`mat-stroked-button`, zoals *Bewerken*, *Toevoegen* en *Verwijderen* in de kaartkoppen) met een actie krijgt een eigen kleur, afhankelijk van wat er gebeurt als je erop klikt. Hoe groter het risico (en hoe moeilijker terug te draaien), hoe warmer de kleur. De kleuren staan als CSS-variabelen (`--act-*`) in `styles.scss` van **beide** apps (`frontend-employee` en `frontend-booker`; houd ze gelijk) met een klasse per soort. Die klasse zet de Material-tokens van een icoon-knop (`--mat-icon-button-*`) of van een tekstknop met rand (`--mat-button-outlined-*`: tekst, zachtere rand, hover- en ripple-kleur).

**Waas:** over de volle kleuren ligt een grijze waas (`$act-haze: 35%` met `$act-haze-grey: #6b7280` bovenaan het `act-*`-blok in `styles.scss`), zodat de kleuren niet knallen maar goed uit elkaar te houden blijven (blauw, groen, violet, oranje-rood, rood). Wil je het rustiger of juist krachtiger, pas dan alleen `$act-haze` aan (0% = volle kleur) in beide bestanden; de specs bewaken dat het contrast en de volgorde blijven kloppen. De rand van een tekstknop is nog eens doorzichtiger dan de tekst.

| Klasse | Soort actie | Risico | Kleur (vol → met waas) | Voorbeelden |
|---|---|---|---|---|
| `act-info` | lezen, openen, downloaden | geen | blauw `#1565c0` → `#336aaa` | oog-icoon, template downloaden, e-mail of document in het boekerportaal bekijken |
| `act-create` | toevoegen | laag | groen `#2e7d32` → `#43794d` | *Toevoegen* in kaartkoppen, *nieuwe boeking* op een boekerregel |
| `act-update` | wijzigen | middel | violet `#7b4fb5` → `#755ba2` | potlood-icoon, *Bewerken*, adres bewerken, *Naar andere boeking koppelen*, *Correctie registreren* |
| `act-send` | versturen naar buiten | hoog, niet terug te halen | oranje-rood `#c2410c` → `#a45235` | mail-icoon in *Prospects*, *Opnieuw versturen* |
| `act-delete` | verwijderen of ontkoppelen | hoog | rood `#c62828` → `#a64247` | prullenbak, *Verwijderen*, adres of koppeling verwijderen |

Regels:
- **Welke knoppen:** alleen knoppen met een duidelijke actie uit de tabel. Neutrale knoppen (*Opslaan*, *Annuleren*, *Sluiten*, een voorbeeld genereren, een bestand kiezen) blijven in de huisstijlkleur. `color="warn"` geeft in dit thema geen rood: gebruik voor verwijderen altijd `act-delete`.
- Alle kleuren houden **minimaal 4,5:1 contrast** op een wit vlak (WCAG AA), ook met waas. Controleer dat opnieuw als je een kleur of `$act-haze` aanpast; `action-colors.spec.ts` bewaakt dit.
- De betekenis zit nooit alleen in de kleur: elk icoon houdt zijn eigen symbool, en een nieuwe icoon-knop krijgt een `aria-label` (en bij voorkeur een tooltip), zoals `<app-row-actions>` en de berichtenkaart van het boekerportaal al doen.
- `<app-row-actions>` zet de klassen zelf (oog `act-info`, potlood `act-update`, prullenbak `act-delete`). Losse icoon-knoppen (bijvoorbeeld in een kaart of tabel op een detailscherm) krijgen de klasse zelf.
- Een nieuwe soort actie? Voeg dan een variabele en een klasse toe in beide `styles.scss`-bestanden, plus een regel in de tabel hierboven en in de handleiding (§4.1).
- Tests: `shared/components/action-colors.spec.ts` (vijf verschillende kleuren, tinten blauw, groen, violet, oranje-rood, rood, wijzigen en verwijderen ver genoeg uit elkaar, contrast, en dat een echte Material-icoonknop én tekstknop met rand de kleur overneemt); `row-actions.component.spec.ts` controleert de kleur van oog, potlood en prullenbak; `booking-detail.component.spec.ts` dat *Bewerken*, *Toevoegen* en *Verwijderen* in de kaarten violet, groen en rood zijn; kleine controles op de klasse in de specs van het adresbeheer, de boekerkeuze, het betalingsdialoog, het e-maildialoog, het templatedialoog en de berichtenkaart; in `frontend-booker`: `shared/components/action-colors.spec.ts` en `row-stripes.spec.ts` (hetzelfde palet en dezelfde zachte tint als in de medewerkers-app) en `messages-card.component.spec.ts` (bekijken en downloaden dragen `act-info`, de regels hebben de om-en-om tint en de pictogrammen geen achtergrond).

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
- **Berichten en documenten:** één lijst met de verzonden e-mails (`/messages`) en de vrijgegeven documenten, nieuwste bovenaan, met filter *Alles / E-mail / Documenten* (alleen als beide soorten bestaan) en maximaal zes regels tot *Toon nog n*. De lijst haalt alleen onderwerp en datum op; de inhoud van een mail komt pas bij het openen. Die staat in `MessageDialogComponent` in een `iframe` met `sandbox=""` (geen scripts, geen eigen herkomst) en `referrerpolicy="no-referrer"`. Mislukt één van de twee bronnen, dan toont de kaart wat er is met een melding en *Opnieuw proberen*; pas als beide mislukken is het een fout. De regels hebben dezelfde zachte om-en-om tint en hover als de lijsten in `frontend-employee` (klasse `zebra-rows`); de pictogrammen links (mail, pdf, document) hebben geen eigen achtergrond, en *bekijken* en *downloaden* zijn blauw (`act-info`).
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
4. Een `ACCESS`-regel in `core/auth/access.ts`, een menu-item in `layout.component.ts` met `access: ACCESS.…` en de route met `canActivate: [authorityGuard], data: { access: ACCESS.… }`.
5. Opbouw met de gedeelde klassen (`page-header`, `detail-card`, `row`, `actions`, …; zie *Design*), geen eigen kopieën ervan in het component.
6. Vertalingen in `nl.json` en `en.json`.
7. Spec-bestand naast het component; draai `ng test` en `ng build`.
