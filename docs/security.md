# Security

## Authenticatie

- JWT-based
- Token bevat:
    - accountId
    - organizationId
    - roles
    - authorities

---

## Tenant model

- Multi-tenant per ORGANIZATION
- Elke entity bevat organization UUID
- Filtering via TenantContext

---

## Rollen

- ADMIN → alles
- MANAGER → eigen organization
- EMPLOYEE → eigen data

---

## TenantContext

Beschikbaar via:
- getOrganizationId()
- getAccountId()
- getRoles()

---

## Service filtering

- ADMIN → geen filtering
- MANAGER → organization filter
- EMPLOYEE → eigen data

---

## Security regels

- Spring Security verplicht
- JWT filter
- @PreAuthorize op endpoints
- wachtwoorden met BCrypt

---

## Error handling

- @ControllerAdvice
- gestructureerde responses:
    - message
    - status
    - timestamp
