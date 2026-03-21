package nl.puurkroatie.rds.booking.controller;

import nl.puurkroatie.rds.common.controller.AbstractControllerTest;

import java.util.UUID;

public abstract class AbstractBookingControllerTest extends AbstractControllerTest {

    // Booking UUIDs uit data.sql (Puurkroatie: 001-003, TechPartner: 004-006)
    protected static final UUID BOOKING_PK_1 = UUID.fromString("01000000-0000-0000-0000-000000000001");
    protected static final UUID BOOKING_PK_2 = UUID.fromString("01000000-0000-0000-0000-000000000002");
    protected static final UUID BOOKING_TP_4 = UUID.fromString("01000000-0000-0000-0000-000000000004");

    // Booker UUIDs uit data.sql (Puurkroatie: 001-003, TechPartner: 004-006)
    protected static final UUID BOOKER_PK_1 = UUID.fromString("02000000-0000-0000-0000-000000000001");
    protected static final UUID BOOKER_TP_4 = UUID.fromString("02000000-0000-0000-0000-000000000004");

    // Traveler UUIDs uit data.sql (Puurkroatie: 001-004, TechPartner: 005-008)
    protected static final UUID TRAVELER_PK_1 = UUID.fromString("03000000-0000-0000-0000-000000000001");
    protected static final UUID TRAVELER_TP_5 = UUID.fromString("03000000-0000-0000-0000-000000000005");

    // Accommodation UUIDs uit data.sql (Puurkroatie: 001-003, TechPartner: 004-006)
    protected static final UUID ACCOMMODATION_PK_1 = UUID.fromString("04000000-0000-0000-0000-000000000001");
    protected static final UUID ACCOMMODATION_TP_4 = UUID.fromString("04000000-0000-0000-0000-000000000004");

    // Supplier UUIDs uit data.sql (Puurkroatie: 001-002, TechPartner: 003-004)
    protected static final UUID SUPPLIER_PK_1 = UUID.fromString("05000000-0000-0000-0000-000000000001");
    protected static final UUID SUPPLIER_TP_3 = UUID.fromString("05000000-0000-0000-0000-000000000003");

    // Address UUIDs uit data.sql (Puurkroatie: 001-004,008-010,014-015; TechPartner: 005-007,011-013,016-017)
    protected static final UUID ADDRESS_PK_1 = UUID.fromString("06000000-0000-0000-0000-000000000001");
    protected static final UUID ADDRESS_PK_8 = UUID.fromString("06000000-0000-0000-0000-000000000008");
    protected static final UUID ADDRESS_TP_5 = UUID.fromString("06000000-0000-0000-0000-000000000005");
    protected static final UUID ADDRESS_TP_11 = UUID.fromString("06000000-0000-0000-0000-000000000011");

    // Document UUIDs uit data.sql (Puurkroatie: 001-003, TechPartner: 004-005)
    protected static final UUID DOCUMENT_PK_1 = UUID.fromString("07000000-0000-0000-0000-000000000001");
    protected static final UUID DOCUMENT_TP_4 = UUID.fromString("07000000-0000-0000-0000-000000000004");

    // Category UUIDs uit data.sql
    protected static final UUID BOOKING_STATUS_CONCEPT = UUID.fromString("f1000000-0000-0000-0000-000000000001");
    protected static final UUID GENDER_MAN = UUID.fromString("f2000000-0000-0000-0000-000000000001");
    protected static final UUID ADDRESSROLE_WOON = UUID.fromString("f3000000-0000-0000-0000-000000000001");
}
