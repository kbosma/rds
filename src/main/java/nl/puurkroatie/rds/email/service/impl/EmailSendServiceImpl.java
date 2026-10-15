package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.email.dto.EmailRenderDto;
import nl.puurkroatie.rds.email.dto.EmailSendResultDto;
import nl.puurkroatie.rds.email.service.EmailMessage;
import nl.puurkroatie.rds.email.service.EmailNotConfiguredException;
import nl.puurkroatie.rds.email.service.EmailImageUrlResolver;
import nl.puurkroatie.rds.email.service.EmailRenderService;
import nl.puurkroatie.rds.email.service.EmailSendService;
import nl.puurkroatie.rds.email.service.EmailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class EmailSendServiceImpl implements EmailSendService {

    private final EmailRenderService emailRenderService;
    private final BookerRepository bookerRepository;
    private final BookingRepository bookingRepository;
    private final OrganizationRepository organizationRepository;
    private final EmailSender emailSender;
    private final EmailImageUrlResolver imageUrlResolver;

    public EmailSendServiceImpl(EmailRenderService emailRenderService,
                                BookerRepository bookerRepository,
                                BookingRepository bookingRepository,
                                OrganizationRepository organizationRepository,
                                EmailSender emailSender,
                                EmailImageUrlResolver imageUrlResolver) {
        this.emailRenderService = emailRenderService;
        this.bookerRepository = bookerRepository;
        this.bookingRepository = bookingRepository;
        this.organizationRepository = organizationRepository;
        this.emailSender = emailSender;
        this.imageUrlResolver = imageUrlResolver;
    }

    @Override
    public EmailSendResultDto sendToBooker(UUID templateId, UUID bookerId) {
        // render() doet de tenant-controle op template én booker en levert de
        // gemergde subject + HTML. Daarna halen we afzender/ontvanger op.
        EmailRenderDto rendered = emailRenderService.render(templateId, bookerId);

        Booker booker = bookerRepository.findById(bookerId)
                .orElseThrow(() -> new RuntimeException("Booker not found with id: " + bookerId));

        return deliver(rendered, booker.getEmailaddress(), booker.getTenantOrganization(),
                "Booker heeft geen e-mailadres: " + bookerId);
    }

    @Override
    public EmailSendResultDto sendForBooking(UUID templateId, UUID bookingId) {
        // De tenant-controle op template én boeking gebeurt in renderForBooking().
        EmailRenderDto rendered = emailRenderService.renderForBooking(templateId, bookingId);

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));
        Booker booker = booking.getBooker();
        if (booker == null) {
            throw new EmailNotConfiguredException("Boeking heeft geen hoofdboeker om naar te mailen: " + bookingId);
        }

        return deliver(rendered, booker.getEmailaddress(), booking.getTenantOrganization(),
                "De hoofdboeker van de boeking heeft geen e-mailadres: " + bookingId);
    }

    /** Gemeenschappelijk deel: afzender van de organisatie, ontvanger controleren, en versturen. */
    private EmailSendResultDto deliver(EmailRenderDto rendered, String to, UUID organizationId, String noRecipientMessage) {
        if (to == null || to.isBlank()) {
            throw new EmailNotConfiguredException(noRecipientMessage);
        }

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + organizationId));

        String from = organization.getEmailFrom();
        if (from == null || from.isBlank()) {
            throw new EmailNotConfiguredException(
                    "Organisatie '" + organization.getName() + "' heeft geen afzender-e-mailadres geconfigureerd.");
        }

        // Afbeeldingen staan in de template als relatief pad; een ontvanger heeft een absolute,
        // publiek bereikbare URL nodig, dus die vullen we pas nu in.
        String bodyHtml = imageUrlResolver.toAbsolute(rendered.getBodyHtml());
        emailSender.send(new EmailMessage(from, to, rendered.getSubject(), bodyHtml));
        return new EmailSendResultDto(to, from, rendered.getSubject());
    }
}
