# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Spring Boot 4.0.3 web application using Java 21, PostgreSQL, and Spring Security with OAuth2 client support. Package: `nl.puurkroatie.rds`.

## Authenticatie en Autorisatie

Het organigram waarop authenticatie en autorisatie gebaseerd zijn, is als volgt:

ORGANIZATION 0-< PERSON 0-< ACCOUNT 1-< ACCOUNTROLE >-1 ROLE 1-< ROLEAUTHORITY >-1 AUTHORITY, waarbij:
- '0-<' : zero to many
- '1-<' : one to many
- '>-1' : many to one

De applicatie is een SAAS-construct, waarbij de scheiding van data op ORGANIZATION-niveau ligt. 
De entiteiten, die enkel door medewerkers (ACCOUNT) van een ORGANIZATION ingezien, bewerkt of verwijderd mogen worden, moeten dan ook een property 'UUID - organizationTenant' bevatten. 
Dit UUID van de organization, van het ingelogde ACCOUNT, moet dan ook bekend zijn in de security-context van de applicatie.
In de door de applicatie uitgegeven JWT, na inloggen, moet dan ook, naast het ingelogde ACCOUNT-UUID, deze ORGANIZATION-UUID aanwezig zijn

De ROLEs, die aanwezig zijn:
- ADMIN - dit is de administrator van de gehele applicatie, beheert alle records (aanmaken, muteren en verwijderen) met betrekking tot
  - ORGANIZATION
  - PERSON
  - ACCOUNT
  - ROLE
  - AUTHORITY
  - ACCOUNTROLE
  - ROLEAUTHORITY
- MANAGER - dit is de administrator van een ORGANIZATION, beheert enkel records die direct of indirect onder zijn ORGANIZATION (ORGANIZATION-UUID in JWT)  vallen (aanmaken, muteren en verwijderen) met betrekking tot
  - PERSON
  - ACCOUNT
  - ACCOUNTROLE
- EMPLOYEE - dit is de medewerker van een organisatie en mag enkel zijn eigen gegevens (ACCOUNT-UUID in JWT) inzien (read-only) met betrekking tot
  - PERSON (alleen eigen person)
  - ACCOUNT (alleen eigen account)
  - EMPLOYEE mag eigen wachtwoord wijzigen via `PUT /api/auth/change-password`

## Datamodel

- ORGANIZATION
  - UUID - organizationId
  - String - name
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)

- PERSON
  - UUID - persoonId
  - String - firstname
  - String - prefix
  - String - lastname
  - UUID - organization
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)

- ACCOUNT
  - UUID - accountId
  - String - userName
  - String - passwordHash
  - UUID - person
  - Boolean - locked
  - Boolean - mustChangePassword
  - DateTime - expiresAt
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)

- ROLE
  - UUID - roleId
  - String - description

- AUTHORITY
  - UUID - authorityId
  - String - description

- ACCOUNTROLE (n..m)
  - UUID - account
  - UUID - role
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)

- ROLEAUTHORITY (n..m)
  - UUID - role
  - UUID - authority

## Build & Development Commands

```bash
./mvnw clean install          # Build the project
./mvnw spring-boot:run        # Run the application
./mvnw test                   # Run all tests
./mvnw test -Dtest=ClassName  # Run a single test class
./mvnw test -Dtest=ClassName#methodName  # Run a single test method
```

> **Let op**: Java 21 is vereist. Als de default Java-versie anders is, gebruik:
> `JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home ./mvnw clean install`

## Architecture

- **Entry point**: `src/main/java/nl/puurkroatie/rds/Application.java`
- **Config**: `src/main/resources/application.yaml`
- **Servlet container**: Jetty (Tomcat is excluded)
- **Dependencies**: Spring Data JPA, Spring Security + OAuth2 Client, Spring MVC, Jetty, PostgreSQL driver, JJWT 0.12.6

## Package Structure

- `nl.puurkroatie.rds` — Application entry point (`Application.java`)
- `nl.puurkroatie.rds.auth.entity` — JPA entity classes met Jakarta Persistence annotations
- `nl.puurkroatie.rds.auth.dto` — DTO classes
- `nl.puurkroatie.rds.auth.repository` — Spring Data JPA repositories
- `nl.puurkroatie.rds.auth.service` — Service interfaces en `impl/` met CRUD-operaties
- `nl.puurkroatie.rds.auth.controller` — REST controllers (`/api/...`)
- `nl.puurkroatie.rds.auth.security` — JWT-authenticatie, TenantContext en UserDetailsService
- `nl.puurkroatie.rds.auth.config` — Spring configuratie (SecurityConfig)

## Authenticatie- en Autorisatie-implementatie

### Login-flow

1. Client stuurt `POST /api/auth/login` met `{"userName":"...","password":"..."}` naar `AuthController`
2. `AuthController` roept `AuthenticationManager.authenticate()` aan
3. Spring Security delegeert naar `CustomUserDetailsService.loadUserByUsername()`:
   - Haalt `Account` op via `AccountRepository.findByUserName()`
   - Haalt rollen op via `AccountRoleRepository.findByAccount()`
   - Haalt per rol de authorities op via `RoleAuthorityRepository.findByRole()`
   - Retourneert `UserDetails` met bcrypt-hash en granted authorities
4. Spring Security verifieert het wachtwoord via `BCryptPasswordEncoder`
5. Na succesvolle authenticatie genereert `AuthController` een JWT via `JwtTokenProvider.generateToken()` met claims: `sub=accountId`, `org=organizationId`, `authorities=[...]`, `roles=[...]`
6. Client ontvangt `LoginResponse` met `token`, `accountId`, `organizationId` en `mustChangePassword`

### Vervolgrequests (JWT-validatie)

1. `JwtAuthenticationFilter` (OncePerRequestFilter) leest de `Authorization: Bearer <token>` header
2. Valideert het token via `JwtTokenProvider.validateToken()`
3. Extraheert `accountId`, `organizationId`, `authorities` en `roles` uit de JWT claims
4. Zet een `UsernamePasswordAuthenticationToken` in de Spring `SecurityContext`
5. Vult `TenantContext` (ThreadLocal) met `organizationId`, `accountId` en `roles`
6. Na het request wordt `TenantContext.clear()` aangeroepen in een `finally`-blok

### Security-configuratie (`SecurityConfig.java`)

- CSRF uitgeschakeld (stateless REST API)
- Sessies: `SessionCreationPolicy.STATELESS`
- `JwtAuthenticationFilter` wordt toegevoegd vóór `UsernamePasswordAuthenticationFilter`
- `/api/auth/login` is `permitAll`
- Alle overige `/api/**` endpoints vereisen authenticatie
- `@EnableMethodSecurity` activeert `@PreAuthorize` op controller-methoden

### JWT-configuratie (`application.yaml`)

```yaml
app:
  jwt:
    secret: <base64-encoded 256-bit key>
    expiration-ms: 86400000  # 24 uur
```

### Granulaire Authorities

Pattern: `{ENTITEIT}_{OPERATIE}` — 21 authorities totaal:

`ORGANIZATION_READ`, `ORGANIZATION_WRITE`, `ORGANIZATION_DELETE`,
`PERSON_READ`, `PERSON_WRITE`, `PERSON_DELETE`,
`ACCOUNT_READ`, `ACCOUNT_WRITE`, `ACCOUNT_DELETE`,
`ROLE_READ`, `ROLE_WRITE`, `ROLE_DELETE`,
`AUTHORITY_READ`, `AUTHORITY_WRITE`, `AUTHORITY_DELETE`,
`ACCOUNTROLE_READ`, `ACCOUNTROLE_WRITE`, `ACCOUNTROLE_DELETE`,
`ROLEAUTHORITY_READ`, `ROLEAUTHORITY_WRITE`, `ROLEAUTHORITY_DELETE`

### Role-Authority mappings

| Rol | Authorities |
|---|---|
| ADMIN | Alle 21 authorities |
| MANAGER | PERSON_READ/WRITE/DELETE, ACCOUNT_READ/WRITE/DELETE, ROLE_READ, AUTHORITY_READ, ACCOUNTROLE_READ/WRITE/DELETE, ROLEAUTHORITY_READ |
| EMPLOYEE | PERSON_READ, ACCOUNT_READ |

### `@PreAuthorize` op controllers

Elke controller-methode is beveiligd met `@PreAuthorize("hasAuthority('...')")`:

| Controller | GET | POST | PUT | DELETE |
|---|---|---|---|---|
| OrganizationController | ORGANIZATION_READ | ORGANIZATION_WRITE | ORGANIZATION_WRITE | ORGANIZATION_DELETE |
| PersonController | PERSON_READ | PERSON_WRITE | PERSON_WRITE | PERSON_DELETE |
| AccountController | ACCOUNT_READ | ACCOUNT_WRITE | ACCOUNT_WRITE | ACCOUNT_DELETE |
| RoleController | ROLE_READ | ROLE_WRITE | ROLE_WRITE | ROLE_DELETE |
| AuthorityController | AUTHORITY_READ | AUTHORITY_WRITE | AUTHORITY_WRITE | AUTHORITY_DELETE |
| AccountRoleController | ACCOUNTROLE_READ | ACCOUNTROLE_WRITE | — | ACCOUNTROLE_DELETE |
| RoleAuthorityController | ROLEAUTHORITY_READ | ROLEAUTHORITY_WRITE | — | ROLEAUTHORITY_DELETE |

### TenantContext

`TenantContext` is een ThreadLocal holder die per request gevuld wordt vanuit het JWT:
- `TenantContext.getOrganizationId()` — UUID van de organisatie van de ingelogde gebruiker
- `TenantContext.getAccountId()` — UUID van het ingelogde account
- `TenantContext.getRoles()` — Set van rolnamen (bijv. `"ADMIN"`, `"MANAGER"`) van de ingelogde gebruiker
- `TenantContext.hasRole(String)` — controleert of de ingelogde gebruiker een bepaalde rol heeft
- Wordt automatisch opgeruimd na elk request door `JwtAuthenticationFilter`

### Service-level organization-filtering

Services voor PERSON, ACCOUNT en ACCOUNTROLE filteren data op basis van `TenantContext`:
- **ADMIN** (`TenantContext.hasRole("ADMIN")`): ziet en beheert alle records zonder filtering
- **MANAGER**: ziet alleen records binnen eigen ORGANIZATION (`TenantContext.getOrganizationId()`). Schrijfacties op records van andere organisaties resulteren in `AccessDeniedException`.
- **EMPLOYEE**: ziet alleen eigen PERSON/ACCOUNT (op basis van `TenantContext.getAccountId()`). Create/update/delete-acties resulteren in `AccessDeniedException`.

### Wachtwoord wijzigen

- **Endpoint**: `PUT /api/auth/change-password` (alleen EMPLOYEE, niet ADMIN/MANAGER)
- **Input**: `ChangePasswordDto` met `currentPassword` en `newPassword`
- Verifieert huidig wachtwoord, zet nieuw wachtwoord en zet `mustChangePassword` op `false`
- ADMIN/MANAGER kan `mustChangePassword` op `true` zetten via `PUT /api/accounts/{id}`
- Bij login wordt `mustChangePassword` meegestuurd in de `LoginResponseDto`

### Security-gerelateerde bestanden

| Bestand | Beschrijving |
|---|---|
| `security/JwtTokenProvider.java` | JWT generatie en validatie (JJWT 0.12.6) |
| `security/JwtAuthenticationFilter.java` | Filter die Bearer tokens valideert en SecurityContext/TenantContext vult |
| `security/CustomUserDetailsService.java` | Laadt Account + rollen + authorities uit DB voor authenticatie |
| `security/TenantContext.java` | ThreadLocal holder voor organizationId, accountId en roles |
| `config/SecurityConfig.java` | Filter chain, PasswordEncoder, AuthenticationManager, `@EnableMethodSecurity` |
| `controller/AuthController.java` | POST `/api/auth/login` — retourneert JWT; PUT `/api/auth/change-password` — wachtwoord wijzigen |
| `dto/LoginRequestDto.java` | Input: userName, password |
| `dto/LoginResponseDto.java` | Output: token, accountId, organizationId, mustChangePassword |
| `dto/ChangePasswordDto.java` | Input: currentPassword, newPassword |

### API testen met curl

```bash
# Login (verkrijg JWT)
curl -k -X POST https://localhost:8666/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"jan.vanbergen","password":"password123"}'

# Gebruik JWT voor beveiligde endpoints
curl -k https://localhost:8666/api/organizations \
  -H "Authorization: Bearer <token>"

# Wachtwoord wijzigen (authenticated)
curl -k -X PUT https://localhost:8666/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"currentPassword":"password123","newPassword":"newpassword456"}'
```

## Domein: Reisburo Boekingssysteem

### Functionele beschrijving

RDS is een boekingssysteem voor reisbureaus. Elke ORGANIZATION is een onafhankelijk reisburo met eigen medewerkers (PERSON/ACCOUNT). Het systeem registreert boekingen waarbij meerdere accommodaties in de tijd worden vastgelegd.

### Kernconcepten

- **BOOKING (Boeking)**: Een reis-boeking aangemaakt door een medewerker van het reisburo. Een boeking doorloopt meerdere stadia (bijv. concept, bevestigd, geaccordeerd, betaald, afgerond, geannuleerd).
- **BOOKER (Hoofdboeker)**: De verantwoordelijke persoon die de reis boekt. Er is altijd precies 1 hoofdboeker per boeking. De boeker krijgt uiteindelijk toegang tot een portaal om:
  - Eigen boekingen in te zien
  - Te communiceren met het reisburo
  - Boekingen te accorderen
  - Te betalen
- **TRAVELLER (Reismetgezel)**: Overige geregistreerde personen op een boeking. Van reismetgezellen worden gegevens vastgelegd om:
  - Een juiste accommodatie te vinden (aantal bedden, rolstoeltoegankelijkheid)
  - De prijs te bepalen (kinderen zijn goedkoper)
- **ACCOMMODATION (Accommodatie)**: Een verblijfslocatie binnen een boeking, met begin- en einddatum. Een boeking kan meerdere accommodaties bevatten (meerdere verblijven in de tijd).
- **SUPPLIER (Leverancier)**: De eigenaar/aanbieder van een accommodatie. Accommodaties zijn in bezit van verschillende suppliers.

### Tenant-isolatie voor boekingsdata

Alle entiteiten met betrekking tot een boeking vallen onder de tenant-isolatie van het reisburo:
- Elke booking-entity bevat een property `tenantOrganization` (UUID, verwijst naar ORGANIZATION)
- Boekingsdata kan enkel door medewerkers van het betreffende reisburo worden ingezien, gemuteerd of verwijderd
- De property `tenantOrganization` is redundant (afleidbaar via het ACCOUNT van de medewerker), maar wordt expliciet opgeslagen voor directe filtering

### Audit-velden voor booking-entities

Elke booking-entity bevat de standaard audit-velden:
- `createdAt` (DateTime) — tijdstip van aanmaken
- `createdBy` (UUID) — verwijst naar het ACCOUNT (accountId) van de ingelogde medewerker
- `modifiedAt` (DateTime) — tijdstip van laatste wijziging
- `modifiedBy` (UUID) — verwijst naar het ACCOUNT (accountId) van de ingelogde medewerker

### Boekingsstadia

Een boeking doorloopt meerdere stadia in zijn levenscyclus (exact datamodel volgt).

### Autorisatie voor boekingsdata

- **ADMIN**: volledige toegang tot alle boekingsdata over alle organisaties heen
- **MANAGER**: toegang tot boekingsdata binnen eigen ORGANIZATION
- **EMPLOYEE**: toegang tot boekingsdata binnen eigen ORGANIZATION (read/write afhankelijk van authorities)
- **BOOKER** (toekomstig): beperkte toegang via portaal tot eigen boekingen

### Datamodel voor boekingen

- BOOKING
  - UUID : bookingId
  - String : bookingNumber
  - UUID : bookingStatus
  - Date : fromDate
  - Date : untilDate
  - Money : totalSum
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization
- BOOKER (main bookers)
  - UUID : bookerId
  - UUID : booking
  - String : firstname
  - String : prefix
  - String : lastname
  - String : callsign
  - String : telephone
  - String : emailaddress
  - UUID : gender
  - Date : birthdate
  - String : initials
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization
- TRAVELER
  - UUID : travelerId
  - UUID : booking
  - String : firstname
  - String : prefix
  - String : lastname
  - UUID : gender
  - Date : birthdate
  - String : initials
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization
- BOOKINGSTATUS (categorie, vastgelegd door ADMIN)
  - UUID : bookingstatusId
  - String : displayname
- GENDER (categorie, vastgelegd door ADMIN)
  - UUID : genderId
  - String : displayname
ADDRESS (several purposes)
  - UUID : addressId
  - String : street
  - Number : housenumber
  - String : housenumberAddition
  - String : postalcode
  - String : city
  - String : country
  - UUID : addressrole
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization
- ADDRESSROLE
  - UUID : addressroleId
  - String : displayname
- BOOKERADDRESS (n..m koppeltabel)
  - UUID : booker
  - UUID : address
- ACCOMMODATION
  - UUID : accommodationId
  - String : key
  - String : name
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization
- SUPPLIER
  - UUID : supplierId
  - String : key
  - String : name
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization
ACCOMMODATIONSUPPLIER (n..m koppeltabel)
  - UUID : accommodation
  - UUID : supplier
ACCOMMODATIONADDRESS
  - UUID : accommodation
  - UUID : address
- SUPPLIERADDRESS
  - UUID : supplier
  - UUID : address
- DOCUMENT
  - UUID : documentId
  - UUID : booking
  - String : displayname
  - ByteArray : document
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)
  - UUID : tenantOrganization

## Entity Classes

- Alle entities gebruiken `@GeneratedValue(strategy = GenerationType.UUID)` voor primary keys
- Koppeltabellen (`AccountRole`, `RoleAuthority`) gebruiken composite keys via `@Id` op `@ManyToOne` velden (JPA 2.0 derived identities, zonder `@IdClass`)
- Relaties in `Account` zijn `FetchType.LAZY`
- Entities met audit-velden (`createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`): `Organization`, `Person`, `Account`, `AccountRole` (createdBy/modifiedBy verwijzen naar accountId als UUID)
- Entities zonder audit-velden: `Role`, `Authority`, `RoleAuthority` (beheerd door systeem-administrators)
- Geen setters — entities zijn immutable na constructie
- Elke entity heeft een `protected` no-arg constructor (vereist door JPA), een all-args constructor (met PK) en een constructor zonder PK (voor nieuwe objecten)
- `@PrePersist onCreate()`: zet `createdAt` op `LocalDateTime.now()` als deze `null` is
- `@PreUpdate onUpdate()`: zet `modifiedAt` altijd op `LocalDateTime.now()`

## DTO Classes

- Gewone Java classes (geen records), zonder setters — immutable na constructie
- Elke DTO heeft een all-args constructor (met PK) en een constructor zonder PK (voor nieuwe objecten)
- Koppeltabel-DTOs (`AccountRoleDto`, `RoleAuthorityDto`) hebben alleen een all-args constructor (geen gegenereerde PK)
- `AccountDto` bevat geen `passwordHash` om te voorkomen dat wachtwoordhashes naar de client lekken

## SSL

- **Keystore**: `rds-platform.p12` (PKCS12, self-signed, alias `rds-platform`, wachtwoord `rdsrds`)
- **Certificaat**: CN=localhost, OU=RDS, O=Puurkroatie, L=Groningen, ST=GR, C=NL
- **Poort**: 8666 (HTTPS)
- Keytool vereist minimaal 6 tekens voor keystore-wachtwoord

## Database

- **URL**: `jdbc:postgresql://localhost:5432/rdsdb`
- **User/Password**: `rds` / `rds`
- **DDL**: `hibernate.ddl-auto: create-drop` (schema wordt bij elke start aangemaakt en bij afsluiten verwijderd)
- **Testdata**: `src/main/resources/data.sql` — vult de database bij het opstarten met voorbeelddata (moet bijgewerkt worden als datamodel wijzigt)
- **Testaccounts** (wachtwoord voor alle accounts: `password123`, bcrypt-hash):

  | Username | Rol | Organisatie | Authorities |
  |---|---|---|---|
  | `jan.vanbergen` | ADMIN | Puurkroatie | Alle 21 authorities |
  | `maria.jansen` | EMPLOYEE | Puurkroatie | PERSON_READ, ACCOUNT_READ |
  | `pieter.degroot` | MANAGER | TechPartner BV | PERSON_READ/WRITE/DELETE, ACCOUNT_READ/WRITE/DELETE, ROLE_READ, AUTHORITY_READ, ACCOUNTROLE_READ/WRITE/DELETE, ROLEAUTHORITY_READ |
- **Init**: `spring.jpa.defer-datasource-initialization: true`, `spring.sql.init.mode: always`, `platform: postgres`
- **psql pad**: `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`

## Booker Portal (OTP-authenticatie)

### Overzicht

Bookers (externe klanten) authenticeren via OTP (One-Time Password) per e-mail, niet via wachtwoord. Na verificatie krijgen ze een beperkt JWT token dat alleen toegang geeft tot hun eigen boekingsdata via `/api/booker-portal/` endpoints.

### Authenticatie-flow

1. Booker stuurt `POST /api/booker-auth/request-otp` met `{ "emailaddress": "...", "bookingNumber": "..." }`
2. Systeem zoekt booker op combinatie e-mailadres + bookingNumber. Retourneert altijd 200 (voorkomt enumeration)
3. Als combinatie bestaat: genereert 6-cijferige OTP, slaat op in OTP-tabel, logt code naar console (stub)
4. Booker stuurt `POST /api/booker-auth/verify-otp` met `{ "emailaddress": "...", "bookingNumber": "...", "code": "123456" }`
5. Na succesvolle verificatie: retourneert JWT met `type=BOOKER`, `sub=bookerId`, `bookingId=...`

### JWT-structuur

| Claim | Medewerker (EMPLOYEE) | Booker (BOOKER) |
|---|---|---|
| sub | accountId | bookerId |
| type | EMPLOYEE | BOOKER |
| org | organizationId | — |
| bookingId | — | UUID van de boeking |
| authorities | [...] | — |
| roles | [...] | — |
| expiry | 5 minuten | 1 uur |

Tokens zonder `type` claim worden als EMPLOYEE behandeld (backwards compatible).

### BookerContext (ThreadLocal)

Analoog aan `TenantContext`, gevuld door `JwtAuthenticationFilter` bij `type=BOOKER`:

- `BookerContext.getBookerId()` — UUID van de ingelogde booker
- `BookerContext.getBookingId()` — UUID van de specifieke boeking
- `BookerContext.isBooker()` — `true` als de huidige sessie een booker-sessie is
- Wordt opgeruimd in hetzelfde `finally`-blok als TenantContext

### Booker Portal Endpoints

| Endpoint | Method | Authority | Beschrijving |
|---|---|---|---|
| `/api/booker-auth/request-otp` | POST | permitAll | OTP aanvragen |
| `/api/booker-auth/verify-otp` | POST | permitAll | OTP verifiëren, ontvangt JWT |
| `/api/booker-portal/documents` | GET | BOOKER_PORTAL_READ | Documenten van de boeking |
| `/api/booker-portal/documents/{id}` | GET | BOOKER_PORTAL_READ | Specifiek document |

### OTP-configuratie (`application.yaml`)

```yaml
app:
  jwt:
    booker-expiration-ms: 3600000  # 1 uur
  otp:
    expiry-minutes: 10
    max-active-per-email: 3
```

### Package-structuur

```
nl.puurkroatie.rds.bookerportal.entity          — Otp
nl.puurkroatie.rds.bookerportal.dto             — OtpRequestDto, OtpVerifyDto, BookerLoginResponseDto
nl.puurkroatie.rds.bookerportal.repository      — OtpRepository
nl.puurkroatie.rds.bookerportal.service         — BookerAuthService, OtpEmailService
nl.puurkroatie.rds.bookerportal.controller      — BookerAuthController, BookerPortalDocumentController
nl.puurkroatie.rds.bookerportal.security        — BookerContext
```

### Uitbreidbaarheid

Later kunnen vergelijkbare controllers worden toegevoegd voor bookings, accommodations, travelers via hetzelfde `BookerContext.getBookingId()` filtering-mechanisme. Bij behoefte aan meerdere boekingen kan de booker per boeking een nieuw OTP aanvragen.

### Testen via curl

```bash
# OTP aanvragen
curl -k -X POST https://localhost:8666/api/booker-auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"emailaddress":"klaas@example.com","bookingNumber":"BK-2026-001"}'

# OTP code aflezen uit console-log, dan verifiëren
curl -k -X POST https://localhost:8666/api/booker-auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"emailaddress":"klaas@example.com","bookingNumber":"BK-2026-001","code":"<code>"}'

# Booker-portal documenten opvragen
curl -k https://localhost:8666/api/booker-portal/documents \
  -H "Authorization: Bearer <booker-token>"
```