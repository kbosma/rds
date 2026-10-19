package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.email.dto.SentEmailDto;
import nl.puurkroatie.rds.email.entity.SentEmail;
import nl.puurkroatie.rds.email.repository.SentEmailRepository;
import nl.puurkroatie.rds.email.service.EmailMessage;
import nl.puurkroatie.rds.email.service.EmailSender;
import nl.puurkroatie.rds.email.service.SentEmailService;
import nl.puurkroatie.rds.mollie.service.CreatedByNameResolver;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class SentEmailServiceImpl implements SentEmailService {

    private final SentEmailRepository sentEmailRepository;
    private final BookingRepository bookingRepository;
    private final EmailSender emailSender;
    private final CreatedByNameResolver createdByNameResolver;

    public SentEmailServiceImpl(SentEmailRepository sentEmailRepository, BookingRepository bookingRepository,
                                EmailSender emailSender, CreatedByNameResolver createdByNameResolver) {
        this.sentEmailRepository = sentEmailRepository;
        this.bookingRepository = bookingRepository;
        this.emailSender = emailSender;
        this.createdByNameResolver = createdByNameResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public List<SentEmailDto> findByBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        verifyOrganization(booking.getTenantOrganization());
        return toDtos(sentEmailRepository.findByBookingBookingIdOrderByCreatedAtDesc(bookingId));
    }

    @Override
    @Transactional(readOnly = true)
    public SentEmailDto findById(UUID sentEmailId) {
        return toDtos(List.of(load(sentEmailId))).get(0);
    }

    @Override
    public SentEmailDto resend(UUID sentEmailId) {
        SentEmail original = load(sentEmailId);
        emailSender.send(new EmailMessage(original.getFromAddress(), original.getToAddress(),
                original.getSubject(), original.getBodyHtml()));
        SentEmail copy = sentEmailRepository.save(new SentEmail(original.getBooking(), original.getFromAddress(),
                original.getToAddress(), original.getSubject(), original.getBodyHtml(), original.getSentEmailId()));
        return toDtos(List.of(copy)).get(0);
    }

    private SentEmail load(UUID sentEmailId) {
        SentEmail sentEmail = sentEmailRepository.findById(sentEmailId)
                .orElseThrow(() -> new RuntimeException("Sent email not found with id: " + sentEmailId));
        verifyOrganization(sentEmail.getTenantOrganization());
        return sentEmail;
    }

    private List<SentEmailDto> toDtos(List<SentEmail> emails) {
        Map<UUID, String> names = createdByNameResolver.resolve(emails.stream().map(SentEmail::getCreatedBy).toList());
        return emails.stream()
                .map(e -> new SentEmailDto(e.getSentEmailId(), e.getBooking().getBookingId(), e.getFromAddress(),
                        e.getToAddress(), e.getSubject(), e.getBodyHtml(), e.getResentFromId(), e.getCreatedAt(),
                        e.getCreatedBy(), names.get(e.getCreatedBy())))
                .toList();
    }

    private void verifyOrganization(UUID organizationId) {
        if (!TenantContext.hasRole("ADMIN") && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: belongs to another organization");
        }
    }
}
