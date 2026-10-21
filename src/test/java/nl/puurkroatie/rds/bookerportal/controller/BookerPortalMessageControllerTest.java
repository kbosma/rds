package nl.puurkroatie.rds.bookerportal.controller;

import nl.puurkroatie.rds.booking.entity.Booking;
import nl.puurkroatie.rds.booking.repository.BookingRepository;
import nl.puurkroatie.rds.email.entity.SentEmail;
import nl.puurkroatie.rds.email.repository.SentEmailRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookerPortalMessageControllerTest extends AbstractBookerPortalControllerTest {

    private static final UUID OTHER_BOOKING_ID = UUID.fromString("01000000-0000-0000-0000-000000000002");
    private static final String BODY = "<p>Beste Klaas, uw boeking is bevestigd.</p>";

    @Autowired
    private SentEmailRepository sentEmailRepository;
    @Autowired
    private BookingRepository bookingRepository;

    private SentEmail save(UUID bookingId, String subject, UUID resentFrom) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow();
        return sentEmailRepository.saveAndFlush(new SentEmail(booking, "noreply@puurkroatie.nl",
                "klaas@example.com", subject, BODY, resentFrom));
    }

    // Alle mails aan de hoofdboeker van de eigen boeking, nieuwste eerst, zonder inhoud
    @Test
    void booker_findAll_returnsOwnMessagesNewestFirstWithoutTheBody() throws Exception {
        save(BOOKING_ID, "Bevestiging", null);
        Thread.sleep(5);
        save(BOOKING_ID, "Betaalverzoek", null);

        mockMvc.perform(get("/api/booker-portal/messages").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].subject").value("Betaalverzoek"))
                .andExpect(jsonPath("$[1].subject").value("Bevestiging"))
                .andExpect(jsonPath("$[0].fromAddress").value("noreply@puurkroatie.nl"))
                .andExpect(jsonPath("$[0].resent").value(false))
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].messageId").exists())
                .andExpect(jsonPath("$[0].bodyHtml").doesNotExist());
    }

    // De klant krijgt geen interne gegevens: geen ontvangersadres, medewerker of tenant
    @Test
    void booker_findAll_exposesNothingInternal() throws Exception {
        save(BOOKING_ID, "Bevestiging", null);

        mockMvc.perform(get("/api/booker-portal/messages").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].toAddress").doesNotExist())
                .andExpect(jsonPath("$[0].createdBy").doesNotExist())
                .andExpect(jsonPath("$[0].createdByName").doesNotExist())
                .andExpect(jsonPath("$[0].tenantOrganization").doesNotExist())
                .andExpect(jsonPath("$[0].resentFromId").doesNotExist())
                .andExpect(jsonPath("$[0].booking").doesNotExist());
    }

    @Test
    void booker_findAll_withoutMessages_returnsAnEmptyList() throws Exception {
        mockMvc.perform(get("/api/booker-portal/messages").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // Een opnieuw verstuurde mail staat er als eigen regel en is als zodanig herkenbaar
    @Test
    void booker_findAll_marksAResentMessage() throws Exception {
        SentEmail original = save(BOOKING_ID, "Bevestiging", null);
        Thread.sleep(5);
        save(BOOKING_ID, "Bevestiging", original.getSentEmailId());

        mockMvc.perform(get("/api/booker-portal/messages").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].resent").value(true))
                .andExpect(jsonPath("$[1].resent").value(false));
    }

    // De mails van een andere boeking ziet de klant niet
    @Test
    void booker_findAll_doesNotShowMessagesOfAnotherBooking() throws Exception {
        save(OTHER_BOOKING_ID, "Voor een ander", null);

        mockMvc.perform(get("/api/booker-portal/messages").header("Authorization", "Bearer " + bookerToken()))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // De inhoud van een eigen mail → 200 met de HTML zoals verstuurd
    @Test
    void booker_findById_ownMessage_returnsTheBody() throws Exception {
        SentEmail email = save(BOOKING_ID, "Bevestiging", null);

        mockMvc.perform(get("/api/booker-portal/messages/" + email.getSentEmailId())
                        .header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messageId").value(email.getSentEmailId().toString()))
                .andExpect(jsonPath("$.subject").value("Bevestiging"))
                .andExpect(jsonPath("$.fromAddress").value("noreply@puurkroatie.nl"))
                .andExpect(jsonPath("$.bodyHtml").value(BODY))
                .andExpect(jsonPath("$.toAddress").doesNotExist())
                .andExpect(jsonPath("$.createdBy").doesNotExist());
    }

    // Een mail van een andere boeking is voor de klant hetzelfde als een mail die niet bestaat → 404
    @Test
    void booker_findById_otherBookingMessage_returns404() throws Exception {
        SentEmail other = save(OTHER_BOOKING_ID, "Voor een ander", null);

        mockMvc.perform(get("/api/booker-portal/messages/" + other.getSentEmailId())
                        .header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isNotFound());
    }

    @Test
    void booker_findById_unknownMessage_returns404() throws Exception {
        mockMvc.perform(get("/api/booker-portal/messages/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + bookerToken()))
                .andExpect(status().isNotFound());
    }

    // Medewerker-JWT op het portaal → 403
    @Test
    void employee_accessMessages_returns403() throws Exception {
        String token = employeeToken();
        SentEmail email = save(BOOKING_ID, "Bevestiging", null);

        mockMvc.perform(get("/api/booker-portal/messages").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/booker-portal/messages/" + email.getSentEmailId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Geen JWT → 401
    @Test
    void unauthenticated_accessMessages_returns401() throws Exception {
        mockMvc.perform(get("/api/booker-portal/messages")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/booker-portal/messages/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
    }
}
