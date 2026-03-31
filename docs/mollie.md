# Mollie Integratie

## Overzicht

- Betalingen via Mollie API
- Eigen entity: MolliePayment
- Koppeling via BookingMolliePayment

---

## Flow

1. create payment (Mollie API)
2. sla op in DB
3. webhook update status

---

## Statussen

- OPEN
- PAID
- FAILED
- CANCELED
- EXPIRED

---

## Security

- webhook = permitAll
- overige endpoints beveiligd

---

## Belangrijk

- MolliePayment is los van Booking
- koppeling via aparte tabel

## Mollie Betalingen

### Overzicht

Geïsoleerde `nl.puurkroatie.rds.mollie` package die de Mollie payment flow implementeert. MolliePayment is een onafhankelijke entiteit zonder directe relatie naar Booking. De koppeling tussen Booking en MolliePayment verloopt via een koppeltabel `BookingMolliePayment` in de `booking` package.

Twee lagen:

1. **MolliePayment entity/DTO** — eigen CRUD, persistentie van betalingen in onze database
2. **Mollie API DTOs** (PaymentRequest/Response/StatusRequest/StatusResponse) — communicatie met Mollie's externe API


### Enums

**MolliePaymentStatus**: `OPEN`, `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELED`, `EXPIRED`
— Correspondeert met Mollie API statussen. Serialisatie via `@JsonValue` (lowercase) en `@JsonCreator` (case-insensitive).

**MolliePaymentMethod**: `IDEAL`, `CREDITCARD`, `BANCONTACT`, `SOFORT`, `BANKTRANSFER`, `PAYPAL`, `BELFIUS`, `KBC`, `EPS`, `GIROPAY`, `PRZELEWY24`, `APPLEPAY`, `GOOGLEPAY`, `IN3`, `KLARNA`, `RIVERTY`
— Zelfde serialisatie-strategie als MolliePaymentStatus.

### Package-structuur

```
nl.puurkroatie.rds.mollie.entity          — MolliePayment, MolliePaymentStatus, MolliePaymentMethod
nl.puurkroatie.rds.mollie.dto             — MolliePaymentDto, PaymentRequestDto, PaymentResponseDto, PaymentStatusRequestDto, PaymentStatusResponseDto
nl.puurkroatie.rds.mollie.repository      — MolliePaymentRepository
nl.puurkroatie.rds.mollie.service         — MollieService (interface)
nl.puurkroatie.rds.mollie.service.impl    — MollieServiceImpl
nl.puurkroatie.rds.mollie.controller      — MolliePaymentController
nl.puurkroatie.rds.mollie.config          — MollieConfig
```

### Configuratie (`application.yaml`)

```yaml
app:
  mollie:
    api:
      payments:
        base: https://api.mollie.com/v2/payments
    key: Bearer test_GpPHhs7SHk73fAyMyaJUFUKJQdxDD5
    urls:
      webhook: http://94.212.62.67:8082/payment/mollie/
      redirect: http://94.212.62.67:5003/payment
```

`MollieConfig` (`@ConfigurationProperties(prefix = "app.mollie")`) levert een `RestClient` bean (`mollieRestClient`) geconfigureerd met de Mollie base URL en `Authorization` header.

### Mollie API DTOs

| DTO | Richting | Beschrijving |
|---|---|---|
| `PaymentRequestDto` | → Mollie (`POST /v2/payments`) | Bevat nested `Amount` (currency + value als String), description, redirectUrl, webhookUrl, metadata (incl. bookingId) |
| `PaymentResponseDto` | ← Mollie | Bevat id (`tr_xxx`), status, amount, description, `_links.checkout.href` (checkout URL) |
| `PaymentStatusRequestDto` | ← Mollie webhook | Bevat alleen `id` (form-urlencoded `@RequestParam`) |
| `PaymentStatusResponseDto` | ← Mollie (`GET /v2/payments/{id}`) | Bevat id, status, amount, paidAt (nullable), metadata |

### MollieService

`MollieService` / `MollieServiceImpl` biedt:

**CRUD** (zelfde patroon als `BookingServiceImpl`):
- `create`, `update`, `delete`, `findAll`, `findById`
- Tenant-filtering via `TenantContext` (ADMIN ziet alles, overige alleen eigen organisatie)

**Mollie API interactie**:
- `createPaymentAtMollie(PaymentRequestDto)` — POST naar Mollie, slaat `MolliePayment` entity op met Mollie's external ID, checkout URL en status. De koppeling met een Booking moet apart via `BookingMolliePayment` worden aangemaakt.
- `updatePaymentFromMollie(PaymentStatusRequestDto)` — GET naar Mollie voor actuele status, werkt bestaande `MolliePayment` bij op basis van `molliePaymentExternalId`

### Controller endpoints

| Endpoint | Method | Authority | Beschrijving |
|---|---|---|---|
| `/api/mollie/payments` | GET | BOOKING_READ | Alle betalingen (tenant-gefilterd) |
| `/api/mollie/payments/{id}` | GET | BOOKING_READ | Specifieke betaling |
| `/api/mollie/payments` | POST | BOOKING_WRITE | MolliePayment aanmaken (CRUD) |
| `/api/mollie/payments/{id}` | PUT | BOOKING_WRITE | MolliePayment bijwerken (CRUD) |
| `/api/mollie/payments/{id}` | DELETE | BOOKING_DELETE | MolliePayment verwijderen |
| `/api/mollie/payments/create-at-mollie` | POST | BOOKING_WRITE | Betaling aanmaken bij Mollie API |
| `/api/mollie/payments/webhook` | POST | permitAll | Webhook van Mollie (retourneert 200 OK, lege body) |
| `/api/mollie/payment-statuses` | GET | BOOKING_READ | Alle Mollie betaalstatussen |
| `/api/mollie/payment-statuses/{id}` | GET | BOOKING_READ | Specifieke betaalstatus |

### Security

- `/api/mollie/payments/webhook` is toegevoegd aan `permitAll` in `SecurityConfig.java` (Mollie stuurt webhooks zonder authenticatie)
- Overige endpoints gebruiken bestaande `BOOKING_READ`, `BOOKING_WRITE` en `BOOKING_DELETE` authorities via `@PreAuthorize`

### Repository queries

- `findByMolliePaymentExternalId(String)` — opzoeken op Mollie's `tr_xxx` ID (voor webhook-verwerking)
- `findByTenantOrganization(UUID)` — tenant-filtering

### Koppeltabel: BookingMolliePayment

De koppeling tussen `Booking` en `MolliePayment` wordt beheerd in de `nl.puurkroatie.rds.booking` package via een koppeltabel-entity (zelfde patroon als `BookerAddress`):

| Bestand | Package | Beschrijving |
|---|---|---|
| `BookingMolliePayment.java` | `booking.entity` | Entity met composite PK via `@IdClass`, `@ManyToOne` naar `Booking` en `MolliePayment` |
| `BookingMolliePaymentId.java` | `booking.entity` | Composite key class (`booking` + `molliePayment` UUIDs) |
| `BookingMolliePaymentDto.java` | `booking.dto` | DTO met `bookingId` + `molliePaymentId` |
| `BookingMolliePaymentRepository.java` | `booking.repository` | JPA repository met `findByBookingTenantOrganization(UUID)` |
| `BookingMolliePaymentService.java` | `booking.service` | Interface: `findAll`, `findById`, `create`, `delete` |
| `BookingMolliePaymentServiceImpl.java` | `booking.service.impl` | Implementatie met tenant-filtering via `TenantContext` |
| `BookingMolliePaymentController.java` | `booking.controller` | REST endpoints op `/api/booking-mollie-payments` |

**Controller endpoints (BookingMolliePayment):**

| Endpoint | Method | Authority | Beschrijving |
|---|---|---|---|
| `/api/booking-mollie-payments` | GET | BOOKING_READ | Alle koppelingen (tenant-gefilterd) |
| `/api/booking-mollie-payments/{bookingId}` | GET | BOOKING_READ | Alle payments van een specifieke booking |
| `/api/booking-mollie-payments/{bookingId}/{molliePaymentId}` | GET | BOOKING_READ | Specifieke koppeling |
| `/api/booking-mollie-payments` | POST | BOOKING_WRITE | Koppeling aanmaken |
| `/api/booking-mollie-payments/{bookingId}/{molliePaymentId}` | DELETE | BOOKING_DELETE | Koppeling verwijderen |

## BookingLine

### Overzicht

BookingLine is de koppeltabel die een Booking verbindt met een specifieke Accommodation + Supplier combinatie. Elke booking bevat meerdere booking lines die elk een verblijf op een accommodatie bij een leverancier vertegenwoordigen, met eigen datum-range en bedrag.

### Package-structuur

| Bestand | Package | Beschrijving |
|---|---|---|
| `BookingLine.java` | `booking.entity` | Entity met composite PK via `@IdClass(BookingLineId.class)`, `@ManyToOne` naar `Booking`, `Accommodation` en `Supplier` |
| `BookingLineId.java` | `booking.entity` | Composite key class (`booking` + `accommodation` + `supplier` UUIDs) |
| `BookingLineDto.java` | `booking.dto` | DTO met key fields + `accommodationName` en `supplierName` voor weergave |
| `BookingLineMapper.java` | `booking.mapper` | MapStruct mapper met nested entity path mappings |
| `BookingLineRepository.java` | `booking.repository` | JPA repository met `findByTenantOrganization(UUID)` en `findByBookingBookingId(UUID)` |
| `BookingLineService.java` | `booking.service` | Interface: `findAll`, `findByBookingId`, `findById`, `create`, `update`, `delete` |
| `BookingLineServiceImpl.java` | `booking.service.impl` | Implementatie met tenant-filtering via `TenantContext` |
| `BookingLineController.java` | `booking.controller` | REST endpoints op `/api/booking-lines` |

### Controller endpoints (BookingLine)

| Endpoint | Method | Authority | Beschrijving |
|---|---|---|---|
| `/api/booking-lines` | GET | BOOKING_READ | Alle booking lines (tenant-gefilterd) |
| `/api/booking-lines/{bookingId}` | GET | BOOKING_READ | Alle lines van een specifieke booking |
| `/api/booking-lines/{bookingId}/{accommodationId}/{supplierId}` | GET | BOOKING_READ | Specifieke booking line |
| `/api/booking-lines` | POST | BOOKING_WRITE | Booking line aanmaken |
| `/api/booking-lines/{bookingId}/{accommodationId}/{supplierId}` | PUT | BOOKING_WRITE | Booking line bijwerken |
| `/api/booking-lines/{bookingId}/{accommodationId}/{supplierId}` | DELETE | BOOKING_DELETE | Booking line verwijderen |

### Testen via curl (Mollie)

```bash
# MolliePayment CRUD — lijst opvragen
curl -k https://localhost:8666/api/mollie/payments \
  -H "Authorization: Bearer <token>"

# Betaling aanmaken bij Mollie
curl -k -X POST https://localhost:8666/api/mollie/payments/create-at-mollie \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"amount":{"currency":"EUR","value":"125.00"},"description":"Boeking BK-2026-001","redirectUrl":"http://localhost:5003/payment","webhookUrl":"http://localhost:8082/payment/mollie/","metadata":{"bookingId":"<booking-uuid>"}}'

# Webhook simuleren (zoals Mollie dit stuurt)
curl -k -X POST "https://localhost:8666/api/mollie/payments/webhook?id=tr_xxx"

# BookingMolliePayment — koppeling aanmaken
curl -k -X POST https://localhost:8666/api/booking-mollie-payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"bookingId":"<booking-uuid>","molliePaymentId":"<mollie-payment-uuid>"}'

# BookingMolliePayment — koppelingen opvragen
curl -k https://localhost:8666/api/booking-mollie-payments \
  -H "Authorization: Bearer <token>"
```

