package nl.puurkroatie.rds.quote.service.impl;

import nl.puurkroatie.rds.auth.security.TenantContext;
import nl.puurkroatie.rds.booking.dto.DocumentDto;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.entity.BookingStatus;
import nl.puurkroatie.rds.booking.entity.Document;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.booking.repository.DocumentRepository;
import nl.puurkroatie.rds.docgen.service.DocumentGenerationService;
import nl.puurkroatie.rds.email.dto.EmailSendResultDto;
import nl.puurkroatie.rds.email.service.EmailSendService;
import nl.puurkroatie.rds.quote.dto.QuoteSendResultDto;
import nl.puurkroatie.rds.quote.service.QuoteService;
import nl.puurkroatie.rds.settings.entity.OrganizationSettings;
import nl.puurkroatie.rds.settings.service.OrganizationSettingsService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class QuoteServiceImpl implements QuoteService {

    /** Een offerte gaat de deur uit bij een aanvraag, en opnieuw zolang hij nog niet bevestigd is. */
    private static final Set<BookingStatus> SENDABLE = EnumSet.of(BookingStatus.AANVRAAG, BookingStatus.OFFERTE);
    private static final String PDF = "pdf";

    private final BookingRepository bookingRepository;
    private final DocumentRepository documentRepository;
    private final OrganizationSettingsService settingsService;
    private final DocumentGenerationService documentGenerationService;
    private final EmailSendService emailSendService;

    public QuoteServiceImpl(BookingRepository bookingRepository,
                            DocumentRepository documentRepository,
                            OrganizationSettingsService settingsService,
                            DocumentGenerationService documentGenerationService,
                            EmailSendService emailSendService) {
        this.bookingRepository = bookingRepository;
        this.documentRepository = documentRepository;
        this.settingsService = settingsService;
        this.documentGenerationService = documentGenerationService;
        this.emailSendService = emailSendService;
    }

    @Override
    public QuoteSendResultDto send(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        verifyOrganization(booking.getTenantOrganization());
        verifySendable(booking);
        OrganizationSettings settings = settingsService.forOrganization(booking.getTenantOrganization());
        verifyConfigured(settings);

        // Eerst de status, zodat document en mail al "OFFERTE" tonen. Gaat daarna iets mis (PDF, mail), dan wordt
        // alles in deze transactie teruggedraaid, ook de status.
        if (booking.getBookingStatus() != BookingStatus.OFFERTE) {
            bookingRepository.saveAndRefresh(new Booking(booking.getBookingId(), booking.getBooker(), booking.getBookingNumber(),
                    BookingStatus.OFFERTE, booking.isQuoteConfirmed(), booking.getQuoteConfirmedAt(),
                    booking.getCreatedAt(), booking.getCreatedBy(), booking.getTenantOrganization()));
        }

        DocumentDto generated = documentGenerationService.generate(settings.getQuoteDocumentTemplateId(), bookingId, PDF, true);
        Document document = documentRepository.findById(generated.getDocumentId())
                .orElseThrow(() -> new IllegalStateException("Generated document not found: " + generated.getDocumentId()));
        EmailSendResultDto mail = emailSendService.sendForBooking(settings.getQuoteEmailTemplateId(), bookingId, document);

        return new QuoteSendResultDto(bookingId, BookingStatus.OFFERTE.toValue(), document.getDocumentId(),
                document.getDisplayname(), mail.getTo(), mail.getSubject());
    }

    private void verifySendable(Booking booking) {
        if (booking.isQuoteConfirmed()) {
            throw new IllegalArgumentException("De offerte is al bevestigd; een nieuwe offerte versturen kan niet meer");
        }
        if (!SENDABLE.contains(booking.getBookingStatus())) {
            throw new IllegalArgumentException("Een offerte versturen kan alleen in status Aanvraag of Offerte");
        }
        Booker booker = booking.getBooker();
        if (booker == null || booker.getEmailaddress() == null || booker.getEmailaddress().isBlank()) {
            throw new IllegalArgumentException("De boeking heeft geen hoofdboeker met een e-mailadres");
        }
    }

    private void verifyConfigured(OrganizationSettings settings) {
        if (settings.getQuoteDocumentTemplateId() == null || settings.getQuoteEmailTemplateId() == null) {
            throw new IllegalArgumentException(
                    "Kies eerst bij Organisatie-instellingen een offertedocument en een offertemail");
        }
    }

    private void verifyOrganization(UUID organizationId) {
        if (!TenantContext.hasRole("ADMIN") && !organizationId.equals(TenantContext.getOrganizationId())) {
            throw new AccessDeniedException("Access denied: resource belongs to another organization");
        }
    }
}
