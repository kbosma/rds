# Database Model

Dit document beschrijft het volledige databasemodel per tabel/entiteit.
Gebruik dit als referentie bij het aanvragen van database-wijzigingen die doorgevoerd moeten worden in alle lagen (Entity, DTO, Mapper, Service, Repository, Controller en frontend).

---

## Conventies

- **Primary keys**: UUID, auto-gegenereerd (`@GeneratedValue(strategy = GenerationType.UUID)`)
- **Naamgeving**: snake_case in database, camelCase in Java
- **Multi-tenancy**: Entiteiten met `tenant_organization` kolom worden gefilterd op organisatie via `TenantContext`
- **Audit fields**: `created_at`, `created_by`, `modified_at`, `modified_by` — automatisch gezet via `@PrePersist`/`@PreUpdate`
- **Enums**: Opgeslagen als `STRING` (`@Enumerated(EnumType.STRING)`), JSON-serialisatie in lowercase via `@JsonValue`/`@JsonCreator`
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
| mollie_key | VARCHAR | | Mollie API key |
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
- Component: `frontend-employee/src/app/features/admin/organization-list.component.ts` *(placeholder)*

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

Gebruikersaccount met login-gegevens.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| account_id | UUID | PK, auto-generated | |
| user_name | VARCHAR | NOT NULL | Gebruikersnaam |
| password_hash | VARCHAR | NOT NULL | BCrypt hash |
| person_id | UUID | FK → person, NOT NULL | Gekoppelde persoon |
| locked | BOOLEAN | NOT NULL | Account vergrendeld |
| must_change_password | BOOLEAN | NOT NULL | Wachtwoord wijzigen verplicht |
| expires_at | TIMESTAMP | | Verloopt op |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:** ManyToOne → Person

**Bijzonderheden:** `password` is een `@Transient` veld dat automatisch gehashed wordt via BCryptPasswordEncoder in `@PrePersist`/`@PreUpdate`.

**Backend bestanden:**
- Entity: `auth/entity/Account.java`
- DTO: `auth/dto/AccountDto.java`
- Mapper: `auth/mapper/AccountMapper.java`
- Service: `auth/service/AccountService.java`
- ServiceImpl: `auth/service/impl/AccountServiceImpl.java`
- Repository: `auth/repository/AccountRepository.java`
- Controller: `auth/controller/AccountController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/account.model.ts`
- Service: `frontend-employee/src/app/features/admin/account.service.ts`
- Component: `frontend-employee/src/app/features/admin/account-list.component.ts`

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
| booking_status | VARCHAR | NOT NULL, enum BookingStatus | Status |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |

**Berekende velden (niet in database, `@Transient`):**
- `fromDate` (LocalDate) — kleinste `fromDate` van alle gekoppelde BookingLines
- `untilDate` (LocalDate) — grootste `untilDate` van alle gekoppelde BookingLines
- `totalSum` (BigDecimal) — som van alle gekoppelde `BookingLine.price` waarden
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Relaties:**
- OneToOne → Booker (optional)
- OneToMany ← Traveler (mappedBy="booking")
- OneToMany ← BookingLine (mappedBy="booking")

**Enum BookingStatus:** `AANVRAAG`, `OFFERTE`, `BOEKING`, `VOORSCHOT`, `BETAALD`, `AFGEROND`

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
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Enum Gender:** `MAN`, `VROUW`, `ANDERS`

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
  - `frontend-employee/src/app/features/accommodations/accommodation-detail-dialog.component.ts` (detail-dialog)

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
  - `frontend-employee/src/app/features/accommodations/accommodation-detail-dialog.component.ts` (leverancier-details)

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
  - `frontend-employee/src/app/features/accommodations/accommodation-detail-dialog.component.ts`

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
- Component: `frontend-employee/src/app/features/documents/document-list.component.ts` *(placeholder)*
- Booker portal: `frontend-booker/src/app/features/documents/documents.component.ts`

---

### booking_line *(koppeltabel met data)*

Boekingsregel: koppeling Booking ↔ Accommodation ↔ Supplier met extra velden. Multi-tenant.

| Kolom | Type | Constraints | Omschrijving |
|-------|------|-------------|--------------|
| booking_id | UUID | PK (composite), FK → booking, NOT NULL | |
| accommodation_id | UUID | PK (composite), FK → accommodation, NOT NULL | |
| supplier_id | UUID | PK (composite), FK → supplier, NOT NULL | |
| from_date | DATE | | Startdatum |
| until_date | DATE | | Einddatum |
| price | DECIMAL | | Prijs |
| tenant_organization | UUID | NOT NULL, immutable | Tenant |
| created_at | TIMESTAMP | NOT NULL, immutable | |
| created_by | UUID | immutable | |
| modified_at | TIMESTAMP | | |
| modified_by | UUID | | |

**Backend bestanden:**
- Entity: `booking/entity/BookingLine.java`
- IdClass: `booking/entity/BookingLineId.java`
- DTO: `booking/dto/BookingLineDto.java`
- Mapper: `booking/mapper/BookingLineMapper.java`
- Service: `booking/service/BookingLineService.java`
- ServiceImpl: `booking/service/impl/BookingLineServiceImpl.java`
- Repository: `booking/repository/BookingLineRepository.java`
- Controller: `booking/controller/BookingLineController.java`

**Frontend bestanden:**
- Model: `frontend-employee/src/app/shared/models/booking-line.model.ts`
- Service: `frontend-employee/src/app/features/bookings/booking-line.service.ts`
- Component: `frontend-employee/src/app/features/bookings/booking-detail.component.ts` (boekingsregels)

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
  - `frontend-employee/src/app/features/accommodations/accommodation-detail-dialog.component.ts`

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
  - `frontend-employee/src/app/features/accommodations/accommodation-detail-dialog.component.ts`

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
  - `frontend-employee/src/app/features/accommodations/accommodation-detail-dialog.component.ts`

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

## Enums Overzicht

| Enum | Waarden | Gebruikt in |
|------|---------|-------------|
| BookingStatus | AANVRAAG, OFFERTE, BOEKING, VOORSCHOT, BETAALD, AFGEROND | booking.booking_status |
| Gender | MAN, VROUW, ANDERS | booker.gender, traveler.gender |
| AddressRole | WOON, FACTUUR, ACCOMMODATIE, LEVERANCIER | address.addressrole |
| MolliePaymentStatus | OPEN, PENDING, AUTHORIZED, PAID, FAILED, CANCELED, EXPIRED | mollie_payment.status |
| MolliePaymentMethod | IDEAL, CREDITCARD, BANCONTACT, SOFORT, BANKTRANSFER, PAYPAL, BELFIUS, KBC, EPS, GIROPAY, PRZELEWY24, APPLEPAY, GOOGLEPAY, IN3, KLARNA, RIVERTY | mollie_payment.method |

Alle enums worden als `STRING` opgeslagen in de database en serialiseren naar lowercase in JSON.

---

## Relatiediagram (tekstueel)

```
Organization ──< Person ──< Account ──< AccountRole >── Role ──< RoleAuthority >── Authority

Booking ──< Traveler
Booking ── Booker
Booking ──< Document
Booking ──< BookingLine >── Accommodation
                        >── Supplier
Booking ──< BookingMolliePayment >── MolliePayment

Booker  ──< BookerAddress  >── Address
Accommodation ──< AccommodationAddress >── Address
Accommodation ──< AccommodationSupplier >── Supplier
Supplier ──< SupplierAddress >── Address
```

Legenda: `──<` = one-to-many, `──` = one-to-one, `>──` = many-to-one
