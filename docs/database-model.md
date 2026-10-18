# Database Model

Dit document beschrijft het volledige databasemodel per tabel/entiteit (stand: migratie **V8**, 15-10-2026).
Gebruik dit als referentie bij het aanvragen van database-wijzigingen die doorgevoerd moeten worden in alle lagen (Entity, DTO, Mapper, Service, Repository, Controller en frontend).

De waarheid is het Flyway-schema in `src/main/resources/db/migration` (V1 basisschema, V2 seed, V3 unieke betaling per boeking, V4 `booker.status`, V5 `email_template`, V6 `organization.email_from` + `EMAIL_SEND`, V7 `email_image`, V8 `document_template.source_html`, V9 CHECK-constraints op `booking.booking_status` en `booker.status`, V10 correcties op de betalingsstatus, V11 betalingen worden nooit verwijderd). Hibernate staat op `ddl-auto: validate`: een entity die niet exact bij het schema past laat de applicatie niet starten. Wijzigingen gaan dus **altijd** via een nieuwe migratie (nooit een bestaande aanpassen).

---

## Conventies

- **Primary keys**: UUID, auto-gegenereerd (`@GeneratedValue(strategy = GenerationType.UUID)`)
- **Naamgeving**: snake_case in database, camelCase in Java
- **Multi-tenancy**: Entiteiten met `tenant_organization` kolom worden gefilterd op organisatie via `TenantContext`
- **Audit fields**: `created_at`, `created_by`, `modified_at`, `modified_by` — automatisch gezet via `@PrePersist`/`@PreUpdate`
- **Enums**: Opgeslagen als `STRING` (`@Enumerated(EnumType.STRING)`), JSON-serialisatie in lowercase via `@JsonValue`/`@JsonCreator` (parsing via `EnumValues.parse`, hoofdletterongevoelig, foutmelding met toegestane waarden). In het template-model (documenten/e-mail) is een enum de hoofdletter-naam
- **Relaties**: Altijd `FetchType.LAZY`
- **Composite keys**: Aparte `@IdClass` klassen die `Serializable` implementeren met `equals()`/`hashCode()`

---

## Auth Module

### organization

Tenant/organisatie. Dit IS de tenant — heeft zelf geen `tenant_organization`.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| organization_id | UUID | PK, auto-generated | |
| name | VARCHAR | NOT NULL | Naam organisatie |
| mollie_key | VARCHAR | | Mollie API key per organisatie. **Wordt nog niet gebruikt** voor API-aanroepen (zie [open-items.md](open-items.md)) |
| email_from | VARCHAR(255) | | Afzenderadres (`From`) voor e-mails van deze organisatie (V6) |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Backend bestanden:**
- Entity: `auth/entity/Organization.java`
- DTO: `auth/dto/OrganizationDto.java`
- Mapper: `auth/mapper/OrganizationMapper.java`
- Service: `auth/service/OrganizationService.java`
- ServiceImpl: `auth/service/impl/OrganizationServiceImpl.java`
- Repository: `auth/repository/OrganizationRepository.java`
- Controller: `auth/controller/OrganizationController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/organization.model.ts`
- Service: `frontend-employee/src/app/features/admin/organization.service.ts`
- Components: `frontend-employee/src/app/features/admin/organization-list.component.ts`, `organization-detail.component.ts`, `organization-onboarding.component.ts` (wizard: organisatie → persoon → account → rol)

---

### organization_theme

Huisstijl per organisatie (één rij per organisatie). De UI gebruikt de kleuren als CSS-variabelen (`--theme-primary`, `--theme-accent`, `--theme-card-title`).

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| organization_theme_id | UUID | PK | |
| organization_id | UUID | FK → organization, NOT NULL, **UNIQUE** | Organisatie |
| primary_color | VARCHAR(7) | NOT NULL | bv. `#1976d2` |
| accent_color | VARCHAR(7) | NOT NULL | |
| logo_url | VARCHAR(500) | | |
| card_title_color | VARCHAR(7) | | |
| created_at / created_by / modified_at / modified_by | | | audit |

**Bestanden:** `auth/entity/OrganizationTheme.java`, `auth/controller/OrganizationThemeController.java` (`GET /api/organization-themes/my-theme` voor de eigen organisatie); frontend `features/admin/organization-theme.component.ts`, `theme.service.ts`.

---

### person

Persoon, gekoppeld aan een organisatie.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| person_id | UUID | PK, auto-generated | |
| firstname | VARCHAR | | Voornaam |
| prefix | VARCHAR | | Tussenvoegsel |
| lastname | VARCHAR | | Achternaam |
| organization_id | UUID | FK → organization, NOT NULL | Organisatie |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Organization

**Backend bestanden:**
- Entity: `auth/entity/Person.java`
- DTO: `auth/dto/PersonDto.java`
- Mapper: `auth/mapper/PersonMapper.java`
- Service: `auth/service/PersonService.java`
- ServiceImpl: `auth/service/impl/PersonServiceImpl.java`
- Repository: `auth/repository/PersonRepository.java`
- Controller: `auth/controller/PersonController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/person.model.ts`
- Service: `frontend-employee/src/app/features/admin/person.service.ts`
- Component: `frontend-employee/src/app/features/admin/person-list.component.ts` *(placeholder)*

---

### account

Gebruikersaccount met login-gegevens en optionele TOTP 2FA.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| account_id | UUID | PK, auto-generated | |
| user_name | VARCHAR | NOT NULL | Gebruikersnaam |
| password_hash | VARCHAR | NOT NULL | BCrypt hash |
| person_id | UUID | FK → person, NOT NULL | Gekoppelde persoon |
| locked | BOOLEAN | NOT NULL | Account vergrendeld |
| must_change_password | BOOLEAN | NOT NULL | Wachtwoord wijzigen verplicht |
| totp_secret | VARCHAR | | TOTP geheim (base32) |
| totp_enabled | BOOLEAN | NOT NULL | 2FA ingeschakeld |
| totp_verified | BOOLEAN | NOT NULL | 2FA setup bevestigd |
| recovery_codes | TEXT | | Herstelcodes (comma-separated) |
| expires_at | TIMESTAMP | | Verloopt op |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Person

**Bijzonderheden:** `password` is een `@Transient` veld dat automatisch gehashed wordt via BCryptPasswordEncoder in `@PrePersist`/`@PreUpdate`. TOTP-velden (`totp_enabled`, `totp_verified`) worden default op `false` gezet in `@PrePersist`.

**Backend bestanden:**
- Entity: `auth/entity/Account.java`
- DTO: `auth/dto/AccountDto.java`
- Mapper: `auth/mapper/AccountMapper.java`
- Service: `auth/service/AccountService.java`, `auth/service/TotpService.java`
- ServiceImpl: `auth/service/impl/AccountServiceImpl.java`, `auth/service/impl/TotpServiceImpl.java`
- Repository: `auth/repository/AccountRepository.java`
- Controller: `auth/controller/AccountController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/account.model.ts`
- Service: `frontend-employee/src/app/features/admin/account.service.ts`
- Components:
  - `frontend-employee/src/app/features/admin/account-list.component.ts`
  - `frontend-employee/src/app/features/profile/totp-settings.component.ts`
  - `frontend-employee/src/app/features/profile/totp-setup-dialog.component.ts`
  - `frontend-employee/src/app/features/profile/totp-disable-dialog.component.ts`

---

### role

Rol voor RBAC.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| role_id | UUID | PK, auto-generated | |
| description | VARCHAR | NOT NULL | Rolnaam |

**Backend bestanden:**
- Entity: `auth/entity/Role.java`
- DTO: `auth/dto/RoleDto.java`
- Mapper: `auth/mapper/RoleMapper.java`
- Service: `auth/service/RoleService.java`
- ServiceImpl: `auth/service/impl/RoleServiceImpl.java`
- Repository: `auth/repository/RoleRepository.java`
- Controller: `auth/controller/RoleController.java`

**Frontend bestanden:**
- Component: `frontend-employee/src/app/features/admin/role-list.component.ts` *(placeholder)*

---

### authority

Autorisatie/permissie voor RBAC.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| authority_id | UUID | PK, auto-generated | |
| description | VARCHAR | NOT NULL | Permissie-naam |

**Backend bestanden:**
- Entity: `auth/entity/Authority.java`
- DTO: `auth/dto/AuthorityDto.java`
- Mapper: `auth/mapper/AuthorityMapper.java`
- Service: `auth/service/AuthorityService.java`
- ServiceImpl: `auth/service/impl/AuthorityServiceImpl.java`
- Repository: `auth/repository/AuthorityRepository.java`
- Controller: `auth/controller/AuthorityController.java`

**Frontend bestanden:** *Geen*

---

### account_role *(koppeltabel)*

Koppeling Account ↔ Role (many-to-many).

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| account_id | UUID | PK (composite), FK → account, NOT NULL | |
| role_id | UUID | PK (composite), FK → role, NOT NULL | |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Backend bestanden:**
- Entity: `auth/entity/AccountRole.java`
- IdClass: `auth/entity/AccountRoleId.java`
- DTO: `auth/dto/AccountRoleDto.java`
- Service: `auth/service/AccountRoleService.java`
- Repository: `auth/repository/AccountRoleRepository.java`
- Controller: `auth/controller/AccountRoleController.java`

**Frontend bestanden:** *Geen*

---

### role_authority *(koppeltabel)*

Koppeling Role ↔ Authority (many-to-many).

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| role_id | UUID | PK (composite), FK → role, NOT NULL | |
| authority_id | UUID | PK (composite), FK → authority, NOT NULL | |

**Backend bestanden:**
- Entity: `auth/entity/RoleAuthority.java`
- IdClass: `auth/entity/RoleAuthorityId.java`
- DTO: `auth/dto/RoleAuthorityDto.java`
- Service: `auth/service/RoleAuthorityService.java`
- Repository: `auth/repository/RoleAuthorityRepository.java`
- Controller: `auth/controller/RoleAuthorityController.java`

**Frontend bestanden:** *Geen*

---

## Booking Module

### booking

Hoofdentiteit voor boekingen. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booking_id | UUID | PK, auto-generated | |
| booker_id | UUID | FK → booker | Gekoppelde booker |
| booking_number | VARCHAR | NOT NULL | Boekingnummer |
| booking_status | VARCHAR | NOT NULL, CHECK `booking_status_check` (V9), enum BookingStatus | Status |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Berekende velden (niet in database, `@Transient`):**
- `fromDate` (LocalDate) — kleinste `fromDate` van alle gekoppelde BookingLines
- `untilDate` (LocalDate) — grootste `untilDate` van alle gekoppelde BookingLines
- `totalSum` (BigDecimal) — som van alle `BookingLine.price` + alle `BookingActivity.totalPrice`

**Relaties:**
- OneToOne → Booker (optional)
- OneToMany ← Traveler (mappedBy="booking")
- OneToMany ← BookingLine (mappedBy="booking")
- OneToMany ← BookingActivity (mappedBy="booking")

**Enum BookingStatus:** `AANVRAAG`, `OFFERTE`, `BOEKING`, `VOORSCHOT`, `BETAALD`, `OPREIS`, `WEERTHUIS`, `AFGEROND`. De database dwingt dezelfde lijst af met een CHECK-constraint (V9); een status toevoegen of hernoemen vraagt dus een migratie (zie de uitleg bovenin `V9__status_check_constraints.sql`) en `StatusConstraintsTest` faalt als enum en constraint uit elkaar lopen.

**Backend bestanden:**
- Entity: `booking/entity/Booking.java`
- DTO: `booking/dto/BookingDto.java`
- Mapper: `booking/mapper/BookingMapper.java`
- Service: `booking/service/BookingService.java`
- ServiceImpl: `booking/service/impl/BookingServiceImpl.java`
- Repository: `booking/repository/BookingRepository.java`
- Controller: `booking/controller/BookingController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/booking.model.ts`
- Service: `frontend-employee/src/app/features/bookings/booking.service.ts`
- Components:
  - `frontend-employee/src/app/features/bookings/booking-list.component.ts` (lijst met filters)
  - `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (detail/bewerken)
  - `frontend-employee/src/app/features/dashboard/dashboard.component.ts` (dashboard)

---

### booker

Boeker/opdrachtgever. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booker_id | UUID | PK, auto-generated | |
| firstname | VARCHAR | | Voornaam |
| prefix | VARCHAR | | Tussenvoegsel |
| lastname | VARCHAR | | Achternaam |
| callsign | VARCHAR | | Roepnaam |
| telephone | VARCHAR | | Telefoon |
| emailaddress | VARCHAR | | E-mailadres |
| gender | VARCHAR | enum Gender | Geslacht |
| birthdate | DATE | | Geboortedatum |
| initials | VARCHAR | | Initialen |
| status | VARCHAR | NOT NULL, CHECK `booker_status_check` (V9) | enum `BookerStatus` (V4) |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Enum Gender:** `MAN`, `VROUW`, `ANDERS`

**Enum BookerStatus:** `PROSPECT` (potentiële klant, nog geen boeking), `ACTIVE` (reguliere boeker), `NIETACTIEF` (niet meer actief; de UI heeft hier nog geen keuzeveld voor, de API wel). Een prospect is dus **geen aparte tabel** maar een Booker met status `PROSPECT`; bestaande bookers zijn bij V4 `ACTIVE` geworden. `GET /api/bookers?status=prospect` filtert.

**Backend bestanden:**
- Entity: `booking/entity/Booker.java`
- DTO: `booking/dto/BookerDto.java`
- Mapper: `booking/mapper/BookerMapper.java`
- Service: `booking/service/BookerService.java`
- ServiceImpl: `booking/service/impl/BookerServiceImpl.java`
- Repository: `booking/repository/BookerRepository.java`
- Controller: `booking/controller/BookerController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/booker.model.ts`
- Service: `frontend-employee/src/app/features/bookers/booker.service.ts`
- Components:
  - `frontend-employee/src/app/features/bookers/booker-list.component.ts` (lijst)
  - `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (booker-info in boeking)
  - `frontend-booker/src/app/features/dashboard/dashboard.component.ts` (booker portal)

---

### traveler

Reiziger, gekoppeld aan een boeking. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| traveler_id | UUID | PK, auto-generated | |
| booking_id | UUID | FK → booking, NOT NULL | Boeking |
| firstname | VARCHAR | | Voornaam |
| prefix | VARCHAR | | Tussenvoegsel |
| lastname | VARCHAR | | Achternaam |
| gender | VARCHAR | enum Gender | Geslacht |
| birthdate | DATE | | Geboortedatum |
| initials | VARCHAR | | Initialen |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Booking

**Backend bestanden:**
- Entity: `booking/entity/Traveler.java`
- DTO: `booking/dto/TravelerDto.java`
- Mapper: `booking/mapper/TravelerMapper.java`
- Service: `booking/service/TravelerService.java`
- ServiceImpl: `booking/service/impl/TravelerServiceImpl.java`
- Repository: `booking/repository/TravelerRepository.java`
- Controller: `booking/controller/TravelerController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/traveler.model.ts`
- Service: `frontend-employee/src/app/features/travelers/traveler.service.ts`
- Components:
  - `frontend-employee/src/app/features/travelers/traveler-list.component.ts` *(placeholder)*
  - `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (reizigers-tabel)

---

### accommodation

Accommodatie. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| accommodation_id | UUID | PK, auto-generated | |
| key | VARCHAR | NOT NULL | Unieke sleutel |
| name | VARCHAR | NOT NULL | Naam |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Backend bestanden:**
- Entity: `booking/entity/Accommodation.java`
- DTO: `booking/dto/AccommodationDto.java`
- Mapper: `booking/mapper/AccommodationMapper.java`
- Service: `booking/service/AccommodationService.java`
- ServiceImpl: `booking/service/impl/AccommodationServiceImpl.java`
- Repository: `booking/repository/AccommodationRepository.java`
- Controller: `booking/controller/AccommodationController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/accommodation.model.ts`
- Service: `frontend-employee/src/app/features/accommodations/accommodation.service.ts`
- Components:
  - `frontend-employee/src/app/features/accommodations/accommodation-list.component.ts` (kaartweergave)
  - `frontend-employee/src/app/features/accommodations/accommodation-detail.component.ts` (detail)

---

### supplier

Leverancier. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| supplier_id | UUID | PK, auto-generated | |
| key | VARCHAR | NOT NULL | Unieke sleutel |
| name | VARCHAR | NOT NULL | Naam |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Backend bestanden:**
- Entity: `booking/entity/Supplier.java`
- DTO: `booking/dto/SupplierDto.java`
- Mapper: `booking/mapper/SupplierMapper.java`
- Service: `booking/service/SupplierService.java`
- ServiceImpl: `booking/service/impl/SupplierServiceImpl.java`
- Repository: `booking/repository/SupplierRepository.java`
- Controller: `booking/controller/SupplierController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/supplier.model.ts`
- Service: `frontend-employee/src/app/features/suppliers/supplier.service.ts`
- Components:
  - `frontend-employee/src/app/features/suppliers/supplier-list.component.ts` *(placeholder)*
  - `frontend-employee/src/app/features/accommodations/accommodation-list.component.ts` (leveranciernaam bij accommodatie)
  - `frontend-employee/src/app/features/accommodations/accommodation-detail.component.ts` (leverancier-details)

---

### activity

Activiteit (tour, excursie, ticket, transfer). Multi-tenant. Referentie-entity die door MANAGERs beheerd wordt.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| activity_id | UUID | PK, auto-generated | |
| name | VARCHAR | NOT NULL | Naam |
| description | VARCHAR | | Omschrijving |
| activity_type | VARCHAR | NOT NULL, enum ActivityType | Type activiteit |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Enum ActivityType:** `TOUR`, `EXCURSIE`, `TICKET`, `TRANSFER`

**Backend bestanden:**
- Entity: `booking/entity/Activity.java`
- Enum: `booking/entity/ActivityType.java`
- DTO: `booking/dto/ActivityDto.java`
- Mapper: `booking/mapper/ActivityMapper.java`
- Service: `booking/service/ActivityService.java`
- ServiceImpl: `booking/service/impl/ActivityServiceImpl.java`
- Repository: `booking/repository/ActivityRepository.java`
- Controller: `booking/controller/ActivityController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/activity.model.ts`
- Service: `frontend-employee/src/app/features/activities/activity.service.ts`
- Components:
  - `frontend-employee/src/app/features/activities/activity-list.component.ts` (lijst)
  - `frontend-employee/src/app/features/activities/activity-detail.component.ts` (detail/bewerken)

---

### address

Adres met adresrol. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| address_id | UUID | PK, auto-generated | |
| street | VARCHAR | | Straat |
| housenumber | INTEGER | | Huisnummer |
| housenumber_addition | VARCHAR | | Toevoeging |
| postalcode | VARCHAR | | Postcode |
| city | VARCHAR | | Plaats |
| country | VARCHAR | | Land |
| addressrole | VARCHAR | NOT NULL, enum AddressRole | Adresrol |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Enum AddressRole:** `WOON`, `FACTUUR`, `ACCOMMODATIE`, `LEVERANCIER`

**Backend bestanden:**
- Entity: `booking/entity/Address.java`
- DTO: `booking/dto/AddressDto.java`
- Mapper: `booking/mapper/AddressMapper.java`
- Service: `booking/service/AddressService.java`
- ServiceImpl: `booking/service/impl/AddressServiceImpl.java`
- Repository: `booking/repository/AddressRepository.java`
- Controller: `booking/controller/AddressController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/address.model.ts`
- Service: `frontend-employee/src/app/features/accommodations/address.service.ts`
- Components:
  - `frontend-employee/src/app/features/accommodations/accommodation-list.component.ts`
  - `frontend-employee/src/app/features/accommodations/accommodation-detail.component.ts`

---

### document

Document (binair), gekoppeld aan een boeking. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| document_id | UUID | PK, auto-generated | |
| booking_id | UUID | FK → booking, NOT NULL | Boeking |
| displayname | VARCHAR | NOT NULL | Weergavenaam |
| document | BYTEA | @Lob | Binaire inhoud |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Booking

**Backend bestanden:**
- Entity: `booking/entity/Document.java`
- DTO: `booking/dto/DocumentDto.java`
- Mapper: `booking/mapper/DocumentMapper.java`
- Service: `booking/service/DocumentService.java`
- ServiceImpl: `booking/service/impl/DocumentServiceImpl.java`
- Repository: `booking/repository/DocumentRepository.java`
- Controller: `booking/controller/DocumentController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/document.model.ts`
- Service: `frontend-employee/src/app/features/documents/document.service.ts`
- Components:
  - `frontend-employee/src/app/features/documents/document-upload-dialog.component.ts`
  - `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (documenten-tabel)
- Booker portal: `frontend-booker/src/app/features/documents/documents.component.ts`

---

### document_template

Documenttemplate (DOCX) voor het genereren van documenten met XDocReport. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| document_template_id | UUID | PK, auto-generated | |
| name | VARCHAR | NOT NULL | Naam |
| description | VARCHAR | | Omschrijving |
| template_data | BYTEA | @Lob | DOCX template (binair) |
| source_html | TEXT | nullable | Alleen bij een template uit de editor: de HTML waaruit `template_data` bij het opslaan is gebouwd (zie [templates.md](templates.md)); `NULL` bij een geüploade .docx. Migratie `V8__document_template_source_html.sql` |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Backend bestanden:**
- Entity: `booking/entity/DocumentTemplate.java`
- DTO: `booking/dto/DocumentTemplateDto.java`
- Mapper: `booking/mapper/DocumentTemplateMapper.java`
- Service: `booking/service/DocumentTemplateService.java`
- ServiceImpl: `booking/service/impl/DocumentTemplateServiceImpl.java`
- Repository: `booking/repository/DocumentTemplateRepository.java`
- Controller: `booking/controller/DocumentTemplateController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/document-template.model.ts`
- Components:
  - `frontend-employee/src/app/features/templates/template-list.component.ts`
  - `frontend-employee/src/app/features/templates/template-detail.component.ts`

---

### booking_line

Boekingsregel: koppeling Booking ↔ Accommodation ↔ Supplier met eigen UUID PK en extra velden. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booking_line_id | UUID | PK, auto-generated | |
| booking_id | UUID | FK → booking, NOT NULL | Boeking |
| accommodation_id | UUID | FK → accommodation, NOT NULL | Accommodatie |
| supplier_id | UUID | FK → supplier, NOT NULL | Leverancier |
| from_date | DATE | | Startdatum |
| until_date | DATE | | Einddatum |
| price | DECIMAL | | Prijs |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Booking, ManyToOne → Accommodation, ManyToOne → Supplier

**Backend bestanden:**
- Entity: `booking/entity/BookingLine.java`
- DTO: `booking/dto/BookingLineDto.java`
- Mapper: `booking/mapper/BookingLineMapper.java`
- Service: `booking/service/BookingLineService.java`
- ServiceImpl: `booking/service/impl/BookingLineServiceImpl.java`
- Repository: `booking/repository/BookingLineRepository.java`
- Controller: `booking/controller/BookingLineController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/booking-line.model.ts`
- Service: `frontend-employee/src/app/features/bookings/booking-line.service.ts`
- Components:
  - `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (boekingsregels)
  - `frontend-employee/src/app/features/bookings/booking-line-dialog.component.ts` (add/edit dialog)

---

### booking_activity

Boekingsactiviteit: koppeling Booking ↔ Activity met eigen UUID PK en extra velden (n:m, dezelfde activiteit kan meerdere keren in een booking). Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booking_activity_id | UUID | PK, auto-generated | |
| booking_id | UUID | FK → booking, NOT NULL | Boeking |
| activity_id | UUID | FK → activity, NOT NULL | Activiteit |
| from_date | DATE | | Startdatum |
| until_date | DATE | | Einddatum |
| meeting_point | VARCHAR | | Trefpunt |
| total_price | DECIMAL | | Totaalprijs |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Booking, ManyToOne → Activity

**Bijzonderheden:** `totalPrice` telt mee in de berekende `Booking.totalSum`.

**Backend bestanden:**
- Entity: `booking/entity/BookingActivity.java`
- DTO: `booking/dto/BookingActivityDto.java`
- Mapper: `booking/mapper/BookingActivityMapper.java`
- Service: `booking/service/BookingActivityService.java`
- ServiceImpl: `booking/service/impl/BookingActivityServiceImpl.java`
- Repository: `booking/repository/BookingActivityRepository.java`
- Controller: `booking/controller/BookingActivityController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/booking-activity.model.ts`
- Service: `frontend-employee/src/app/features/bookings/booking-activity.service.ts`
- Components:
  - `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (activiteiten-tabel)
  - `frontend-employee/src/app/features/bookings/booking-activity-dialog.component.ts` (add/edit dialog)
- Booker portal: `frontend-booker/src/app/features/activities/activities.component.ts`

---

### booker_address *(koppeltabel)*

Koppeling Booker ↔ Address.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booker_id | UUID | PK (composite), FK → booker, NOT NULL | |
| address_id | UUID | PK (composite), FK → address, NOT NULL | |

**Backend bestanden:**
- Entity: `booking/entity/BookerAddress.java`
- IdClass: `booking/entity/BookerAddressId.java`
- DTO: `booking/dto/BookerAddressDto.java`
- Mapper: `booking/mapper/BookerAddressMapper.java`
- Service: `booking/service/BookerAddressService.java`
- ServiceImpl: `booking/service/impl/BookerAddressServiceImpl.java`
- Repository: `booking/repository/BookerAddressRepository.java`
- Controller: `booking/controller/BookerAddressController.java`

**Frontend bestanden:** *Geen frontend model*

---

### accommodation_address *(koppeltabel)*

Koppeling Accommodation ↔ Address.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| accommodation_id | UUID | PK (composite), FK → accommodation, NOT NULL | |
| address_id | UUID | PK (composite), FK → address, NOT NULL | |

**Backend bestanden:**
- Entity: `booking/entity/AccommodationAddress.java`
- IdClass: `booking/entity/AccommodationAddressId.java`
- DTO: `booking/dto/AccommodationAddressDto.java`
- Mapper: `booking/mapper/AccommodationAddressMapper.java`
- Service: `booking/service/AccommodationAddressService.java`
- ServiceImpl: `booking/service/impl/AccommodationAddressServiceImpl.java`
- Repository: `booking/repository/AccommodationAddressRepository.java`
- Controller: `booking/controller/AccommodationAddressController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/accommodation-address.model.ts`
- Service: `frontend-employee/src/app/features/accommodations/accommodation-address.service.ts`
- Components:
  - `frontend-employee/src/app/features/accommodations/accommodation-list.component.ts`
  - `frontend-employee/src/app/features/accommodations/accommodation-detail.component.ts`

---

### accommodation_supplier *(koppeltabel)*

Koppeling Accommodation ↔ Supplier.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| accommodation_id | UUID | PK (composite), FK → accommodation, NOT NULL | |
| supplier_id | UUID | PK (composite), FK → supplier, NOT NULL | |

**Backend bestanden:**
- Entity: `booking/entity/AccommodationSupplier.java`
- IdClass: `booking/entity/AccommodationSupplierId.java`
- DTO: `booking/dto/AccommodationSupplierDto.java`
- Mapper: `booking/mapper/AccommodationSupplierMapper.java`
- Service: `booking/service/AccommodationSupplierService.java`
- ServiceImpl: `booking/service/impl/AccommodationSupplierServiceImpl.java`
- Repository: `booking/repository/AccommodationSupplierRepository.java`
- Controller: `booking/controller/AccommodationSupplierController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/accommodation-supplier.model.ts`
- Service: `frontend-employee/src/app/features/accommodations/accommodation-supplier.service.ts`
- Components:
  - `frontend-employee/src/app/features/accommodations/accommodation-list.component.ts`
  - `frontend-employee/src/app/features/accommodations/accommodation-detail.component.ts`

---

### supplier_address *(koppeltabel)*

Koppeling Supplier ↔ Address.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| supplier_id | UUID | PK (composite), FK → supplier, NOT NULL | |
| address_id | UUID | PK (composite), FK → address, NOT NULL | |

**Backend bestanden:**
- Entity: `booking/entity/SupplierAddress.java`
- IdClass: `booking/entity/SupplierAddressId.java`
- DTO: `booking/dto/SupplierAddressDto.java`
- Mapper: `booking/mapper/SupplierAddressMapper.java`
- Service: `booking/service/SupplierAddressService.java`
- ServiceImpl: `booking/service/impl/SupplierAddressServiceImpl.java`
- Repository: `booking/repository/SupplierAddressRepository.java`
- Controller: `booking/controller/SupplierAddressController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/supplier-address.model.ts`
- Service: `frontend-employee/src/app/features/accommodations/supplier-address.service.ts`
- Components:
  - `frontend-employee/src/app/features/accommodations/accommodation-list.component.ts`
  - `frontend-employee/src/app/features/accommodations/accommodation-detail.component.ts`

---

### booking_mollie_payment *(koppeltabel)*

Koppeling Booking ↔ MolliePayment.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booking_id | UUID | PK (composite), FK → booking, NOT NULL | |
| mollie_payment_id | UUID | PK (composite), FK → mollie_payment, NOT NULL | |

**Backend bestanden:**
- Entity: `booking/entity/BookingMolliePayment.java`
- IdClass: `booking/entity/BookingMolliePaymentId.java`
- DTO: `booking/dto/BookingMolliePaymentDto.java`
- Mapper: `booking/mapper/BookingMolliePaymentMapper.java`
- Service: `booking/service/BookingMolliePaymentService.java`
- ServiceImpl: `booking/service/impl/BookingMolliePaymentServiceImpl.java`
- Repository: `booking/repository/BookingMolliePaymentRepository.java`
- Controller: `booking/controller/BookingMolliePaymentController.java`

**Frontend bestanden:** *Geen frontend model*

---

## Mollie Module

### mollie_payment

Mollie-betaling. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| mollie_payment_id | UUID | PK, auto-generated | |
| mollie_payment_external_id | VARCHAR | | Mollie extern ID |
| status | VARCHAR | NOT NULL, enum MolliePaymentStatus | Betalingsstatus |
| amount | DECIMAL | NOT NULL | Bedrag |
| currency | VARCHAR | NOT NULL | Valuta |
| method | VARCHAR | enum MolliePaymentMethod | Betaalmethode |
| description | VARCHAR | | Omschrijving |
| checkout_url | VARCHAR | | Checkout URL |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Enum MolliePaymentStatus:** `OPEN`, `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELED`, `EXPIRED`

**Enum MolliePaymentMethod:** `IDEAL`, `CREDITCARD`, `BANCONTACT`, `SOFORT`, `BANKTRANSFER`, `PAYPAL`, `BELFIUS`, `KBC`, `EPS`, `GIROPAY`, `PRZELEWY24`, `APPLEPAY`, `GOOGLEPAY`, `IN3`, `KLARNA`, `RIVERTY`

**Bijzonderheden:** Status wordt automatisch op `OPEN` gezet in `@PrePersist`. Heeft een extra constructor met expliciete `tenantOrganization` voor gebruik vanuit het booker portal (waar geen `TenantContext` beschikbaar is).

**Backend bestanden:**
- Entity: `mollie/entity/MolliePayment.java`
- Enums: `mollie/entity/MolliePaymentStatus.java`, `mollie/entity/MolliePaymentMethod.java`
- DTO: `mollie/dto/MolliePaymentDto.java`
- Mapper: `mollie/mapper/MolliePaymentMapper.java`
- Service: `mollie/service/MollieService.java`
- ServiceImpl: `mollie/service/impl/MollieServiceImpl.java`
- Repository: `mollie/repository/MolliePaymentRepository.java`
- Controller: `mollie/controller/MolliePaymentController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/mollie-payment.model.ts`
- Model: `frontend-booker/src/app/shared/models/mollie-payment.model.ts`
- Service: `frontend-employee/src/app/features/mollie/mollie-payment.service.ts`
- Service: `frontend-booker/src/app/features/payments/payment.service.ts`
- Components:
  - `frontend-employee/src/app/features/mollie/mollie-payments.component.ts` (betalingslijst)
  - `frontend-booker/src/app/features/payments/payments.component.ts` (booker portal)

---

### mollie_payment_status_entry

Statushistorie van een Mollie-betaling. Geen tenant-filtering (gekoppeld via MolliePayment). **Alleen-toevoegen:** een regel wordt nooit gewijzigd, vervangen of verwijderd (triggers weigeren elke `UPDATE`, `DELETE` en `TRUNCATE`; V10, V11; dezelfde `DELETE`/`TRUNCATE`-triggers staan op `mollie_payment`); een handmatige correctie door een medewerker is altijd een nieuwe regel met `correction = true` en een verplichte `reason` (V10).

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| mollie_payment_status_entry_id | UUID | PK, auto-generated | |
| mollie_payment_id | UUID | FK → mollie_payment, NOT NULL | Betaling |
| status | VARCHAR | NOT NULL, CHECK `payment_status_entry_status_check`, enum MolliePaymentStatus | Status |
| correction | BOOLEAN | NOT NULL, default false, immutable | true = handmatige correctie door een medewerker; false = Mollie, het systeem of de boeker |
| reason | TEXT | immutable; verplicht (≥ 5 tekens) als `correction` | Reden van de correctie (CHECK `payment_status_entry_correction_reason_check`) |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | Account van de medewerker (correctie), boeker (portal) of leeg (Mollie/systeem) |
| modified_at | TIMESTAMP | | ongebruikt (regels worden niet gewijzigd) |
| modified_by | UUID | | ongebruikt |

**Relaties:** ManyToOne → MolliePayment

**Backend bestanden:**
- Entity: `mollie/entity/MolliePaymentStatusEntry.java`
- DTO: `mollie/dto/MolliePaymentStatusEntryDto.java`
- Service: `mollie/service/MolliePaymentStatusEntryService.java`
- ServiceImpl: `mollie/service/impl/MolliePaymentStatusEntryServiceImpl.java`
- Repository: `mollie/repository/MolliePaymentStatusEntryRepository.java`
- Controller: `mollie/controller/MolliePaymentStatusEntryController.java`

**Frontend bestanden:**
- Model: onderdeel van `frontend-employee/src/app/shared/models/mollie-payment.model.ts`
- Component: `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (status-historie in expanded payment row)
- Booker portal: `frontend-booker/src/app/features/payments/payments.component.ts`

---

## Booker Portal Module

### otp

One-Time Password voor booker portal authenticatie. Geen tenant-filtering.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| otp_id | UUID | PK, auto-generated | |
| emailaddress | VARCHAR | NOT NULL | E-mailadres |
| booking_number | VARCHAR | NOT NULL | Boekingnummer |
| code | VARCHAR | NOT NULL | OTP code |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| expires_at | TIMESTAMP | NOT NULL | Verloopt op |
| verified | BOOLEAN | NOT NULL | Geverifieerd |

**Backend bestanden:**
- Entity: `bookerportal/entity/Otp.java`
- DTO: `bookerportal/dto/OtpRequestDto.java`, `bookerportal/dto/OtpVerifyDto.java`
- Service: `bookerportal/service/BookerAuthService.java`, `bookerportal/service/OtpEmailService.java`
- Repository: `bookerportal/repository/OtpRepository.java`
- Controller: `bookerportal/controller/BookerAuthController.java`

**Frontend bestanden:**
- Components:
  - `frontend-booker/src/app/features/otp-login/request-otp.component.ts`
  - `frontend-booker/src/app/features/otp-login/verify-otp.component.ts`

---

## E-mail Module

### email_template

E-mailtemplate (onderwerp + HTML-body), per organisatie. FreeMarker-placeholders `${prospect.*}` en `${booking.*}` (zie [email.md](email.md), [templates.md](templates.md)). Multi-tenant. Migratie V5.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| email_template_id | UUID | PK | |
| name | VARCHAR(255) | NOT NULL | |
| description | VARCHAR(255) | | |
| subject | VARCHAR(255) | NOT NULL | platte tekst, mag placeholders bevatten |
| body_html | TEXT | | HTML uit de WYSIWYG-editor (afbeeldingen als relatief pad `/api/public/email-images/{uuid}`) |
| tenant_organization, created_*, modified_* | | | zoals overal |

**Bestanden:** `email/entity/EmailTemplate.java`, `email/service/EmailTemplateService(+impl)`, `email/service/EmailRenderService(+impl)`, `email/service/EmailSendService(+impl)`, `email/controller/EmailTemplateController.java`; frontend `features/email-templates/*`.

---

### email_image

Afbeelding voor templates (e-mail **en** Word-templates; de naam is historisch). Bytes in de database; een afbeelding is onveranderlijk (nieuwe versie = nieuwe rij). Migratie V7.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| email_image_id | UUID | PK | tevens de onraadbare sleutel in de publieke URL |
| original_filename | VARCHAR(255) | | alleen informatief |
| content_type | VARCHAR(100) | NOT NULL | uit de **bytes** bepaald (PNG, JPEG, GIF, WebP) |
| size_bytes | BIGINT | NOT NULL | maximaal 2 MB |
| data | BYTEA | NOT NULL | |
| tenant_organization | UUID | NOT NULL, index | herkomst/opruimen; niet gebruikt bij publiek uitleveren |
| created_at / created_by | | | audit |

**Bestanden:** `email/entity/EmailImage.java`, `email/service/EmailImageService(+impl)`, `ImageTypes`, `EmailImageUrlResolver`, `TemplateImages`; `email/controller/EmailImageController.java` (beheer) en `PublicEmailImageController.java` (publiek, GET); frontend `shared/template-editor/*`.

---

## Enums Overzicht

| Enum | Waarden | Gebruikt in |
|------|---------|-------------|
| BookingStatus | AANVRAAG, OFFERTE, BOEKING, VOORSCHOT, BETAALD, OPREIS, WEERTHUIS, AFGEROND | booking.booking_status |
| Gender | MAN, VROUW, ANDERS | booker.gender, traveler.gender |
| BookerStatus | PROSPECT, ACTIVE | booker.status |
| AddressRole | WOON, FACTUUR, ACCOMMODATIE, LEVERANCIER | address.addressrole |
| ActivityType | TOUR, EXCURSIE, TICKET, TRANSFER | activity.activity_type |
| MolliePaymentStatus | OPEN, PENDING, AUTHORIZED, PAID, FAILED, CANCELED, EXPIRED | mollie_payment.status, mollie_payment_status_entry.status |
| MolliePaymentMethod | IDEAL, CREDITCARD, BANCONTACT, SOFORT, BANKTRANSFER, PAYPAL, BELFIUS, KBC, EPS, GIROPAY, PRZELEWY24, APPLEPAY, GOOGLEPAY, IN3, KLARNA, RIVERTY | mollie_payment.method |

Alle enums worden als `STRING` (naam in hoofdletters) opgeslagen en serialiseren naar lowercase in JSON (`@JsonValue toValue()`); invoer wordt hoofdletterongevoelig geparsed (`EnumValues.parse`). In het template-model voor documenten en e-mail is een enum de hoofdletter-naam.

---

## Relatiediagram (tekstueel)

```
Organization ──< Person ──< Account ──< AccountRole >── Role ──< RoleAuthority >── Authority

Booking ──< Traveler
Booking ── Booker
Booking ──< Document
Booking ──< BookingLine >── Accommodation
                        >── Supplier
Booking ──< BookingActivity >── Activity
Booking ──< BookingMolliePayment >── MolliePayment ──< MolliePaymentStatusEntry

Booker  ──< BookerAddress  >── Address
Accommodation ──< AccommodationAddress >── Address
Accommodation ──< AccommodationSupplier >── Supplier
Supplier ──< SupplierAddress >── Address

Organization ── OrganizationTheme (1:1)
DocumentTemplate (standalone, multi-tenant; optioneel source_html voor de editor)
EmailTemplate (standalone, multi-tenant)
EmailImage (standalone, multi-tenant; verwezen vanuit HTML als pad, geen FK)
Otp (standalone, geen tenant: booker-portal-login)
```

Legenda: `──<` = one-to-many, `──` = one-to-one, `>──` = many-to-one
