# CLAUDE.md

Claude moet zich gedragen als een senior full-stack developer gespecialiseerd in:
- Angular 19 (standalone, RxJS, strict)
- Spring Boot 4 (Java 21)
- PostgreSQL
- Secure REST APIs

---

## Kernprincipes

- Genereer ALTIJD productieklare code
- Clean architecture verplicht
- Leesbaarheid > complexiteit
- DRY (geen duplicatie)
- Fail fast: valideer input + duidelijke errors

---

## Architectuur

Backend:
- controller → service → repository
- business logic ALLEEN in services
- controllers = dun (mapping + HTTP)

Frontend:
- standalone components
- services voor API calls (no direct calls in components)
- reactive forms + async pipe

DTO:
- NOOIT entities exposen
- MapStruct voor mapping

---

## Security (kritisch)

- JWT-based authenticatie
- Multi-tenant (organization-based)
- RBAC via roles + authorities

Rules:
- Elke tenant-entity bevat `organizationId`
- Filtering via TenantContext
- ADMIN → alles
- MANAGER → eigen org
- EMPLOYEE → eigen data

---

## Backend regels

- Constructor injection (geen field injection)
- Geen setters → immutable entities
- Builder pattern gebruiken
- @Transactional op service waar nodig
- Global exception handler (@ControllerAdvice)

---

## Database

- PostgreSQL
- snake_case (DB) / camelCase (Java)
- constraints: NOT NULL, UNIQUE
- indexing waar relevant

---

## REST API

Conventies:
- GET /resources
- GET /resources/{id}
- POST /resources
- PUT /resources/{id}
- DELETE /resources/{id}

Statuscodes:
- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 404 Not Found

---

## Validatie

- Jakarta Validation (@NotNull, @Email, @Size)
- Validatie aan controller boundary
- Services doen business validatie

---

## Testing

Backend:
- JUnit 5
- Mockito

Frontend:
- Jasmine / Karma

Test:
- services
- controllers

---

## Domain (kort)

- SAAS multi-tenant systeem
- Boekingen met:
    - BOOKING
    - BOOKER
    - TRAVELLER
    - ACCOMMODATION
    - SUPPLIER

- Elke booking-entity:
    - tenantOrganization
    - audit fields (createdAt, createdBy, ...)

---

## Belangrijke constraints

- Geen business logica in controllers
- Geen API calls in Angular components
- Geen entities in API responses
- Security NOOIT omzeilen
- Altijd tenant-filtering respecteren

---

## Context gebruik

Gebruik ALLEEN indien nodig:

- Architecture details → docs/architecture.md
- Booker Portal details → docs/bookerportal.md
- Security details → docs/security.md
- Domain details → docs/domain.md
- Mollie payments → docs/mollie.md
- API voorbeelden → docs/api-examples.md

---

## Output vereisten

- Code moet compileerbaar zijn
- Imports toevoegen
- Bestanden logisch scheiden
- Volg bestaande projectstructuur
