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
- EMPLOYEE - dit is de medewerker van een organisatie en mag enkel zijn gegevens (ACCOUNT-UUID in JWT) inzien en wijzigen met betrekking tot
  - PERSON
  - ACCOUNT

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

- `nl.puurkroatie.rds.entity` — JPA entity classes met Jakarta Persistence annotations
- `nl.puurkroatie.rds.dto` — DTO records (DTO classes)
- `nl.puurkroatie.rds.repository` — Spring Data JPA repositories
- `nl.puurkroatie.rds.service` — Service classes met CRUD-operaties
- `nl.puurkroatie.rds.controller` — REST controllers (`/api/...`)
- `nl.puurkroatie.rds.security` — JWT-authenticatie, TenantContext en UserDetailsService
- `nl.puurkroatie.rds.config` — Spring configuratie (SecurityConfig)

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
6. Client ontvangt `LoginResponse` met `token`, `accountId` en `organizationId`

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
| EMPLOYEE | PERSON_READ/WRITE, ACCOUNT_READ/WRITE |

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
- **Niet-ADMIN** (MANAGER, EMPLOYEE): ziet alleen records binnen eigen ORGANIZATION (`TenantContext.getOrganizationId()`). Schrijfacties op records van andere organisaties resulteren in `AccessDeniedException`.

> **Nog niet geimplementeerd**: EMPLOYEE-filtering op service-niveau (EMPLOYEE ziet alleen eigen PERSON/ACCOUNT op basis van `TenantContext.getAccountId()`).

### Security-gerelateerde bestanden

| Bestand | Beschrijving |
|---|---|
| `security/JwtTokenProvider.java` | JWT generatie en validatie (JJWT 0.12.6) |
| `security/JwtAuthenticationFilter.java` | Filter die Bearer tokens valideert en SecurityContext/TenantContext vult |
| `security/CustomUserDetailsService.java` | Laadt Account + rollen + authorities uit DB voor authenticatie |
| `security/TenantContext.java` | ThreadLocal holder voor organizationId, accountId en roles |
| `config/SecurityConfig.java` | Filter chain, PasswordEncoder, AuthenticationManager, `@EnableMethodSecurity` |
| `controller/AuthController.java` | POST `/api/auth/login` — retourneert JWT |
| `dto/LoginRequest.java` | Input: userName, password |
| `dto/LoginResponse.java` | Output: token, accountId, organizationId |

### API testen met curl

```bash
# Login (verkrijg JWT)
curl -k -X POST https://localhost:8666/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"jan.vanbergen","password":"password123"}'

# Gebruik JWT voor beveiligde endpoints
curl -k https://localhost:8666/api/organizations \
  -H "Authorization: Bearer <token>"
```

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
  | `maria.jansen` | EMPLOYEE | Puurkroatie | PERSON_READ/WRITE, ACCOUNT_READ/WRITE |
  | `pieter.degroot` | MANAGER | TechPartner BV | PERSON_READ/WRITE/DELETE, ACCOUNT_READ/WRITE/DELETE, ROLE_READ, AUTHORITY_READ, ACCOUNTROLE_READ/WRITE/DELETE, ROLEAUTHORITY_READ |
- **Init**: `spring.jpa.defer-datasource-initialization: true`, `spring.sql.init.mode: always`, `platform: postgres`
- **psql pad**: `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`