package nl.puurkroatie.rds.booking.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.BookingMolliePaymentDto;
import nl.puurkroatie.rds.mollie.service.CreatedByNameResolver;
import nl.puurkroatie.rds.booking.repository.BookingMolliePaymentRelinkRepository;
import nl.puurkroatie.rds.booking.entity.BookingMolliePaymentRelink;
import nl.puurkroatie.rds.booking.dto.PaymentRelinkDto;
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

import java.util.Map;
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
    private final BookingMolliePaymentRelinkRepository relinkRepository;
    private final CreatedByNameResolver createdByNameResolver;

    public BookingMolliePaymentServiceImpl(BookingMolliePaymentRepository bookingMolliePaymentRepository, BookingRepository bookingRepository, MolliePaymentRepository molliePaymentRepository, BookingMolliePaymentMapper bookingMolliePaymentMapper, BookingMolliePaymentRelinkRepository relinkRepository, CreatedByNameResolver createdByNameResolver) {
        this.bookingMolliePaymentRepository = bookingMolliePaymentRepository;
        this.bookingRepository = bookingRepository;
        this.molliePaymentRepository = molliePaymentRepository;
        this.bookingMolliePaymentMapper = bookingMolliePaymentMapper;
        this.relinkRepository = relinkRepository;
        this.createdByNameResolver = createdByNameResolver;
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
    public PaymentRelinkDto relink(UUID molliePaymentId, UUID targetBookingId, String reason) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        verifyOrganization(payment.getTenantOrganization());

        BookingMolliePayment current = bookingMolliePaymentRepository.findByMolliePaymentMolliePaymentId(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("The payment is not linked to a booking: " + molliePaymentId));
        Booking from = current.getBooking();

        Booking target = bookingRepository.findById(targetBookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + targetBookingId));
        // Een betaling blijft binnen één organisatie, ook voor een ADMIN: nooit data van tenants door elkaar.
        if (!target.getTenantOrganization().equals(payment.getTenantOrganization())) {
            throw new AccessDeniedException("Access denied: the booking belongs to another organization than the payment");
        }
        if (target.getBookingId().equals(from.getBookingId())) {
            throw new IllegalArgumentException("The payment is already linked to this booking");
        }

        // Eerst de herkoppeling registreren, dan de koppeling verplaatsen (de database eist die volgorde).
        BookingMolliePaymentRelink relink = relinkRepository.saveAndFlush(
                new BookingMolliePaymentRelink(payment, from, target, reason.trim()));
        // Het antwoord eerst opbouwen: het verplaatsen leegt de persistence context (native update).
        PaymentRelinkDto result = toDtos(List.of(relink)).get(0);
        bookingMolliePaymentRepository.moveToBooking(molliePaymentId, from.getBookingId(), target.getBookingId());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentRelinkDto> findRelinks(UUID molliePaymentId) {
        MolliePayment payment = molliePaymentRepository.findById(molliePaymentId)
                .orElseThrow(() -> new RuntimeException("MolliePayment not found with id: " + molliePaymentId));
        verifyOrganization(payment.getTenantOrganization());
        return toDtos(relinkRepository.findByMolliePaymentMolliePaymentIdOrderByCreatedAtAsc(molliePaymentId));
    }

    private List<PaymentRelinkDto> toDtos(List<BookingMolliePaymentRelink> relinks) {
        Map<UUID, String> names = createdByNameResolver.resolve(relinks.stream().map(BookingMolliePaymentRelink::getCreatedBy).toList());
        return relinks.stream()
                .map(r -> new PaymentRelinkDto(
                        r.getRelinkId(), r.getMolliePayment().getMolliePaymentId(),
                        r.getFromBooking().getBookingId(), r.getFromBooking().getBookingNumber(),
                        r.getToBooking().getBookingId(), r.getToBooking().getBookingNumber(),
                        r.getReason(), r.getCreatedAt(), r.getCreatedBy(), names.get(r.getCreatedBy())))
                .toList();
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
