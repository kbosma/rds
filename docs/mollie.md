# Mollie-integratie (betalingen)

## Overzicht

- Betalingen lopen via de **Mollie API** (`https://api.mollie.com/v2/payments`).
- Pakket `nl.puurkroatie.rds.mollie` is **booking-agnostisch**: `MolliePayment` kent geen `Booking` (bewust geen FK). De koppeling zit in de koppeltabel `booking_mollie_payment` (entity `BookingMolliePayment`, pakket `booking`), met een UNIQUE-constraint op `mollie_payment_id` (migratie V3): één betaling hoort bij hooguit één boeking; voorschot, restant en nieuwe pogingen zijn elk een eigen betaling.
- Rolverdeling: de **medewerker** legt het betalingsrecord vast (bedrag, omschrijving) en koppelt het aan de boeking; de **klant** start in de portal de echte betaling; de **webhook** werkt de status bij. De webhook is de **enige** bron van de status, niet de redirect.

## Twee id's (niet verwarren)

| Id | Wat | Waar gebruikt |
|---|---|---|
| `molliePaymentId` | **Onze** interne UUID | pad van de pay-call, koppeltabel, primaire sleutel |
| `molliePaymentExternalId` (`tr_xxx`) | **Mollie's** payment-id | door Mollie aangemaakt; gebruikt in de webhook en de status-GET |

## Flow

```mermaid
sequenceDiagram
    actor E as Medewerker (frontend-employee)
    actor B as Klant (frontend-booker)
    participant BE as Backend (/rds)
    participant M as Mollie

    E->>BE: POST /api/mollie/payments  (PAYMENT_CREATE)
    Note over BE: MolliePayment status OPEN, nog geen externalId
    E->>BE: POST /api/booking-mollie-payments  (koppelen aan boeking)

    B->>BE: POST /api/booker-portal/payments/pay/{molliePaymentId}
    Note right of B: booker-JWT; de betaling moet bij de eigen boeking horen
    BE->>M: POST /v2/payments  bedrag "70.00", redirectUrl, webhookUrl
    M-->>BE: 201 { id = tr_xxx, status = open, _links.checkout.href }
    Note over BE: bewaar externalId = tr_xxx, checkoutUrl
    BE-->>B: 200 { checkoutUrl }
    B->>M: navigatie naar checkoutUrl; klant betaalt

    par Redirect (browser-facing)
        M-->>B: GET redirectUrl (de booker-app, geen tr_xxx)
        Note over B: app herlaadt/poll de betalingen
    and Webhook (server-to-server)
        M->>BE: POST /rds/api/mollie/payments/webhook  id=tr_xxx
        BE->>M: GET /v2/payments/tr_xxx
        M-->>BE: status = paid
        Note over BE: zoek op externalId, schrijf MolliePaymentStatusEntry(PAID)
        BE-->>M: 200 (Mollie stopt met herhalen)
    end

    B->>BE: GET /api/booker-portal/payments/status-entries
    BE-->>B: PAID, de klant ziet "Betaald"
```

Toelichting:
1. De pay-call bouwt het bedrag als tekst met exact 2 decimalen (`"70.00"`) en stuurt `redirectUrl` en `webhookUrl` mee. De redirect-URL komt bij voorkeur uit de omgevingsconfiguratie (`app.mollie.urls.redirect`).
2. `tr_xxx` bewaren we als `molliePaymentExternalId`; de checkout-URL uit `_links.checkout.href` als `checkoutUrl`.
3. **Redirect ≠ webhook.** De redirect is browser-facing en mag een intern adres zijn; de webhook komt van Mollie's servers en moet **publiek bereikbaar** zijn, via NGINX op `/rds/api/mollie/payments/webhook` (zie de IP-server in `deploy/nginx/rds.conf`: een exacte location met rate-limit `mollie_limit`).
4. De webhook-body bevat alleen het id; de backend haalt de **echte** status zelf bij Mollie op en legt die vast als `MolliePaymentStatusEntry` (auditspoor).
5. **Webhook-validatie:** `id` moet voldoen aan `tr_[A-Za-z0-9]+` (anders `400`), zodat de endpoint niet voor willekeurige invoer misbruikt kan worden.
6. Er is ook `POST /api/mollie/payments/create-at-mollie` (medewerker): maakt direct een betaling bij Mollie aan en bewaart het resultaat als `MolliePayment`.

## Statussen en enums

`MolliePaymentStatus`: `OPEN, PENDING, AUTHORIZED, PAID, FAILED, CANCELED, EXPIRED` (spiegel van Mollie).
`MolliePaymentMethod`: `IDEAL, CREDITCARD, BANCONTACT, SOFORT, BANKTRANSFER, PAYPAL, BELFIUS, KBC, EPS, GIROPAY, PRZELEWY24, APPLEPAY, GOOGLEPAY, IN3, KLARNA, RIVERTY`.
Beide: naam in de database, lowercase in JSON, hoofdletterongevoelig parsen.

## Een betaling wordt nooit verwijderd

Een betaling en haar statushistorie blijven altijd bewaard, **ook als er (nog) geen Mollie-id is**. Er is geen `DELETE /api/mollie/payments/{id}` (405) en migratie V11 zet databasetriggers op `mollie_payment` en `mollie_payment_status_entry` die elke `DELETE` en `TRUNCATE` weigeren, dus ook een cascade of handmatige SQL kan de historie niet laten verdwijnen. Alleen de koppeling aan een boeking kan nog worden losgemaakt (`DELETE /api/booking-mollie-payments/…`, `PAYMENT_DELETE`); de betaling zelf en haar historie blijven dan staan.

## Levenscyclus: een betaling is eerst een aankondiging

1. **Aangekondigd:** een medewerker legt een betaling vast (omschrijving, bedrag). Er is nog geen Mollie-id; de betaling bestaat alleen bij ons en mag nog worden **aangepast** (omschrijving, bedrag).
2. **Bij Mollie aangemaakt:** zodra de klant in het portaal betaalt, maakt de backend de betaling bij Mollie aan en krijgt het record het Mollie-id (`tr_…`) en de checkout-URL. Vanaf dat moment is de betaling **geschiedenis**: `PUT` geeft **409** (`PaymentLockedException`) en de UI toont geen bewerkicoon.
3. **Statussen via de webhook:** zie hieronder.

Het Mollie-id en de checkout-URL zijn van de server: een client kan ze bij `POST` en `PUT` niet zetten of wissen (ze worden genegeerd). De regel wordt dus door de backend afgedwongen, niet alleen door de UI.

## Statushistorie: alleen-toevoegen en correcties

De statussen van een betaling komen van Mollie (webhook). **Een regel wordt nooit gewijzigd, vervangen of verwijderd**; er bestaan geen `PUT`/`DELETE` op statusregels en databasetriggers weigeren elke `UPDATE` (V10) en elke `DELETE`/`TRUNCATE` (V11). Wel kan een medewerker met `PAYMENT_CORRECT` (ADMIN en MANAGER) een **correctie** registreren, bv. als de klant per bank betaalde buiten Mollie om. Dat is altijd een **nieuwe regel** met `correction = true`, wie (`createdBy`), wanneer (`createdAt`) en een verplichte reden (minstens 5 tekens); de Mollie-regels blijven staan. De huidige status is de laatste regel.

Toegestane correctiestatussen (`MolliePaymentStatusEntryServiceImpl.CORRECTION_STATUSES`): `open`, `paid`, `failed`, `canceled`. `pending`, `authorized` en `expired` bepaalt alleen Mollie. Een correctie naar de huidige status wordt geweigerd. In de UI staat de knop **Correctie registreren** in het betalingsdialoog (oog-icoon bij de betaling); het dialoog toont bron (*Correctie*), naam en reden.

## Endpoints

| Methode | Pad | Authority |
|---|---|---|
| GET/POST | `/api/mollie/payments` | `PAYMENT_READ` / `PAYMENT_CREATE` |
| GET/PUT | `/api/mollie/payments/{id}` | `PAYMENT_READ` / `PAYMENT_UPDATE` (alleen zolang er geen Mollie-id is, anders 409). **Geen DELETE: een betaling wordt nooit verwijderd.** |
| POST | `/api/mollie/payments/create-at-mollie` | `PAYMENT_CREATE` |
| POST | `/api/mollie/payments/webhook` | publiek (gevalideerd id) |
| GET | `/api/mollie/payment-status-entries` | `PAYMENT_READ` |
| GET | `/api/mollie/payment-status-entries/by-payment/{molliePaymentId}` | `PAYMENT_READ` (antwoord bevat `createdByName`, `correction`, `reason`) |
| POST | `/api/mollie/payment-status-entries/by-payment/{molliePaymentId}` | `PAYMENT_CORRECT` (ADMIN, MANAGER): handmatige correctie `{status, reason}` |
| GET/POST | `/api/booking-mollie-payments` | `PAYMENT_READ` / `PAYMENT_CREATE` |
| GET | `/api/booking-mollie-payments/{bookingId}` (en `/{bookingId}/{molliePaymentId}`) | `PAYMENT_READ` |
| DELETE | `/api/booking-mollie-payments/{bookingId}/{molliePaymentId}` | `PAYMENT_DELETE` |
| GET | `/api/booker-portal/payments` en `/status-entries` | `BOOKER_PORTAL_READ` |
| POST | `/api/booker-portal/payments/pay/{molliePaymentId}` | `BOOKER_PORTAL_UPDATE` |

Tenant-filtering: `ADMIN` ziet alles, anderen alleen de eigen organisatie (services). Het portal-pad filtert op het `bookingId` uit het token.

## Code

| Onderdeel | Klassen |
|---|---|
| Pakket `mollie` | `entity`: `MolliePayment`, `MolliePaymentStatusEntry`, enums `MolliePaymentStatus`, `MolliePaymentMethod`; `dto`: `MolliePaymentDto`, `MolliePaymentStatusEntryDto`, `PaymentRequestDto`, `PaymentResponseDto`, `PaymentStatusRequestDto`, `PaymentStatusResponseDto`; `service`: `MollieService` (+impl), `MolliePaymentStatusEntryService` (+impl); `config`: `MollieConfig` (REST-client met de sleutel); `controller`: `MolliePaymentController`, `MolliePaymentStatusEntryController` |
| Pakket `booking` | `BookingMolliePayment` (+ `…Id`, repository, controller `BookingMolliePaymentController`) |
| Pakket `bookerportal` | `BookerPortalPaymentService` (eigenaarschapscontrole, aanroep Mollie, bijwerken record), `BookerPortalPaymentController` |
| Frontend | employee: `features/mollie/*` (betalingen per boeking en overzicht); booker: `features/payments/*` |

Belangrijke queries: `findByMolliePaymentExternalId(String)` (webhook), `findByTenantOrganization(UUID)`.

## Configuratie (`application.yaml`, onder `app.mollie`)

| Sleutel | Betekenis |
|---|---|
| `api.payments.base` | basis-URL van de Mollie payments-API |
| `key` | `Bearer <api-key>` voor de REST-client (**één globale sleutel**, zie hieronder) |
| `urls.webhook` | publiek bereikbare webhook-URL (nu het publieke IP via NGINX) |
| `urls.redirect` | waar de browser na betalen heen gaat (de booker-app) |

Lokaal testen met een tunnel: `start/scripts/start-mollie-tunnel.sh` start een Cloudflare quick-tunnel en schrijft de URL in `application-rds-local.yaml` (profiel `rds-local`, niet committen; de tunnel-URL wisselt bij elke start). Zie [build-test-deploy.md](build-test-deploy.md).

> **Let op (zie [open-items.md](open-items.md)):** de REST-client gebruikt één globale sleutel uit de configuratie. De kolom `organization.mollie_key` bestaat en is te bewerken, maar wordt **niet** gebruikt voor de API-aanroepen. Voor echte multi-tenant betalingen (elke organisatie op eigen Mollie-account) moet de client de sleutel van de betreffende organisatie gebruiken.

## Testen met curl

```bash
BASE=http://localhost:8666/rds
TOKEN=<employee-jwt>

# betalingsrecord aanmaken (medewerker)
curl -X POST $BASE/api/mollie/payments -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"amount": 70.00, "currency": "EUR", "description": "Voorschot"}'

# koppelen aan een boeking
curl -X POST $BASE/api/booking-mollie-payments -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"bookingId": "<bookingId>", "molliePaymentId": "<molliePaymentId>"}'

# webhook simuleren (zoals Mollie dit stuurt)
curl -X POST "$BASE/api/mollie/payments/webhook?id=tr_xxxxxxxx"
```

(Controleer de exacte JSON-velden in `MolliePaymentDto` voordat je een voorbeeld overneemt.)
