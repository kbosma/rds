package nl.puurkroatie.rds.docgen.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.repository.AccommodationAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.SupplierAddressRepository;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Het gedeelde model voor documenten én e-mails: tenant-controle en het opbouwen van het context-object.
 */
@ExtendWith(MockitoExtension.class)
class BookingContextServiceImplTest {

    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID OTHER_ORG = UUID.fromString("a2000000-0000-0000-0000-000000000002");
    private static final UUID BOOKER_ID = UUID.randomUUID();
    private static final UUID BOOKING_ID = UUID.randomUUID();

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private BookerRepository bookerRepository;
    @Mock
    private BookerAddressRepository bookerAddressRepository;
    @Mock
    private AccommodationAddressRepository accommodationAddressRepository;
    @Mock
    private SupplierAddressRepository supplierAddressRepository;

    private BookingContextServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new BookingContextServiceImpl(bookingRepository, bookerRepository, bookerAddressRepository,
                accommodationAddressRepository, supplierAddressRepository);
        TenantContext.setOrganizationId(ORG);
        TenantContext.setRoles(Set.of("MANAGER"));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private Booker booker(UUID organization) {
        return new Booker(BOOKER_ID, "Jan", "de", "Vries", "cs", "06", "jan@x.nl",
                null, java.time.LocalDate.of(1990, 5, 17), "J.", BookerStatus.PROSPECT, null, null, organization);
    }

    private Booking booking(UUID organization) {
        Booking booking = mock(Booking.class);
        when(booking.getTenantOrganization()).thenReturn(organization);
        return booking;
    }

    // ----- forBooker -----

    @Test
    void forBooker_mapsTheBookerWithAddresses() {
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker(ORG)));
        when(bookerAddressRepository.findByBookerBookerId(BOOKER_ID)).thenReturn(List.of());

        BookerContext context = service.forBooker(BOOKER_ID);

        assertEquals("Jan", context.getFirstname());
        assertEquals("de", context.getPrefix());
        assertEquals("Vries", context.getLastname());
        assertEquals("jan@x.nl", context.getEmailaddress());
        assertEquals("Jan de Vries", context.getFullName());
        assertNull(context.getGender());
        assertTrue(context.getAddresses().isEmpty());
    }

    @Test
    void forBooker_ofAnotherOrganisation_isDenied_andNothingIsLoadedFurther() {
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker(OTHER_ORG)));

        assertThrows(AccessDeniedException.class, () -> service.forBooker(BOOKER_ID));

        verifyNoInteractions(bookerAddressRepository);
    }

    @Test
    void forBooker_admin_mayReadAnyOrganisation() {
        TenantContext.setRoles(Set.of("ADMIN"));
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker(OTHER_ORG)));
        when(bookerAddressRepository.findByBookerBookerId(BOOKER_ID)).thenReturn(List.of());

        assertEquals("Jan", service.forBooker(BOOKER_ID).getFirstname());
    }

    @Test
    void forBooker_unknownId_failsFast() {
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.forBooker(BOOKER_ID));

        assertTrue(ex.getMessage().contains(BOOKER_ID.toString()), ex.getMessage());
    }

    // ----- forBooking -----

    @Test
    void forBooking_ofAnotherOrganisation_isDenied_beforeTheOtherQueriesRun() {
        Booking booking = booking(OTHER_ORG);
        when(bookingRepository.findByIdWithBookerAndTravelers(BOOKING_ID)).thenReturn(Optional.of(booking));

        assertThrows(AccessDeniedException.class, () -> service.forBooking(BOOKING_ID));
    }

    @Test
    void forBooking_unknownId_failsFast() {
        when(bookingRepository.findByIdWithBookerAndTravelers(BOOKING_ID)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> service.forBooking(BOOKING_ID));

        assertTrue(ex.getMessage().contains(BOOKING_ID.toString()), ex.getMessage());
    }

    @Test
    void forBooking_buildsTheContextWithBookerTravelersLinesAndActivities() {
        Booker booker = booker(ORG);
        Booking booking = mock(Booking.class);
        when(booking.getTenantOrganization()).thenReturn(ORG);
        when(booking.getBooker()).thenReturn(booker);
        when(booking.getTravelers()).thenReturn(List.of());
        when(booking.getBookingLines()).thenReturn(List.of());
        when(booking.getBookingActivities()).thenReturn(List.of());
        when(booking.getBookingNumber()).thenReturn("B-2026-0042");
        when(booking.getBookingStatus()).thenReturn(BookingStatus.BOEKING);
        when(bookingRepository.findByIdWithBookerAndTravelers(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.findByIdWithBookingLines(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookingRepository.findByIdWithBookingActivities(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(bookerAddressRepository.findByBookerBookerId(BOOKER_ID)).thenReturn(List.of());

        BookingContext context = service.forBooking(BOOKING_ID);

        assertEquals("B-2026-0042", context.getBookingNumber());
        assertEquals("BOEKING", context.getBookingStatus());
        assertEquals("Jan", context.getBooker().getFirstname());
        assertTrue(context.getTravelers().isEmpty());
        assertTrue(context.getBookingLines().isEmpty());
        assertTrue(context.getBookingActivities().isEmpty());
    }
}
