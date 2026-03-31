# Booker Portal (OTP-authenticatie)

## Overzicht

Bookers (externe klanten) authenticeren via OTP (One-Time Password) per e-mail, niet via wachtwoord. Na verificatie krijgen ze een beperkt JWT token dat alleen toegang geeft tot hun eigen boekingsdata via `/api/booker-portal/` endpoints.

## Authenticatie-flow

1. Booker stuurt `POST /api/booker-auth/request-otp` met `{ "emailaddress": "...", "bookingNumber": "..." }`
2. Systeem zoekt booker op combinatie e-mailadres + bookingNumber. Retourneert altijd 200 (voorkomt enumeration)
3. Als combinatie bestaat: genereert 6-cijferige OTP, slaat op in OTP-tabel, logt code naar console (stub)
4. Booker stuurt `POST /api/booker-auth/verify-otp` met `{ "emailaddress": "...", "bookingNumber": "...", "code": "123456" }`
5. Na succesvolle verificatie: retourneert JWT met `type=BOOKER`, `sub=bookerId`, `bookingId=...`

## JWT-structuur

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

## BookerContext (ThreadLocal)

Analoog aan `TenantContext`, gevuld door `JwtAuthenticationFilter` bij `type=BOOKER`:

- `BookerContext.getBookerId()` — UUID van de ingelogde booker
- `BookerContext.getBookingId()` — UUID van de specifieke boeking
- `BookerContext.isBooker()` — `true` als de huidige sessie een booker-sessie is
- Wordt opgeruimd in hetzelfde `finally`-blok als TenantContext

## Booker Portal Endpoints

| Endpoint | Method | Authority | Beschrijving |
|---|---|---|---|
| `/api/booker-auth/request-otp` | POST | permitAll | OTP aanvragen |
| `/api/booker-auth/verify-otp` | POST | permitAll | OTP verifiëren, ontvangt JWT |
| `/api/booker-portal/documents` | GET | BOOKER_PORTAL_READ | Documenten van de boeking |
| `/api/booker-portal/documents/{id}` | GET | BOOKER_PORTAL_READ | Specifiek document |
| `/api/booker-portal/payments` | GET | BOOKER_PORTAL_READ | Betalingen van de boeking |
| `/api/booker-portal/payments/create` | POST | BOOKER_PORTAL_WRITE | Betaling aanmaken bij Mollie, koppelen aan booking, retourneert checkout URL |

## OTP-configuratie (`application.yaml`)

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

## Testen via curl

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
