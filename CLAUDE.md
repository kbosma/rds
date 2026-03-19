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
  - DateTime - createdAt
  - UUID - createdBy (points to accountId)
  - DateTime - modifiedAt
  - UUID - modifiedBy (points to accountId)

- ACCOUNT
  - UUID - accountId
  - String - userName
  - String - passwordHash
  - UUID - organization
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

## Architecture

- **Entry point**: `src/main/java/nl/puurkroatie/rds/Application.java`
- **Config**: `src/main/resources/application.yaml`
- **Servlet container**: Jetty (Tomcat is excluded)
- **Dependencies**: Spring Data JPA, Spring Security + OAuth2 Client, Spring MVC, Jetty, PostgreSQL driver

## Package Structure

- `nl.puurkroatie.rds.entity` — JPA entity classes met Jakarta Persistence annotations
- `nl.puurkroatie.rds.dto` — DTO records (Java records, immutable)
- `nl.puurkroatie.rds.repository` — Spring Data JPA repositories
- `nl.puurkroatie.rds.service` — Service classes met CRUD-operaties
- `nl.puurkroatie.rds.controller` — REST controllers (`/api/...`)

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

  | Username | Rol | Authorities |
  |---|---|---|
  | `jan.vanbergen` | ADMIN | READ, WRITE, DELETE, MANAGE_USERS |
  | `maria.jansen` | USER | READ |
  | `pieter.degroot` | MANAGER | READ, WRITE, MANAGE_USERS |
- **Init**: `spring.jpa.defer-datasource-initialization: true`, `spring.sql.init.mode: always`, `platform: postgres`
- **psql pad**: `/Applications/Postgres.app/Contents/Versions/latest/bin/psql`