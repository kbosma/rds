# Ontwerpkeuzes en voortschrijdend inzicht

Waarom iets zo is gebouwd, wat de gebruiker heeft gekozen en wat we onderweg hebben geleerd. Nieuwe sessies: lees dit voordat je een keuze "verbetert". Voeg nieuwe beslissingen onderaan de juiste sectie toe.

## Domein en datamodel

| Keuze | Reden / alternatief |
|---|---|
| **Prospect = `Booker` met `status`** (V4) | geen aparte tabel; een prospect wordt zonder verhuizing een gewone boeker. Alternatief (eigen entity) is verworpen: dubbele velden en kopiëren bij omzetten. |
| **Booking: periode en totaal zijn afgeleid** (uit boekingsregels en activiteiten) | geen dubbele waarheid; geen synchronisatieproblemen. |
| **`booking_line` en `booking_activity` met eigen UUID** (geen samengestelde sleutel; de koppeltabellen voor adressen e.d. wél) | een regel is eenvoudig te adresseren in de API (`/api/booking-lines/{bookingLineId}`). |
| **Mollie-pakket kent geen Booking**; koppeltabel in `booking` + UNIQUE op `mollie_payment_id` (V3) | modules los houden; toch de 1:M-regel op database-niveau afdwingen. |
| **Concept-boeking**: voorgevuld scherm, pas opslaan bij het eerste onderdeel | de gebruiker wil niet voor elke "even kijken" een lege boeking; zie `ensureBookingPersisted`. Bij een boeker met een lopende boeking eerst een waarschuwing. |
| **Boekingsnummer** `BK-<jaar>-<5 cijfers>`, willekeurig en uniek | simpel en leesbaar voor klanten (ook de inlog van de portal). Uniek over alle organisaties heen. |
| **Document-/e-mailnaam bevat datum en tijd** | hetzelfde sjabloon kan meerdere keren bij één boeking worden ingezet zonder naamconflict. |

## Lijsten en acties (15-10-2026)

| Keuze | Reden |
|---|---|
| **Eén actie-grid voor alle menu-lijsten**; klikken op de regel is uit | de gebruiker wil expliciete, uniforme iconen (inzien/bewerken/verwijderen) die per authority verschijnen |
| **Actie-iconen en -knoppen krijgen een kleur naar risico** (blauw lezen, groen toevoegen, violet wijzigen, oranje-rood versturen, rood verwijderen) | keuze van de gebruiker: de kleur volgt de risico's van de actie, ook voor de knoppen met een rand in de kaarten (*Bewerken*, *Toevoegen*, *Verwijderen*). Vastgelegd als CSS-variabelen `--act-*` plus klassen `act-*` in beide apps, in plaats van Material's `color="primary"/"warn"`, dat maar twee betekenissen kent (en in dit thema voor `warn` niet eens rood geeft). De volle kleuren knalden te veel, dus er ligt een grijze waas overheen (`$act-haze: 35%`, in één plek aan te passen); alle kleuren houden 4,5:1 contrast op wit. Zie [frontend.md](frontend.md#actie-iconen-en-hun-risicokleur). |
| **Om-en-om rijtint is zacht (5%) en geldt ook voor de tijdlijn *Berichten en documenten*** | keuze van de gebruiker: de tint (eerst 8%) was te sterk. `--ui-primary-faint` is nu 5% van de organisatiekleur, lichter dan de tabelkop (12%) en de hover (18%). Lijsten die geen tabel zijn krijgen dezelfde tint met de klasse `zebra-rows`. Zie [frontend.md](frontend.md#design-compact-en-kleurrijk). |
| **Inzien in een eigen dialoog** (documenten, betalingen, e-mailtemplates, bookers, leveranciers, templates) of een detailpagina met `?readonly=true` | geen opengeklapt grid; één bestaand scherm hergebruiken i.p.v. aparte read-only schermen |
| **Geen verwijderen voor documenten en betalingen** (een betaling en haar statushistorie worden zelfs in de database nooit verwijderd, ook niet zonder Mollie-id: triggers, V11) (en bewerken van een betaling alleen zolang ze niet bij Mollie bestaat). Voor documenten is dit op 20-10-2026 consequent doorgevoerd: de prullenbak in de tijdlijn, `DELETE /api/documents/{id}`, `DocumentService.delete` en de authority `DOCUMENT_DELETE` (V16) zijn weggehaald; de tijdlijn (commit `f07b747`) had de knop er per ongeluk in laten komen | ze zijn de geschiedenis ("de waarheid"); de gebruiker zei: "doe daar eerst maar geen DELETE" en koos op 20-10-2026 voor het volledig verwijderen van de documentfunctie |
| **Leveranciers: volledige detailpagina** (`SupplierDetailComponent`: gegevens, adressen, gekoppelde accommodaties) | de oude links naar `/suppliers/:id` en `/suppliers/new` bestonden niet als route; de vertalingen voor adressen en accommodaties lagen al klaar. Een tijdelijk dialoog is daarna vervangen |
| **Een koppeling tussen betaling en boeking wordt nooit losgemaakt; herkoppelen kan alleen met reden en wordt geregistreerd** (V12, `PAYMENT_RELINK` voor ADMIN en MANAGER) | keuze van de gebruiker (optie 3): niet loskoppelen, wel een geregistreerde herkoppeling (wie, wanneer, van→naar, waarom); betaling en statushistorie blijven onaangeroerd |
| **Eén tijdlijn Berichten en documenten in de boeking, betalingen blijven ook een eigen beheerkaart** (variant B) | keuze van de gebruiker; pictogram = soort, gekleurde vlakjes = eigenschappen. Verzonden e-mails worden nu bewaard (alleen-toevoegen, V14); opnieuw versturen met dezelfde inhoud; een verzonden mail is alleen intern (niet in het portaal). Nog niet gebouwd: portaalvlag per document en "mail ook als document" |
| **Documenten zijn standaard niet zichtbaar in het boekerportaal; na het aanmaken wijzigt alleen die vlag nog** (V15) | keuze van de gebruiker: een keuzevakje bij aanmaken (default uit) en daarna alleen die eigenschap wijzigen. Bestaande documenten bleven zichtbaar (V15 zet ze op aan) |
| **De server blokkeert verwijderen als er documenten of betalingen aan hangen** (`DeletionGuard`, 409) | keuze van de gebruiker ("niet verwijderen als ze gekoppeld zijn aan documenten, e-mails of betalingen"); de database zou ze anders meeverwijderen. Verzonden e-mails aan de hoofdboeker worden sinds V14 wel bewaard en tellen mee |
| **Boekerportaal: één dashboard in plaats van zes tabbladen** (21-10-2026) | keuze van de gebruiker: veel informatie tegelijk, zonder te klikken, ook op telefoon en tablet. Responsive met container queries op de pagina; de tijdlijn heeft één model en twee weergaven (balken, agenda). Ontwerp: [voorstel-booker-dashboard.md](voorstel-booker-dashboard.md) |
| **De fase van de reis (voor, tijdens, na) volgt uit de datums, niet uit de status** | de status zet een medewerker handmatig en kan achterlopen; de datums zijn afgeleid uit de boekingsregels |
| **Eén `overview`-endpoint voor de kop en de huisstijl; de overige gegevens blijven aparte endpoints** | de kop is in één antwoord klaar, de kaarten laden los en elk met eigen fout- en laadtoestand, zodat één mislukte aanroep de pagina niet breekt |
| **Portal-DTO's voor documenten en betalingen zijn slank; het bestand gaat via `…/documents/{id}/content`** | de lijst stuurde per document de volledige bytes mee en liet auditvelden (`createdBy`, `tenantOrganization`) zien aan een externe gebruiker; de huidige betaalstatus rekent nu de server uit |
| **Het portaal toont reizigers met alleen de voornaam, heeft geen boekingstitel en geen adressen of foto's bij verblijven** | open keuzes uit het voorstel; later uit te breiden met een titelveld of adressen in de DTO |
| **Het portaal toont alle e-mails die via RDS aan de hoofdboeker zijn verstuurd, in één lijst met de documenten; betalingen staan daar niet in** (21-10-2026) | keuze van de gebruiker: de boeker heeft ze immers ontvangen, dus geen vrijgavevlag zoals bij documenten. De lijst bevat alleen onderwerp en datum; de inhoud komt pas bij het openen en staat in een sandbox-iframe. Ontvangersadres en medewerker blijven buiten de DTO |
| **De dashboardstore hoort bij de pagina (`providers` op het component), niet bij de app** | een volgende klant op hetzelfde apparaat begint zonder gegevens van de vorige |
| **De oude portal-paden verwijzen naar `/`** | Mollie stuurt de klant na het betalen naar `/payments`; bladwijzers blijven werken |
| **Organisatie verwijderen alleen zonder data** (`OrganizationDeletionGuard`, 409) | audit-bevinding: `tenant_organization` heeft geen FK, dus verwijderen liet verweesde data achter. Gekozen voor blokkeren (niet voor een zware bevestiging + cascade): de beheerder ruimt eerst op |
| **Adressen opruimen met hun eigenaar** (`AddressCleanup`) | verwijderen van een booker/accommodatie/leverancier liet adresrijen verweesd achter (link-tabellen cascaden, het adres niet). Alleen adressen die in geen enkele link-tabel meer voorkomen worden verwijderd, dus een gedeeld adres blijft |
| **"Nieuw" vanuit keuzelijsten met alleen code + naam** | je hoeft een boeking niet te verlaten om een accommodatie/leverancier/booker aan te maken; het compacte dialoog vraagt het minimum, de rest volgt op de detailpagina |
| **Dashboard en organisatie-kolommen op authorities** (`ORGANIZATION_READ`, `ACCOUNT_CREATE`) | de UI-regel is "nooit rollen"; geen nieuwe authority nodig (dat zou een migratie vragen). `ACCOUNT_CREATE` = beheert de gebruikers van de organisatie = manager-overzicht |

## Backend-patronen

| Keuze | Reden |
|---|---|
| **Onveranderlijke entities** met update-constructor | audit/tenant mogen nooit per ongeluk overschreven worden; geen setters. Consequentie: elke update bouwt een nieuwe instantie op basis van de bestaande. |
| **Enums: lowercase in JSON, naam in DB, hoofdletterongevoelig parsen** (`EnumValues`) | de frontend gebruikt lowercase; een onbekende waarde geeft een nette `400` met de toegestane waarden (voorheen een lelijke "No enum constant"-fout). |
| **Een `RuntimeException` ⇒ `400` met `message`** | eenvoudig, en de UI kan de melding tonen. Voor andere codes een aparte handler (409, 413, …). |
| **Alle tenant-controle in de services** | één plek; controllers blijven dun. |
| **Fetch-joins per use-case** (bv. de drie queries van `BookingContextService`) | voorkomt lazy-fouten en N+1 zonder `open-in-view`. |

## Templates en e-mail

| Keuze | Reden / geleerde les |
|---|---|
| **FreeMarker voor e-mail én Word** | één syntax voor gebruikers; xdocreport gebruikt FreeMarker. |
| **Afgeschermde FreeMarker + plat model** | een `/security-review` toonde dat `${"freemarker.template.utility.Execute"?new()("…")}` een commando op de server uitvoert, ook in geüploade .docx. Opgelost met `ALLOWS_NOTHING_RESOLVER`, `?api` uit, geen loader en een **plat model** (maps/lijsten/tekst/getallen) omdat `${prospect.class}` anders via de bean-wrapper nog bij reflectie kwam. Een Word-template uit de editor krijgt exact dezelfde afscherming. |
| **Eén model voor documenten en e-mail** (`BookingContextService`) | geen dubbele code; e-mail werkt nu ook voor een boeking (`${booking.*}`, `${prospect.*}` = hoofdboeker). Bijwerking: `gender` in e-mail is nu de enum-naam (`MAN`). |
| **TipTap (WYSIWYG)** met variabelen die je sleept | de eerste versie had een keuzelijst; de gebruiker wilde slepen en een echte editor. Tabellen hebben **inline** stijlen zodat ze ook in preview en verstuurde mail kloppen. |
| **Afbeeldingen in de database** (`email_image`) | expliciete keuze van de gebruiker ("Database houden"): geen aparte bestandsopslag beheren. Onveranderlijk; nieuwe versie = nieuwe rij. |
| **Relatief pad in de opgeslagen HTML, absoluut bij versturen** | de editor laadt het via de eigen origin; verandert het publieke adres (IP → domein), dan blijven templates geldig. |
| **Afbeelding publiek uitleveren op onraadbare UUID** | een mailclient heeft geen JWT. Alleen `GET`, type uit bytes, geen SVG, CSP-header, rate-limit in NGINX. |
| **Afbeeldingen per organisatie, nooit gedeeld** | gebruikerscorrectie: een eerste ontwerp zocht over organisaties heen. Nu: lijst/verwijderen/in-gebruik per organisatie en controle bij het opslaan van een template (`TemplateImages`). |
| **Verwijderen alleen als ongebruikt** (e-mailtemplates én Word-templates uit de editor) | keuze "Echt verwijderen als ongebruikt"; al verstuurde mails verliezen hun plaatje (de dialoog waarschuwt). |
| **Bibliotheek als tab in het editorpaneel** | keuze van de gebruiker; slepen of aanklikken. |
| **Menu "E-mailtemplates" op `TEMPLATE_READ`** | EMPLOYEE mag de templates bekijken (alleen-lezen), alleen MANAGER beheert. Versturen gebeurt niet in dit scherm (zie de beslissing hieronder). |
| **E-mail versturen alleen vanuit een boeking of een prospect; documenten maken alleen vanuit een boeking** (20-10-2026) | keuze van de gebruiker: in *E-mailtemplates* en *Templates* maak je alleen templates. De verstuur-dialoog heeft daarom altijd een vast doel (boeking of prospect) en kiest alleen de template; het mail-icoon in *Prospects* is erbij gekomen zodat een prospect nog steeds te mailen is. De API-endpoints blijven ongewijzigd. |
| **`EMAIL_SEND` als eigen authority** | een template beheren is iets anders dan er mail mee versturen. |
| **`LoggingEmailSender` zolang SMTP niet is geconfigureerd** | veilig lokaal; niets verlaat de machine. |

## Word-templates uit de editor (keuzes van de gebruiker)

| Vraag | Gekozen |
|---|---|
| Hoe ontstaat het .docx? | **Echt .docx bij het opslaan** (HTML → `HtmlToDocxConverter`), HTML bewaard in `source_html` zodat het opnieuw te bewerken is. Een geüploade .docx blijft bestaan en is niet te bewerken. |
| Herhaalde rijen (reizigers, accommodaties, activiteiten)? | **Ja**, via `data-repeat`/`data-item` op een tabel; in Word als echte samenvoegvelden. |
| Afbeeldingen? | Ja, uit **dezelfde bibliotheek**. |
| Hergebruik? | Zoveel mogelijk: dezelfde editor, hetzelfde model, dezelfde afbeeldingen, dezelfde herhaalde-tabellenlogica; e-mailtemplates ook voor boekingen. |

## Geleerde lessen (vallen waar je niet in hoeft te trappen)

**Word/xdocreport**
- Een lus over **tabelrijen** werkt in xdocreport alleen met echte Word-**samenvoegvelden** (`@before-row[#list …]` en `@after-row[/#list]`). Platte tekst `[#list]` werkt alleen voor alinea's. Bewezen met een probe.
- Een `.docx` zonder **stijlen-onderdeel** laat de PDF-conversie falen ("Expecting one Styles document part"); zonder **`tblGrid`** geeft de converter een NullPointerException (en Word verwacht het ook). De converter schrijft beide.
- Een **enkele aanhalingsteken** in een expressie geeft een syntaxfout (xdocreport herschrijft hem naar `&apos;`); gebruik overal `"…"`.
- FreeMarker toont `1250.00` als `1.250`; gebruik `?string("#,##0.00")` voor bedragen.
- POI maakt een nieuwe tabel al met randen; pas die aan i.p.v. er een tweede set bij te zetten (anders blijft de kleur op "auto").
- Opsommingen en genummerde lijsten vragen om een eigen `numbering`-onderdeel; elke genummerde lijst heeft een eigen `num` met `startOverride`, anders gaat de nummering van de vorige lijst door.

**FreeMarker/e-mail**
- Alleen de afscherming op één configuratie zetten is niet genoeg; zowel de e-mail- als de xdocreport-configuratie moeten worden afgeschermd, en de xdocreport-configuratie is **gedeeld** (dus testen kunnen niet "onbeveiligd" vergelijken).
- jsoup laat aanhalingstekens in tekst ongemoeid; herhaalde e-mailtabellen worden daarom via markers omgezet (de HTML-serializer zou `<#list>` anders escapen).

**Angular**
- Een `computed()` reageert niet op velden die via `ngModel` veranderen; gebruik een methode of signals (zo'n bug zat in de preview-dialoog).
- `--include` bij `ng test` slaat de globale vertaal-setup over; neem `translate-test.setup.spec.ts` altijd mee.
- Firefox' synthetische `ClipboardEvent` heeft geen bestanden; test plakken via de ProseMirror-handler zelf.
- De TipTap-tabel kreeg `repeat`/`item` als extra attributen via `Table.extend`; zonder deze attributen verdwijnen `data-repeat`/`data-item` uit `getHTML()`.

**Werkwijze**
- Een MockMvc-IT draait in één transactie: een delete + GET lijkt dan nog te slagen door de persistence-context. Gebruik `flush()` + `clear()` voordat je controleert (zie `DeleteVerificationControllerTest`).
- `MatDialogModule` in de `imports` van een standalone component levert een eigen `MatDialog`; in een spec werkt alleen `TestBed.overrideProvider(MatDialog, …)`, niet een gewone provider.
- Een Java-editor die tussendoor `.class`-stubs in `target/` zet veroorzaakt schijnfouten; zie [build-test-deploy.md](build-test-deploy.md).
- Tests draaien op een eigen, tijdelijke embedded PostgreSQL (Zonky), niet op de lokale `rdsdb`: zo hangen ze niet af van lokale data en lost dat ook de Postgres.app-toestemming (trust-authenticatie vanuit de Claude-app) op. Gekozen boven Testcontainers omdat daar Docker voor nodig is.
- Een geforceerde "controle op bestaan over organisaties heen" lekt informatie; foutmeldingen mogen niet verraden of iets elders bestaat.

## Nog niet besloten
Zie [open-items.md](open-items.md).
