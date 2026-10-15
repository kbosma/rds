# Woordenlijst

Nederlandse domeintermen en hun technische vorm in code/API. Alfabetisch.

| Term | Betekenis | In code |
|---|---|---|
| **Accommodatie** | verblijfplaats (hotel, appartement, …) | `Accommodation`, `/api/accommodations` |
| **Activiteit** | tour, excursie, ticket of transfer | `Activity`, `ActivityType` |
| **Aanmeldproces** | potentiële klanten registreren (prospects) en ze mailen | scherm *Prospects*; `Booker.status = PROSPECT` |
| **Authority** | granulair recht, bv. `BOOKING_READ`; de UI en `@PreAuthorize` kijken hiernaar | `authority`-tabel, JWT-claim `authorities` |
| **Boeker / Booker** | opdrachtgever, de persoon achter een boeking (heeft geen login in de medewerker-app) | `Booker`, `/api/bookers` |
| **Boeking / Booking** | het reisdossier | `Booking`, `/api/bookings` |
| **Boekingsactiviteit** | een activiteit binnen een boeking | `BookingActivity` |
| **Boekingsnummer** | `BK-<jaar>-<5 cijfers>`; klant gebruikt het om in te loggen | `BookingNumberGenerator` |
| **Boekingsregel** | een verblijf binnen een boeking (accommodatie + leverancier + periode + prijs) | `BookingLine` |
| **Booker-portal** | klantenomgeving (`frontend-booker`) | pakket `bookerportal`, `/api/booker-portal/**` |
| **Concept-boeking** | voorgevuld, nog niet opgeslagen boekingsscherm | `/bookings/new?bookerId=…`, `ensureBookingPersisted` |
| **Document** | bestand bij een boeking (geüpload of gegenereerd) | `Document`, `/api/documents` |
| **Document-template / Word-template** | `.docx` met velden, geüpload of in de editor gemaakt | `DocumentTemplate` |
| **E-mailtemplate** | onderwerp + HTML met velden | `EmailTemplate` |
| **Herhaalde tabel** | tabel waarvan de laatste rij per lijstelement wordt herhaald | `data-repeat`, `data-item`, `RepeatTables` |
| **Hoofdboeker** | de Booker die aan een boeking hangt (ontvanger van e-mails over die boeking) | `Booking.booker`, `booking.booker.*` |
| **Leverancier / Supplier** | partij die een verblijf levert | `Supplier` |
| **Manager / Employee / Admin** | de drie rollen; ADMIN = systeembeheer | `role`-tabel |
| **Mollie** | betaalprovider | pakket `mollie` |
| **Onboarding** | wizard voor een nieuwe organisatie (organisatie → persoon → account → rol) | `organization-onboarding.component.ts` |
| **Organisatie / Tenant** | de klant van het SaaS-systeem; alle data is per organisatie gescheiden | `Organization`, `tenantOrganization`, `TenantContext` |
| **OTP** | eenmalige code voor de klant-login | `Otp`, `BookerAuthService` |
| **Plat model** | het template-model als maps/lijsten/tekst/getallen, zonder Java-objecten (veiligheid) | `TemplateModels` |
| **Prospect** | potentiële klant: een Booker met status `PROSPECT` | `BookerStatus` |
| **`prospect` (in een template)** | de ontvanger van een e-mail: de booker, of bij een boeking de hoofdboeker | `${prospect.*}` |
| **RDS** | Reis Dossier Systeem, deze applicatie | – |
| **Reiziger / Traveler** | persoon die meereist op een boeking | `Traveler` |
| **Slice** | een afgerond deelpakket van werk (bv. "Slice 3: e-mail versturen") | – |
| **Thema** | huisstijl per organisatie (kleuren, logo) | `OrganizationTheme`, `--theme-primary` |
| **TOTP** | tijdgebonden eenmalige code (2FA) voor medewerkers, met herstelcodes | `TotpService`, `/api/auth/totp/*` |
| **Webhook** | server-naar-server melding van Mollie over een betaalstatus | `/api/mollie/payments/webhook` |
| **Wegwerp-database** | tijdelijke PostgreSQL voor de testsuite | [build-test-deploy.md](build-test-deploy.md) |
| **XDocReport** | bibliotheek die een `.docx` met FreeMarker samenvoegt | `DocumentGenerationServiceImpl` |
