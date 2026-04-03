package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingLineDto;
import nl.puurkroatie.rds.booking.entity.Accommodation;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingLine;
import nl.puurkroatie.rds.booking.entity.BookingLineId;
import nl.puurkroatie.rds.booking.entity.Supplier;
import nl.puurkroatie.rds.booking.mapper.BookingLineMapper;
import nl.puurkroatie.rds.booking.repository.AccommodationRepository;
import nl.puurkroatie.rds.booking.repository.BookingLineRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.SupplierRepository;
import nl.puurkroatie.rds.booking.service.BookingLineService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookingLineServiceImpl implements BookingLineService {

    private final BookingLineRepository bookingLineRepository;
    private final BookingRepository bookingRepository;
    private final AccommodationRepository accommodationRepository;
    private final SupplierRepository supplierRepository;
    private final BookingLineMapper bookingLineMapper;

    public BookingLineServiceImpl(BookingLineRepository bookingLineRepository,
                                  BookingRepository bookingRepository,
                                  AccommodationRepository accommodationRepository,
                                  SupplierRepository supplierRepository,
                                  BookingLineMapper bookingLineMapper) {
        this.bookingLineRepository = bookingLineRepository;
        this.bookingRepository = bookingRepository;
        this.accommodationRepository = accommodationRepository;
        this.supplierRepository = supplierRepository;
        this.bookingLineMapper = bookingLineMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingLineDto> findAll() {
        if (isAdmin()) {
            return bookingLineRepository.findAll().stream()
                    .map(bookingLineMapper::toDto)
                    .toList();
        }
        return bookingLineRepository.findByTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(bookingLineMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingLineDto> findByBookingId(UUID bookingId) {
        return bookingLineRepository.findByBookingBookingId(bookingId).stream()
                .filter(bl -> isAdmin() || bl.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingLineMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BookingLineDto> findById(UUID bookingId, UUID accommodationId, UUID supplierId) {
        return bookingLineRepository.findById(new BookingLineId(bookingId, accommodationId, supplierId))
                .filter(bl -> isAdmin() || bl.getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingLineMapper::toDto);
    }

    @Override
    public BookingLineDto create(BookingLineDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        Accommodation accommodation = accommodationRepository.findById(dto.getAccommodationId())
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + dto.getAccommodationId()));
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + dto.getSupplierId()));

        verifyOrganization(booking.getTenantOrganization());
        verifyOrganization(accommodation.getTenantOrganization());
        verifyOrganization(supplier.getTenantOrganization());

        validateNoDateOverlap(booking.getBookingId(), dto.getFromDate(), dto.getUntilDate(), null);

        BookingLine entity = new BookingLine(
                booking, accommodation, supplier,
                dto.getFromDate(), dto.getUntilDate(), dto.getPrice()
        );
        BookingLine saved = bookingLineRepository.save(entity);
        return bookingLineMapper.toDto(saved);
    }

    @Override
    public BookingLineDto update(UUID bookingId, UUID accommodationId, UUID supplierId, BookingLineDto dto) {
        BookingLine existing = bookingLineRepository.findById(new BookingLineId(bookingId, accommodationId, supplierId))
                .orElseThrow(() -> new RuntimeException("BookingLine not found"));

        verifyOrganization(existing.getTenantOrganization());

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        Accommodation accommodation = accommodationRepository.findById(accommodationId)
                .orElseThrow(() -> new RuntimeException("Accommodation not found with id: " + accommodationId));
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + supplierId));

        BookingLineId currentId = new BookingLineId(bookingId, accommodationId, supplierId);
        validateNoDateOverlap(bookingId, dto.getFromDate(), dto.getUntilDate(), currentId);

        BookingLine updated = new BookingLine(
                booking, accommodation, supplier,
                dto.getFromDate(), dto.getUntilDate(), dto.getPrice()
        );
        BookingLine saved = bookingLineRepository.save(updated);
        return bookingLineMapper.toDto(saved);
    }

    @Override
    public void delete(UUID bookingId, UUID accommodationId, UUID supplierId) {
        BookingLine existing = bookingLineRepository.findById(new BookingLineId(bookingId, accommodationId, supplierId))
                .orElseThrow(() -> new RuntimeException("BookingLine not found"));

        verifyOrganization(existing.getTenantOrganization());

        bookingLineRepository.deleteById(new BookingLineId(bookingId, accommodationId, supplierId));
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }

    private void validateNoDateOverlap(UUID bookingId, LocalDate fromDate, LocalDate untilDate, BookingLineId excludeId) {
        if (fromDate == null || untilDate == null) {
            return;
        }
        List<BookingLine> existingLines = bookingLineRepository.findByBookingBookingId(bookingId);
        for (BookingLine line : existingLines) {
            if (excludeId != null && excludeId.equals(
                    new BookingLineId(line.getBooking().getBookingId(),
                            line.getAccommodation().getAccommodationId(),
                            line.getSupplier().getSupplierId()))) {
                continue;
            }
            if (line.getFromDate() == null || line.getUntilDate() == null) {
                continue;
            }
            // Overlap: newFrom < existingUntil AND newUntil > existingFrom
            // (gelijke grenzen zijn toegestaan: untilDate mag gelijk zijn aan fromDate van andere line)
            if (fromDate.isBefore(line.getUntilDate()) && untilDate.isAfter(line.getFromDate())) {
                throw new IllegalArgumentException(
                        "Datumperiode overlapt met bestaande boekingsregel: "
                                + line.getFromDate() + " — " + line.getUntilDate());
            }
        }
    }
}
