package nl.puurkroatie.rds.email.service.impl;

import nl.puurkroatie.rds.auth.entity.Organization;
import nl.puurkroatie.rds.auth.repository.OrganizationRepository;
import nl.puurkroatie.rds.booking.entity.Booker;
import nl.puurkroatie.rds.booking.entity.BookerStatus;
import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.BookerRepository;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.email.dto.EmailRenderDto;
import nl.puurkroatie.rds.email.dto.EmailSendResultDto;
import nl.puurkroatie.rds.email.service.EmailImageUrlResolver;
import nl.puurkroatie.rds.email.service.EmailMessage;
import nl.puurkroatie.rds.email.service.EmailNotConfiguredException;
import nl.puurkroatie.rds.email.service.EmailRenderService;
import nl.puurkroatie.rds.email.service.EmailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verzendlogica: de merge (EmailRenderService) wordt hergebruikt; daarna worden
 * ontvanger (booker-e-mailadres) en afzender (organisatie-email_from) opgehaald.
 * Ontbreekt een van beide, dan wordt er niets verstuurd.
 */
@ExtendWith(MockitoExtension.class)
class EmailSendServiceImplTest {

    private static final UUID ORG = UUID.fromString("a1000000-0000-0000-0000-000000000001");
    private static final UUID TEMPLATE_ID = UUID.randomUUID();
    private static final UUID BOOKER_ID = UUID.randomUUID();

    @Mock
    private EmailRenderService emailRenderService;
    @Mock
    private BookerRepository bookerRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private OrganizationRepository organizationRepository;
    @Mock
    private EmailSender emailSender;

    private EmailSendServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new EmailSendServiceImpl(emailRenderService, bookerRepository, bookingRepository, organizationRepository, emailSender,
                new EmailImageUrlResolver("http://public.example/api"));
    }

    private Booker booker(String email) {
        return new Booker(BOOKER_ID, "Jan", null, "Vries", "cs", "06", email,
                null, null, "i.", BookerStatus.PROSPECT, null, null, ORG);
    }

    private Organization organization(String emailFrom) {
        return new Organization(ORG, "Puurkroatie", "mollie", emailFrom, null, null);
    }

    @Test
    void sendToBooker_happyPath_sendsMailAndReturnsResult() {
        when(emailRenderService.render(TEMPLATE_ID, BOOKER_ID))
                .thenReturn(new EmailRenderDto("Welkom Jan", "<p>Beste Jan Vries</p>"));
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker("jan@example.com")));
        when(organizationRepository.findById(ORG)).thenReturn(Optional.of(organization("noreply@puurkroatie.nl")));

        EmailSendResultDto result = service.sendToBooker(TEMPLATE_ID, BOOKER_ID);

        ArgumentCaptor<EmailMessage> captor = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());
        EmailMessage sent = captor.getValue();
        assertEquals("noreply@puurkroatie.nl", sent.getFrom());
        assertEquals("jan@example.com", sent.getTo());
        assertEquals("Welkom Jan", sent.getSubject());
        assertEquals("<p>Beste Jan Vries</p>", sent.getBodyHtml());

        assertEquals("jan@example.com", result.getTo());
        assertEquals("noreply@puurkroatie.nl", result.getFrom());
        assertEquals("Welkom Jan", result.getSubject());
    }

    @Test
    void sendToBooker_makesImageUrlsAbsoluteForTheRecipient() {
        String relative = "<p>Hoi</p><img src=\"/api/public/email-images/abc-123\" alt=\"logo\">";
        when(emailRenderService.render(TEMPLATE_ID, BOOKER_ID))
                .thenReturn(new EmailRenderDto("Welkom", relative));
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker("jan@example.com")));
        when(organizationRepository.findById(ORG)).thenReturn(Optional.of(organization("noreply@puurkroatie.nl")));

        service.sendToBooker(TEMPLATE_ID, BOOKER_ID);

        ArgumentCaptor<EmailMessage> captor = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());
        assertEquals("<p>Hoi</p><img src=\"http://public.example/api/public/email-images/abc-123\" alt=\"logo\">",
                captor.getValue().getBodyHtml());
    }

    @Test
    void sendToBooker_whenOrganizationHasNoFrom_throwsAndDoesNotSend() {
        when(emailRenderService.render(TEMPLATE_ID, BOOKER_ID))
                .thenReturn(new EmailRenderDto("Welkom", "<p>x</p>"));
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker("jan@example.com")));
        when(organizationRepository.findById(ORG)).thenReturn(Optional.of(organization(null)));

        assertThrows(EmailNotConfiguredException.class, () -> service.sendToBooker(TEMPLATE_ID, BOOKER_ID));
        verify(emailSender, never()).send(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void sendToBooker_whenBookerHasNoEmail_throwsAndDoesNotSend() {
        when(emailRenderService.render(TEMPLATE_ID, BOOKER_ID))
                .thenReturn(new EmailRenderDto("Welkom", "<p>x</p>"));
        when(bookerRepository.findById(BOOKER_ID)).thenReturn(Optional.of(booker("  ")));

        assertThrows(EmailNotConfiguredException.class, () -> service.sendToBooker(TEMPLATE_ID, BOOKER_ID));
        verify(emailSender, never()).send(org.mockito.ArgumentMatchers.any());
    }

    // ----- versturen voor een BOEKING: naar de hoofdboeker -----

    private static final UUID BOOKING_ID = UUID.randomUUID();

    private Booking booking(Booker booker) {
        Booking booking = mock(Booking.class);
        when(booking.getBooker()).thenReturn(booker);
        return booking;
    }

    private Booking bookingOfOrganization(Booker booker) {
        Booking booking = booking(booker);
        when(booking.getTenantOrganization()).thenReturn(ORG);
        return booking;
    }

    @Test
    void sendForBooking_happyPath_sendsToTheMainBooker() {
        when(emailRenderService.renderForBooking(TEMPLATE_ID, BOOKING_ID))
                .thenReturn(new EmailRenderDto("Boeking B-1", "<p>Uw boeking</p>"));
        Booking booking = bookingOfOrganization(booker("jan@example.com"));
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(organizationRepository.findById(ORG)).thenReturn(Optional.of(organization("noreply@puurkroatie.nl")));

        EmailSendResultDto result = service.sendForBooking(TEMPLATE_ID, BOOKING_ID);

        ArgumentCaptor<EmailMessage> captor = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());
        assertEquals("noreply@puurkroatie.nl", captor.getValue().getFrom());
        assertEquals("jan@example.com", captor.getValue().getTo());
        assertEquals("Boeking B-1", captor.getValue().getSubject());
        assertEquals("<p>Uw boeking</p>", captor.getValue().getBodyHtml());
        assertEquals("jan@example.com", result.getTo());
    }

    @Test
    void sendForBooking_makesImageUrlsAbsolute() {
        when(emailRenderService.renderForBooking(TEMPLATE_ID, BOOKING_ID))
                .thenReturn(new EmailRenderDto("S", "<img src=\"/api/public/email-images/abc\">"));
        Booking booking = bookingOfOrganization(booker("jan@example.com"));
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(organizationRepository.findById(ORG)).thenReturn(Optional.of(organization("noreply@puurkroatie.nl")));

        service.sendForBooking(TEMPLATE_ID, BOOKING_ID);

        ArgumentCaptor<EmailMessage> captor = ArgumentCaptor.forClass(EmailMessage.class);
        verify(emailSender).send(captor.capture());
        assertEquals("<img src=\"http://public.example/api/public/email-images/abc\">", captor.getValue().getBodyHtml());
    }

    @Test
    void sendForBooking_withoutMainBooker_throwsAndDoesNotSend() {
        when(emailRenderService.renderForBooking(TEMPLATE_ID, BOOKING_ID))
                .thenReturn(new EmailRenderDto("S", "<p>x</p>"));
        Booking booking = booking(null);
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));

        assertThrows(EmailNotConfiguredException.class, () -> service.sendForBooking(TEMPLATE_ID, BOOKING_ID));
        verify(emailSender, never()).send(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void sendForBooking_whenMainBookerHasNoEmail_throwsAndDoesNotSend() {
        when(emailRenderService.renderForBooking(TEMPLATE_ID, BOOKING_ID))
                .thenReturn(new EmailRenderDto("S", "<p>x</p>"));
        Booking booking = booking(booker(" "));
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));

        assertThrows(EmailNotConfiguredException.class, () -> service.sendForBooking(TEMPLATE_ID, BOOKING_ID));
        verify(emailSender, never()).send(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void sendForBooking_whenOrganizationHasNoFrom_throwsAndDoesNotSend() {
        when(emailRenderService.renderForBooking(TEMPLATE_ID, BOOKING_ID))
                .thenReturn(new EmailRenderDto("S", "<p>x</p>"));
        Booking booking = bookingOfOrganization(booker("jan@example.com"));
        when(bookingRepository.findById(BOOKING_ID)).thenReturn(Optional.of(booking));
        when(organizationRepository.findById(ORG)).thenReturn(Optional.of(organization(null)));

        assertThrows(EmailNotConfiguredException.class, () -> service.sendForBooking(TEMPLATE_ID, BOOKING_ID));
        verify(emailSender, never()).send(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void sendForBooking_rendersBeforeLookingUpTheBooking() {
        // de tenant-controle zit in renderForBooking: een vreemde boeking mag nooit zover komen
        when(emailRenderService.renderForBooking(TEMPLATE_ID, BOOKING_ID))
                .thenThrow(new RuntimeException("Access denied"));

        assertThrows(RuntimeException.class, () -> service.sendForBooking(TEMPLATE_ID, BOOKING_ID));
        verify(bookingRepository, never()).findById(org.mockito.ArgumentMatchers.any());
        verify(emailSender, never()).send(org.mockito.ArgumentMatchers.any());
    }
}
