package nl.puurkroatie.rds.email.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Een mail aan de hoofdboeker blijft bewaard (tijdlijn van de boeking); lezen en opnieuw versturen, nooit wijzigen. */
class SentEmailControllerTest extends AbstractBookingControllerTest {

    private String sendOne(String token) throws Exception {
        String json = objectMapper.writeValueAsString(java.util.Map.of(
                "name", "Boekingsmail", "subject", "Boeking ${booking.bookingNumber}", "bodyHtml", "<p>Beste ${prospect.fullName}</p>"));
        String templateId = objectMapper.readTree(mockMvc.perform(post("/api/email-templates")
                        .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("emailTemplateId").asText();
        mockMvc.perform(post("/api/email-templates/" + templateId + "/send")
                        .param("bookingId", BOOKING_TP_4.toString()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        return templateId;
    }

    private JsonNode list(String token) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/api/sent-emails/booking/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    @Test
    void aSentMail_isKeptWithContentRecipientAndReadableSender() throws Exception {
        String token = managerToken();
        sendOne(token);

        JsonNode mails = list(token);
        assertEquals(1, mails.size());
        JsonNode mail = mails.get(0);
        assertEquals("noreply@techpartner.example", mail.get("fromAddress").asText());
        assertEquals("thomas.smit@example.com", mail.get("toAddress").asText());
        assertEquals("Boeking BK-2026-004", mail.get("subject").asText());
        assertEquals("<p>Beste Thomas Smit</p>", mail.get("bodyHtml").asText());
        assertEquals("Pieter de Groot", mail.get("createdByName").asText());

        mockMvc.perform(get("/api/sent-emails/" + mail.get("sentEmailId").asText()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject").value("Boeking BK-2026-004"));
    }

    @Test
    void resend_sendsTheSameContentAgain_andKeepsItAsANewRowLinkedToTheOriginal() throws Exception {
        String token = managerToken();
        sendOne(token);
        String originalId = list(token).get(0).get("sentEmailId").asText();

        mockMvc.perform(post("/api/sent-emails/" + originalId + "/resend").header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.resentFromId").value(originalId))
                .andExpect(jsonPath("$.bodyHtml").value("<p>Beste Thomas Smit</p>"));

        JsonNode mails = list(token);
        assertEquals(2, mails.size());
        assertNotEquals(mails.get(0).get("sentEmailId").asText(), mails.get(1).get("sentEmailId").asText());
    }

    @Test
    void aBookingWithSentMails_cannotBeDeleted() throws Exception {
        String token = managerToken();
        sendOne(token);

        // BOOKING_TP_4 heeft al documenten en betalingen; de melding noemt nu ook verzonden e-mails.
        mockMvc.perform(delete("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("sent emails")));
    }

    @Test
    void thereIsNoWayToChangeOrDeleteASentMail() throws Exception {
        String token = managerToken();
        sendOne(token);
        String id = list(token).get(0).get("sentEmailId").asText();

        mockMvc.perform(delete("/api/sent-emails/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void employeeOfTheSameOrganizationCanRead_butAdminCannotResend() throws Exception {
        sendOne(managerToken());
        JsonNode mails = list(loginAndGetToken("sophie.vandijk", DEFAULT_PASSWORD)); // medewerker van dezelfde organisatie
        assertEquals(1, mails.size());

        mockMvc.perform(post("/api/sent-emails/" + mails.get(0).get("sentEmailId").asText() + "/resend")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/sent-emails/booking/" + BOOKING_TP_4)).andExpect(status().isUnauthorized());
    }
}
