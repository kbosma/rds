# Domain

## Overzicht

SAAS boekingssysteem per ORGANIZATION.

---

## Kernconcepten

- BOOKING
- BOOKER (hoofdboeker)
- TRAVELLER
- ACCOMMODATION
- SUPPLIER

---

## Belangrijke regels

- Elke booking entity bevat tenantOrganization
- Audit velden:
    - createdAt
    - createdBy
    - modifiedAt
    - modifiedBy

---

## Booking lifecycle

- AANVRAAG
- OFFERTE
- BOEKING
- VOORSCHOT
- BETAALD
- AFGEROND

---

## Autorisatie

- ADMIN → alles
- MANAGER → eigen org
- EMPLOYEE → eigen org

---

## Datamodel (samenvatting)

Relaties:

ORGANIZATION → PERSON → ACCOUNT → ROLE → AUTHORITY

Booking structuur:
- BOOKING
- BOOKER
- TRAVELLER
- BOOKINGLINE
- ADDRESS
