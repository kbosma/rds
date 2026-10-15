# Architectuur (backend)

De frontends staan in [frontend.md](frontend.md); het geheel in [overview.md](overview.md).

## Techniek

| Onderdeel | Keuze |
|---|---|
| Taal / framework | Java 21, Spring Boot **4.0.3** (webmvc, data-jpa, security, validation, actuator, mail) |
| Webserver | **Jetty** (Tomcat uitgesloten), poort 8666, `server.servlet.context-path: /rds`, access-log naar `/opt/rds/log` |
| Database | PostgreSQL 17; **Flyway** (`db/migration`, V1–V8); Hibernate `ddl-auto: validate` — een entity moet exact bij het schema passen |
| Mapping | **MapStruct** 1.6.3 (`componentModel=spring`, compiler-arg `-parameters`) |
| Beveiliging | Spring Security, stateless JWT (jjwt 0.12.6), TOTP (`dev.samstevens.totp`, QR via zxing), BCrypt |
| Documenten | **xdocreport** 2.1.0 (docx-merge via FreeMarker, pdf via XWPF-converter), Apache POI (komt mee), **jsoup** 1.18.3 (HTML → docx, herhaalde tabellen) |
| Monitoring | JavaMelody (`/monitoring`), Actuator |
| Tests | JUnit 5, Mockito, Spring MockMvc (`@SpringBootTest`) — zie [build-test-deploy.md](build-test-deploy.md) |

## Pakketten

Eén pakket per domein onder `nl.puurkroatie.rds`, elk met dezelfde subpakketten waar van toepassing: `controller`, `service` (+ `service/impl`), `repository`, `entity`, `dto`, `mapper`, `config`.

| Pakket | Inhoud |
|---|---|
| `auth` | organisatie, persoon, account, rol, authority (+koppeltabellen), organisatiethema; JWT (`JwtTokenProvider`, `JwtAuthenticationFilter`), `TenantContext`, TOTP, `SecurityConfig`, `GlobalExceptionHandler` |
| `booking` | boeking, booker (incl. prospect), reiziger, accommodatie, leverancier, activiteit, adres (+koppeltabellen), boekingsregel/-activiteit, document, document-template, boeking↔betaling-koppeling |
| `mollie` | `MolliePayment`, status-entries, Mollie-REST-client, webhook |
| `bookerportal` | OTP-login (`Otp`), `BookerContext`, alleen-lezen portal-controllers voor de klant |
| `email` | e-mailtemplate, afbeeldingenbibliotheek, render + versturen, `EmailSender`-abstractie |
| `docgen` | gedeeld template-model (`BookingContextService`), `DocumentGenerationService`, `HtmlToDocxConverter`, `RepeatTables`, `TemplateModels`, `FreemarkerHardening` |
| `common` | `EnumValues`/`InvalidEnumValueException` (enum-parsing), `@Default` (MapStruct-constructorkeuze) |

De modules zijn los gehouden: `mollie` kent geen `Booking`; de koppeltabel `BookingMolliePayment` hoort bij `booking`.

## Lagen en verantwoordelijkheden

```
Controller  →  Service (interface + impl)  →  Repository (Spring Data JPA)
   dun            business-logica, tenant-       alleen data-toegang
 (mapping+HTTP)   controle, @Transactional
```

- **Controller:** dun. Mapt HTTP naar service-aanroepen, `@PreAuthorize("hasAuthority('…')")` per methode, `@Valid` op de request-DTO. Geen business-logica.
- **Service:** alle logica en **tenant-controle** (`verifyOrganization`). Interface + `impl`. `@Transactional` (leesmethoden `readOnly = true`).
- **Repository:** `JpaRepository`; tenant-queries als `findByTenantOrganization(UUID)`.
- **DTO's:** entities worden **nooit** blootgesteld. Booker-portal en andere externe endpoints krijgen eigen, minimale DTO's.

## Patronen in de code (houd je hieraan)

- **Entities zijn onveranderlijk:** geen setters; `protected` no-arg constructor voor JPA, constructors voor aanmaak en een **update-constructor** die `createdAt`, `createdBy` en `tenantOrganization` van de bestaande entity overneemt (die kolommen zijn `updatable = false`; anders worden ze `null`). Een update bouwt dus een nieuwe instantie op basis van de bestaande.
- **Audit en tenant:** `@PrePersist` zet `createdAt`, `createdBy`, `tenantOrganization` (uit `TenantContext`); `@PreUpdate` zet `modifiedAt/By`.
- **DTO's** zijn gewone klassen met getters; één constructor met `@Default` (voor MapStruct) en één met `@JsonCreator` (voor Jackson). Validatie met Jakarta-annotaties op de DTO.
- **Enums** worden als **naam** opgeslagen (`@Enumerated(STRING)`) en gaan als **lowercase** tekst over de API (`@JsonValue toValue()`, `@JsonCreator fromValue()` via `EnumValues.parse`, hoofdletterongevoelig). Een onbekende waarde geeft een `400` met de toegestane waarden. In het **template-model** (documenten/e-mail) is een enum juist de **hoofdletter-naam** (`MAN`).
- **Koppeltabellen** met samengestelde sleutel gebruiken een `@IdClass` (`BookerAddress`, `AccommodationAddress`, `AccommodationSupplier`, `SupplierAddress`, `BookingMolliePayment`, `AccountRole`, `RoleAuthority`). `BookingLine` en `BookingActivity` hebben een eigen UUID.
- **Relaties** zijn altijd `FetchType.LAZY`. Waar een scherm of document meer nodig heeft, zijn er gerichte **fetch-join-queries** (bv. `findByIdWithBookerAndTravelers` in `BookingRepository`).
- **Transacties:** services zijn `@Transactional`; lees-only waar mogelijk. Een `LazyInitializationException` los je op met een fetch-join of door het werk in de service-methode te doen (binnen de transactie), niet door lazy te laden in de controller.
- **Verwijderen met geschiedenis:** services die iets verwijderen waar boekingen aan hangen roepen eerst `DeletionGuard` aan (409 als er documenten of betalingen aan hangen); zie [security.md](security.md).
- **Fail fast:** ongeldige invoer wordt aan de controller-grens (Bean Validation) of in de service geweigerd met een duidelijke melding.

## Foutafhandeling (`GlobalExceptionHandler`)

Antwoorden hebben vorm `{ message, status, timestamp }` (`ErrorResponse`).

| Exception | HTTP |
|---|---|
| `AuthenticationException` | 401 |
| `AccessDeniedException` | 403 |
| `EntityNotFoundException`, `NoHandlerFoundException` | 404 |
| `MethodArgumentNotValidException`, `ConstraintViolationException`, ontbrekende request-parameter of -part | 400 |
| `EmailImageInUseException`, `DeletionBlockedException` | 409 |
| `MaxUploadSizeExceededException` | 413 |
| elke andere `RuntimeException` (o.a. `InvalidEnumValueException`, `TemplateRenderException`, `EmailNotConfiguredException`, `InvalidImageException`, `InvalidImageReferenceException`, `DocxConversionException`, `RepeatTables.InvalidRepeatException`, `IllegalArgumentException`) | **400** met `message` |
| `Exception` | 500 |

Praktisch gevolg: een nieuwe, bedoelde fout voor de gebruiker is een `RuntimeException` met een duidelijke Engelse of Nederlandse melding; de frontend toont `error.message` waar dat zinvol is.

## Tenant-isolatie in de code

`JwtAuthenticationFilter` zet `TenantContext` (organisatie, account, rollen; ThreadLocal) en ruimt op in een `finally`. Services lezen daaruit:
- **ADMIN:** geen filtering (maar ook geen business-authorities).
- **MANAGER/EMPLOYEE:** alleen eigen organisatie (`findByTenantOrganization`, `verifyOrganization`).
Details en de rest van de beveiliging: [security.md](security.md).

## Documentgeneratie en templates (`docgen`)

`BookingContextService.forBooking(id)` bouwt het model (`BookingContext` met booker, reizigers, boekingsregels, activiteiten); het wordt door `TemplateModels` omgezet naar **platte** maps/lijsten. `DocumentGenerationServiceImpl` voegt dat samen met het .docx van een `DocumentTemplate` (xdocreport, afgeschermd via `FreemarkerHardening`) en bewaart het resultaat als `Document` bij de boeking. E-mail gebruikt hetzelfde model. Alles over de editor, de converter en herhaalde tabellen: [templates.md](templates.md).

## E-mail (`email`)

Templates in de database, FreeMarker-merge, versturen via de abstractie `EmailSender` (`SmtpEmailSender` zodra `spring.mail.host` gezet is, anders `LoggingEmailSender`: log-only). Zie [email.md](email.md).

## Configuratie

`application.yaml` bevat o.a. JWT-secret en -verlooptijd, OTP-instellingen, `app.email.*` (publiek API-adres, maximale afbeeldingsgrootte), `app.mollie.*` (URL's, sleutel) en multipart-limieten (2 MB per bestand). SMTP staat bewust uitgecommentarieerd (log-only lokaal). Profiel **`rds-local`** (`application-rds-local.yaml`, niet committen) overschrijft de Mollie-webhook- en redirect-URL voor lokaal testen via een tunnel. Let op de geheimen in de configuratie: zie [open-items.md](open-items.md).

## Frontend (samenvatting)

Twee losse Angular 22-apps (standalone componenten, signals, Angular Material, ngx-translate) die dezelfde API aanroepen: `frontend-employee` met JWT `type=EMPLOYEE`, `frontend-booker` met JWT `type=BOOKER`. Een dev-proxy stuurt `/api` naar `localhost:8666/rds/api`; in productie doet NGINX dat (zie [build-test-deploy.md](build-test-deploy.md)). Alles over structuur en conventies: [frontend.md](frontend.md).
