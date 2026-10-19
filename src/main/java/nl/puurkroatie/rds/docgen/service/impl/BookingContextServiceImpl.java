package nl.puurkroatie.rds.docgen.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.AccommodationAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerAddressRepository;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.SupplierAddressRepository;
import nl.puurkroatie.rds.docgen.context.AccommodationContext;
import nl.puurkroatie.rds.docgen.context.AddressContext;
import nl.puurkroatie.rds.docgen.context.BookerContext;
import nl.puurkroatie.rds.docgen.context.BookingActivityContext;
import nl.puurkroatie.rds.docgen.context.BookingContext;
import nl.puurkroatie.rds.docgen.context.BookingLineContext;
import nl.puurkroatie.rds.docgen.context.SupplierContext;
import nl.puurkroatie.rds.docgen.context.TravelerContext;
import nl.puurkroatie.rds.docgen.service.BookingContextService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class BookingContextServiceImpl implements BookingContextService {

    private final BookingRepository bookingRepository;
    private final BookerRepository bookerRepository;
    private final BookerAddressRepository bookerAddressRepository;
    private final AccommodationAddressRepository accommodationAddressRepository;
    private final SupplierAddressRepository supplierAddressRepository;

    public BookingContextServiceImpl(BookingRepository bookingRepository,
                                     BookerRepository bookerRepository,
                                     BookerAddressRepository bookerAddressRepository,
                                     AccommodationAddressRepository accommodationAddressRepository,
                                     SupplierAddressRepository supplierAddressRepository) {
        this.bookingRepository = bookingRepository;
        this.bookerRepository = bookerRepository;
        this.bookerAddressRepository = bookerAddressRepository;
        this.accommodationAddressRepository = accommodationAddressRepository;
        this.supplierAddressRepository = supplierAddressRepository;
    }

    @Override
    public BookingContext forBooking(UUID bookingId) {
        Booking bookingWithBookerAndTravelers = bookingRepository.findByIdWithBookerAndTravelers(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        verifyOrganization(bookingWithBookerAndTravelers.getTenantOrganization());

        Booking bookingWithLines = bookingRepository.findByIdWithBookingLines(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        Booking bookingWithActivities = bookingRepository.findByIdWithBookingActivities(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        return buildBookingContext(bookingWithBookerAndTravelers, bookingWithLines, bookingWithActivities);
    }

    @Override
    public BookerContext forBooker(UUID bookerId) {
        Booker booker = bookerRepository.findById(bookerId)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + bookerId));
        verifyOrganization(booker.getTenantOrganization());
        return toBookerContext(booker);
    }

    private BookerContext toBookerContext(Booker booker) {
        List<AddressContext> addresses = bookerAddressRepository.findByBookerBookerId(booker.getBookerId()).stream()
                .map(ba -> toAddressContext(ba.getAddress()))
                .toList();
        return new BookerContext(
                booker.getFirstname(),
                booker.getPrefix(),
                booker.getLastname(),
                booker.getCallsign(),
                booker.getTelephone(),
                booker.getEmailaddress(),
                booker.getGender() != null ? booker.getGender().name() : null,
                booker.getBirthdate(),
                booker.getInitials(),
                addresses
        );
    }

    private BookingContext buildBookingContext(Booking bookingWithBookerAndTravelers, Booking bookingWithLines, Booking bookingWithActivities) {
        BookerContext bookerContext = bookingWithBookerAndTravelers.getBooker() != null
                ? toBookerContext(bookingWithBookerAndTravelers.getBooker())
                : null;

        List<TravelerContext> travelerContexts = bookingWithBookerAndTravelers.getTravelers().stream()
                .map(t -> new TravelerContext(
                        t.getFirstname(),
                        t.getPrefix(),
                        t.getLastname(),
                        t.getGender() != null ? t.getGender().name() : null,
                        t.getBirthdate(),
                        t.getInitials()
                ))
                .toList();

        List<UUID> accommodationIds = bookingWithLines.getBookingLines().stream()
                .map(bl -> bl.getAccommodation().getAccommodationId())
                .distinct()
                .toList();
        List<UUID> supplierIds = bookingWithLines.getBookingLines().stream()
                .map(bl -> bl.getSupplier().getSupplierId())
                .distinct()
                .toList();

        Map<UUID, List<AddressContext>> accommodationAddressMap = new HashMap<>();
        if (!accommodationIds.isEmpty()) {
            accommodationAddressRepository.findByAccommodationAccommodationIdIn(accommodationIds)
                    .forEach(aa -> accommodationAddressMap
                            .computeIfAbsent(aa.getAccommodation().getAccommodationId(), k -> new ArrayList<>())
                            .add(toAddressContext(aa.getAddress())));
        }

        Map<UUID, List<AddressContext>> supplierAddressMap = new HashMap<>();
        if (!supplierIds.isEmpty()) {
            supplierAddressRepository.findBySupplierSupplierIdIn(supplierIds)
                    .forEach(sa -> supplierAddressMap
                            .computeIfAbsent(sa.getSupplier().getSupplierId(), k -> new ArrayList<>())
                            .add(toAddressContext(sa.getAddress())));
        }

        List<BookingLineContext> bookingLineContexts = bookingWithLines.getBookingLines().stream()
                .map(bl -> {
                    var acc = bl.getAccommodation();
                    var sup = bl.getSupplier();
                    return new BookingLineContext(
                            bl.getFromDate(),
                            bl.getUntilDate(),
                            bl.getPrice(),
                            new AccommodationContext(
                                    acc.getKey(),
                                    acc.getName(),
                                    accommodationAddressMap.getOrDefault(acc.getAccommodationId(), List.of())
                            ),
                            new SupplierContext(
                                    sup.getKey(),
                                    sup.getName(),
                                    supplierAddressMap.getOrDefault(sup.getSupplierId(), List.of())
                            )
                    );
                })
                .toList();

        List<BookingActivityContext> bookingActivityContexts = bookingWithActivities.getBookingActivities().stream()
                .map(ba -> new BookingActivityContext(
                        ba.getActivity().getName(),
                        ba.getActivity().getActivityType() != null ? ba.getActivity().getActivityType().toValue() : null,
                        ba.getStartDateTime(),
                        ba.getEndDateTime(),
                        ba.getMeetingPoint(),
                        ba.getTotalPrice()
                ))
                .toList();

        return new BookingContext(
                bookingWithBookerAndTravelers.getBookingNumber(),
                bookingWithBookerAndTravelers.getBookingStatus() != null
                        ? bookingWithBookerAndTravelers.getBookingStatus().name() : null,
                bookingWithLines.getFromDate(),
                bookingWithLines.getUntilDate(),
                bookingWithLines.getTotalSum(),
                bookerContext,
                travelerContexts,
                bookingLineContexts,
                bookingActivityContexts
        );
    }

    private AddressContext toAddressContext(nl.puurkroatie.rds.booking.entity.Address address) {
        return new AddressContext(
                address.getStreet(),
                address.getHousenumber(),
                address.getHousenumberAddition(),
                address.getPostalcode(),
                address.getCity(),
                address.getCountry(),
                address.getAddressrole() != null ? address.getAddressrole().name() : null
        );
    }

    private void verifyOrganization(UUID organizationId) {
        if (!TenantContext.hasRole("ADMIN") && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
