package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingMolliePaymentDto;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingMolliePayment;
import nl.puurkroatie.rds.booking.entity.BookingMolliePaymentId;
import nl.puurkroatie.rds.booking.mapper.BookingMolliePaymentMapper;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.service.BookingMolliePaymentService;
import nl.puurkroatie.rds.mollie.entity.MolliePayment;
import nl.puurkroatie.rds.mollie.repository.MolliePaymentRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class BookingMolliePaymentServiceImpl implements BookingMolliePaymentService {

    private final BookingMolliePaymentRepository bookingMolliePaymentRepository;
    private final BookingRepository bookingRepository;
    private final MolliePaymentRepository molliePaymentRepository;
    private final BookingMolliePaymentMapper bookingMolliePaymentMapper;

    public BookingMolliePaymentServiceImpl(BookingMolliePaymentRepository bookingMolliePaymentRepository, BookingRepository bookingRepository, MolliePaymentRepository molliePaymentRepository, BookingMolliePaymentMapper bookingMolliePaymentMapper) {
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.bookingRepository = bookingRepository;
        this.molliePaymentRepository = molliePaymentRepository;
        this.bookingMolliePaymentMapper = bookingMolliePaymentMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingMolliePaymentDto> findAll() {
        if (isAdmin()) {
            return bookingMolliePaymentRepository.findAll().stream()
                    .map(bookingMolliePaymentMapper::toDto)
                    .toList();
        }
        return bookingMolliePaymentRepository.findByBookingTenantOrganization(TenantContext.getOrganizationId()).stream()
                .map(bookingMolliePaymentMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BookingMolliePaymentDto> findById(UUID bookingId, UUID molliePaymentId) {
        return bookingMolliePaymentRepository.findById(new BookingMolliePaymentId(bookingId, molliePaymentId))
                .filter(bmp -> isAdmin() || bmp.getBooking().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingMolliePaymentMapper::toDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingMolliePaymentDto> findByBookingId(UUID bookingId) {
        return bookingMolliePaymentRepository.findByBookingBookingId(bookingId).stream()
                .filter(bmp -> isAdmin() || bmp.getBooking().getTenantOrganization().equals(TenantContext.getOrganizationId()))
                .map(bookingMolliePaymentMapper::toDto)
                .toList();
    }

    @Override
    public BookingMolliePaymentDto create(BookingMolliePaymentDto dto) {
        Booking booking = bookingRepository.findById(dto.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + dto.getBookingId()));
        MolliePayment molliePayment = molliePaymentRepository.findById(dto.getMolliePaymentId())
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + dto.getMolliePaymentId()));

        verifyOrganization(booking.getTenantOrganization());
        verifyOrganization(molliePayment.getTenantOrganization());

        BookingMolliePayment entity = new BookingMolliePayment(booking, molliePayment);
        BookingMolliePayment saved = bookingMolliePaymentRepository.save(entity);
        return bookingMolliePaymentMapper.toDto(saved);
    }

    @Override
    public void delete(UUID bookingId, UUID molliePaymentId) {
        BookingMolliePayment existing = bookingMolliePaymentRepository.findById(new BookingMolliePaymentId(bookingId, molliePaymentId))
                .orElseThrow(() -> new RuntimeException("BookingMolliePayment not found"));

        verifyOrganization(existing.getBooking().getTenantOrganization());
        verifyOrganization(existing.getMolliePayment().getTenantOrganization());

        bookingMolliePaymentRepository.deleteById(new BookingMolliePaymentId(bookingId, molliePaymentId));
    }

    private boolean isAdmin() {
        return TenantContext.hasRole("ADMIN");
    }

    private void verifyOrganization(UUID organizationId) {
        if (!isAdmin() && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
