# API: conventies, endpoints en voorbeelden

Basis: `http(s)://<host>/rds/api/...` (backend, context-path `/rds`), of `/api/...` via NGINX/dev-proxy. Alles is JSON, behalve uploads (multipart) en downloads (octet-stream).

## Conventies

- REST per resource: `GET /resources`, `GET /resources/{id}`, `POST /resources`, `PUT /resources/{id}`, `DELETE /resources/{id}`. Statuscodes: `200`, `201` (aanmaken), `204` (verwijderen), `400`, `401`, `403`, `404`, `409`, `413`. Een `DELETE` op een boeking, booker, accommodatie, leverancier of activiteit geeft `409` als er een boeking met documenten of betalingen aan hangt (geschiedenis blijft bewaard).
- Authenticatie: `Authorization: Bearer <jwt>` (zie [security.md](security.md)). Elke methode vraagt één authority (tabellen hieronder); `–` = publiek of alleen eigen account.
- Foutvorm: `{ "message": "…", "status": 400, "timestamp": "…" }` (zie [architecture.md](architecture.md)).
- Enums gaan als **lowercase** tekst heen en weer (`"status": "prospect"`, `"gender": "vrouw"`); onbekende waarde → `400` met de toegestane waarden.
- Datums: `jjjj-mm-dd`; tijdstippen ISO. Bedragen: getal (`70.00`).
- Binaire velden (`templateData`, `document`) zijn in JSON een **array van bytes** of base64-tekst (Jackson `byte[]`); de frontend stuurt een getallenlijst. Downloads lopen via de aparte `…/content`-endpoints.
- Lijsten zijn tenant-gefilterd (ADMIN ziet alles). Een resource van een andere organisatie → `403`/`404`.

## Voorbeelden

```bash
BASE=http://localhost:8666/rds

# Login (medewerker). Antwoord: { token, ... } of { requiresTotp: true, tempToken }
curl -X POST $BASE/api/auth/login -H "Content-Type: application/json" \
  -d '{"userName":"<gebruiker>","password":"<wachtwoord>"}'
TOKEN=<token uit het antwoord>

# Boekingen en bookers
curl $BASE/api/bookings -H "Authorization: Bearer $TOKEN"
curl "$BASE/api/bookers?status=prospect" -H "Authorization: Bearer $TOKEN"

# Prospect aanmaken (een Booker met status prospect)
curl -X POST $BASE/api/bookers -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"firstname":"Jan","lastname":"Vries","emailaddress":"jan@example.com","status":"prospect"}'

# Document genereren uit een Word-template (outputFormat: docx | pdf)
curl -X POST $BASE/api/documents/generate -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"templateId":"<id>","bookingId":"<id>","outputFormat":"pdf"}'

# Word-template in de editor maken: HTML in, .docx uit
curl -X POST $BASE/api/document-templates -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Bevestiging","sourceHtml":"<p>Boeking ${booking.bookingNumber}</p>"}'

# E-mail voor een prospect of voor een boeking: precies één van bookerId / bookingId
curl -X POST "$BASE/api/email-templates/<id>/render?bookingId=<id>" -H "Authorization: Bearer $TOKEN"
curl -X POST "$BASE/api/email-templates/<id>/send?bookerId=<id>"    -H "Authorization: Bearer $TOKEN"

# Afbeelding uploaden voor templates (multipart, deel 'file')
curl -X POST $BASE/api/email-images -H "Authorization: Bearer $TOKEN" -F "file=@logo.png"
```

Meer voorbeelden: Mollie in [mollie.md](mollie.md), klantportal in [bookerportal.md](bookerportal.md).

## Alle endpoints met benodigde authority

*(Gegenereerd uit de `@PreAuthorize`-annotaties van de controllers op 15-10-2026; bij twijfel wint de code.)*

### Auth en beheer

| Methode | Pad | Authority |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/login/totp`, `/api/auth/login/recovery` | publiek |
| POST | `/api/auth/totp/setup`, `/api/auth/totp/verify`, `/api/auth/totp/disable` | ingelogd (eigen account) |
| PUT | `/api/auth/change-password` | ingelogd (eigen account) |
| GET, GET `/{id}`, POST, PUT `/{id}`, DELETE `/{id}` | `/api/organizations` | `ORGANIZATION_READ/READ/CREATE/UPDATE/DELETE`; DELETE geeft **409** zolang de organisatie nog data heeft |
| idem | `/api/persons` | `PERSON_*` |
| idem | `/api/accounts` | `ACCOUNT_*`; plus `DELETE /api/accounts/{id}/totp` = `ACCOUNT_UPDATE` |
| idem | `/api/roles` | `ROLE_*` |
| idem | `/api/authorities` | `AUTHORITY_*` |
| GET, GET `/{a}/{b}`, POST, DELETE `/{a}/{b}` | `/api/account-roles` (`accountId/roleId`) | `ACCOUNTROLE_READ/READ/CREATE/DELETE` |
| GET | `/api/mollie/payment-status-entries/by-payment/{id}` | `PAYMENT_READ` (antwoord bevat `createdByName`: leesbare naam van `createdBy`, leeg bij het systeem) |
| GET | `/api/account-roles/assignable-roles` | `ACCOUNTROLE_READ` (de rollen die de ingelogde gebruiker mag toewijzen/intrekken: ADMIN alle, anderen alleen EMPLOYEE en MANAGER) |
| idem | `/api/role-authorities` (`roleId/authorityId`) | `ROLEAUTHORITY_*` |
| GET, GET `/{id}`, GET `/my-theme`, POST, PUT `/{id}`, DELETE `/{id}` | `/api/organization-themes` | `ORGANIZATION_THEME_*` |

### Boekingen en stamgegevens

| Resource (`/api/…`) | Methodes | Authority |
|---|---|---|
| `bookings`, `bookers` (`?status=`), `travelers`, `addresses` | GET, GET `/{id}`, POST, PUT `/{id}`, DELETE `/{id}` | `BOOKING_READ/CREATE/UPDATE/DELETE` |
| `booking-lines`, `booking-activities` | GET, GET `/{id}`, GET `/booking/{bookingId}`, POST, PUT `/{id}`, DELETE `/{id}` | `BOOKING_*` |
| `booker-addresses` (`bookerId/addressId`) | GET, GET `/{a}/{b}`, POST, DELETE `/{a}/{b}` | `BOOKING_*` |
| `accommodations` | CRUD | `ACCOMMODATION_*` |
| `accommodation-addresses`, `accommodation-suppliers` | GET, GET `/{a}/{b}`, POST, DELETE `/{a}/{b}` | `ACCOMMODATION_*` |
| `suppliers` | CRUD | `SUPPLIER_*` |
| `supplier-addresses` | GET, GET `/{a}/{b}`, POST, DELETE `/{a}/{b}` | `SUPPLIER_*` |
| `activities` | CRUD | `ACTIVITY_*` |
| `documents` | GET, GET `/{id}`, GET `/{id}/content`, GET `/booking/{bookingId}`, POST, PUT `/{id}`, DELETE `/{id}` | `DOCUMENT_READ/CREATE/UPDATE/DELETE` |
| `documents/generate` | POST `{ templateId, bookingId, outputFormat }` | `DOCUMENT_CREATE` |
| `document-templates` | GET, GET `/{id}`, GET `/{id}/content` (.docx), POST, PUT `/{id}`, DELETE `/{id}` | `TEMPLATE_READ/CREATE/UPDATE/DELETE` |
| `booking-mollie-payments` | GET, GET `/{bookingId}`, GET `/{bookingId}/{paymentId}`, POST, DELETE `/{bookingId}/{paymentId}` | `PAYMENT_READ/CREATE/DELETE` |

### Mollie

| Methode | Pad | Authority |
|---|---|---|
| GET, GET `/{id}`, POST, PUT `/{id}`, DELETE `/{id}` | `/api/mollie/payments` | `PAYMENT_READ/READ/CREATE/UPDATE/DELETE` |
| POST | `/api/mollie/payments/create-at-mollie` | `PAYMENT_CREATE` |
| POST | `/api/mollie/payments/webhook?id=tr_…` | publiek |
| GET, GET `/by-payment/{id}`, POST `/by-payment/{id}` (correctie) | `/api/mollie/payment-status-entries` | `PAYMENT_READ`, `PAYMENT_CORRECT` (geen PUT/DELETE: alleen-toevoegen) |

### E-mail en afbeeldingen

| Methode | Pad | Authority |
|---|---|---|
| GET, GET `/{id}`, POST, PUT `/{id}`, DELETE `/{id}` | `/api/email-templates` | `TEMPLATE_READ/READ/CREATE/UPDATE/DELETE` |
| POST | `/api/email-templates/{id}/render?bookerId=` of `?bookingId=` | `TEMPLATE_READ` |
| POST | `/api/email-templates/{id}/send?bookerId=` of `?bookingId=` | `EMAIL_SEND` |
| GET, POST (multipart `file`) | `/api/email-images` | `TEMPLATE_CREATE` of `TEMPLATE_UPDATE` |
| DELETE | `/api/email-images/{id}` | `TEMPLATE_DELETE` (`409` als in gebruik) |
| GET | `/api/public/email-images/{uuid}` | publiek (alleen GET) |

### Klantportal

| Methode | Pad | Authority |
|---|---|---|
| POST | `/api/booker-auth/request-otp`, `/api/booker-auth/verify-otp` | publiek |
| GET | `/api/booker-portal/{itinerary, booking-lines, booking-activities, accommodations, activities, documents, documents/{id}, payments, payments/status-entries}` | `BOOKER_PORTAL_READ` |
| POST | `/api/booker-portal/payments/pay/{molliePaymentId}` | `BOOKER_PORTAL_UPDATE` |
