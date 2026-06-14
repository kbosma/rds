-- V1: Initial schema - all tables in dependency order
-- Generated from JPA entities

-- =============================================
-- AUTH TABLES
-- =============================================

CREATE TABLE organization (
    organization_id UUID PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    mollie_key      VARCHAR(255),
    created_at      TIMESTAMP    NOT NULL,
    created_by      UUID,
    modified_at     TIMESTAMP,
    modified_by     UUID
);

CREATE TABLE person (
    person_id       UUID PRIMARY KEY,
    firstname       VARCHAR(255),
    prefix          VARCHAR(255),
    lastname        VARCHAR(255),
    organization_id UUID         NOT NULL REFERENCES organization(organization_id) ON DELETE CASCADE,
    created_at      TIMESTAMP    NOT NULL,
    created_by      UUID,
    modified_at     TIMESTAMP,
    modified_by     UUID
);

CREATE TABLE account (
    account_id           UUID PRIMARY KEY,
    user_name            VARCHAR(255) NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    person_id            UUID         NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
    locked               BOOLEAN      NOT NULL DEFAULT FALSE,
    must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
    totp_secret          VARCHAR(255),
    totp_enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
    totp_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
    recovery_codes       TEXT,
    expires_at           TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL,
    created_by           UUID,
    modified_at          TIMESTAMP,
    modified_by          UUID
);

CREATE TABLE role (
    role_id     UUID PRIMARY KEY,
    description VARCHAR(255) NOT NULL
);

CREATE TABLE authority (
    authority_id UUID PRIMARY KEY,
    description  VARCHAR(255) NOT NULL
);

CREATE TABLE account_role (
    account_id  UUID      NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    role_id     UUID      NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL,
    created_by  UUID,
    modified_at TIMESTAMP,
    modified_by UUID,
    PRIMARY KEY (account_id, role_id)
);

CREATE TABLE role_authority (
    role_id      UUID NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
    authority_id UUID NOT NULL REFERENCES authority(authority_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, authority_id)
);

CREATE TABLE organization_theme (
    organization_theme_id UUID PRIMARY KEY,
    organization_id       UUID         NOT NULL UNIQUE REFERENCES organization(organization_id) ON DELETE CASCADE,
    primary_color         VARCHAR(7)   NOT NULL,
    accent_color          VARCHAR(7)   NOT NULL,
    logo_url              VARCHAR(500),
    card_title_color      VARCHAR(7),
    created_at            TIMESTAMP    NOT NULL,
    created_by            UUID,
    modified_at           TIMESTAMP,
    modified_by           UUID
);

-- =============================================
-- BOOKING TABLES
-- =============================================

CREATE TABLE address (
    address_id            UUID PRIMARY KEY,
    street                VARCHAR(255),
    housenumber           INTEGER,
    housenumber_addition  VARCHAR(255),
    postalcode            VARCHAR(255),
    city                  VARCHAR(255),
    country               VARCHAR(255),
    addressrole           VARCHAR(255) NOT NULL,
    created_at            TIMESTAMP    NOT NULL,
    created_by            UUID,
    modified_at           TIMESTAMP,
    modified_by           UUID,
    tenant_organization   UUID         NOT NULL
);

CREATE TABLE supplier (
    supplier_id         UUID PRIMARY KEY,
    key                 VARCHAR(255) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE supplier_address (
    supplier_id UUID NOT NULL REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    address_id  UUID NOT NULL REFERENCES address(address_id) ON DELETE CASCADE,
    PRIMARY KEY (supplier_id, address_id)
);

CREATE TABLE accommodation (
    accommodation_id    UUID PRIMARY KEY,
    key                 VARCHAR(255) NOT NULL,
    name                VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE accommodation_address (
    accommodation_id UUID NOT NULL REFERENCES accommodation(accommodation_id) ON DELETE CASCADE,
    address_id       UUID NOT NULL REFERENCES address(address_id) ON DELETE CASCADE,
    PRIMARY KEY (accommodation_id, address_id)
);

CREATE TABLE accommodation_supplier (
    accommodation_id UUID NOT NULL REFERENCES accommodation(accommodation_id) ON DELETE CASCADE,
    supplier_id      UUID NOT NULL REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    PRIMARY KEY (accommodation_id, supplier_id)
);

CREATE TABLE activity (
    activity_id         UUID PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    description         VARCHAR(255),
    activity_type       VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE booker (
    booker_id           UUID PRIMARY KEY,
    firstname           VARCHAR(255),
    prefix              VARCHAR(255),
    lastname            VARCHAR(255),
    callsign            VARCHAR(255),
    telephone           VARCHAR(255),
    emailaddress        VARCHAR(255),
    gender              VARCHAR(255),
    birthdate           DATE,
    initials            VARCHAR(255),
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE booker_address (
    booker_id  UUID NOT NULL REFERENCES booker(booker_id) ON DELETE CASCADE,
    address_id UUID NOT NULL REFERENCES address(address_id) ON DELETE CASCADE,
    PRIMARY KEY (booker_id, address_id)
);

CREATE TABLE booking (
    booking_id          UUID PRIMARY KEY,
    booker_id           UUID REFERENCES booker(booker_id) ON DELETE CASCADE,
    booking_number      VARCHAR(255) NOT NULL,
    booking_status      VARCHAR(255) NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE booking_line (
    booking_line_id     UUID PRIMARY KEY,
    booking_id          UUID         NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    accommodation_id    UUID         NOT NULL REFERENCES accommodation(accommodation_id) ON DELETE CASCADE,
    supplier_id         UUID         NOT NULL REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    from_date           DATE,
    until_date          DATE,
    price               NUMERIC,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE booking_activity (
    booking_activity_id UUID PRIMARY KEY,
    booking_id          UUID         NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    activity_id         UUID         NOT NULL REFERENCES activity(activity_id) ON DELETE CASCADE,
    from_date           TIMESTAMP,
    until_date          TIMESTAMP,
    meeting_point       VARCHAR(255),
    total_price         NUMERIC,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE traveler (
    traveler_id         UUID PRIMARY KEY,
    booking_id          UUID         NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    firstname           VARCHAR(255),
    prefix              VARCHAR(255),
    lastname            VARCHAR(255),
    gender              VARCHAR(255),
    birthdate           DATE,
    initials            VARCHAR(255),
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

CREATE TABLE document_template (
    document_template_id UUID PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    description          VARCHAR(255),
    template_data        BYTEA,
    created_at           TIMESTAMP    NOT NULL,
    created_by           UUID,
    modified_at          TIMESTAMP,
    modified_by          UUID,
    tenant_organization  UUID         NOT NULL
);

CREATE TABLE document (
    document_id         UUID PRIMARY KEY,
    booking_id          UUID         NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    displayname         VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(255),
    document            BYTEA,
    created_at          TIMESTAMP    NOT NULL,
    created_by          UUID,
    modified_at         TIMESTAMP,
    modified_by         UUID,
    tenant_organization UUID         NOT NULL
);

-- =============================================
-- MOLLIE PAYMENT TABLES
-- =============================================

CREATE TABLE mollie_payment (
    mollie_payment_id          UUID PRIMARY KEY,
    mollie_payment_external_id VARCHAR(255),
    amount                     NUMERIC      NOT NULL,
    currency                   VARCHAR(255) NOT NULL,
    method                     VARCHAR(255),
    description                VARCHAR(255),
    checkout_url               VARCHAR(255),
    created_at                 TIMESTAMP    NOT NULL,
    created_by                 UUID,
    modified_at                TIMESTAMP,
    modified_by                UUID,
    tenant_organization        UUID         NOT NULL
);

CREATE TABLE mollie_payment_status_entry (
    mollie_payment_status_entry_id UUID PRIMARY KEY,
    mollie_payment_id              UUID         NOT NULL REFERENCES mollie_payment(mollie_payment_id) ON DELETE CASCADE,
    status                         VARCHAR(255) NOT NULL,
    created_at                     TIMESTAMP    NOT NULL,
    created_by                     UUID,
    modified_at                    TIMESTAMP,
    modified_by                    UUID
);

CREATE TABLE booking_mollie_payment (
    booking_id        UUID NOT NULL REFERENCES booking(booking_id) ON DELETE CASCADE,
    mollie_payment_id UUID NOT NULL REFERENCES mollie_payment(mollie_payment_id) ON DELETE CASCADE,
    PRIMARY KEY (booking_id, mollie_payment_id)
);

-- =============================================
-- BOOKER PORTAL TABLES
-- =============================================

CREATE TABLE otp (
    otp_id         UUID PRIMARY KEY,
    emailaddress   VARCHAR(255) NOT NULL,
    booking_number VARCHAR(255) NOT NULL,
    code           VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP    NOT NULL,
    expires_at     TIMESTAMP    NOT NULL,
    verified       BOOLEAN      NOT NULL
);
