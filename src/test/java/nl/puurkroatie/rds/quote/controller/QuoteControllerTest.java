package nl.puurkroatie.rds.quote.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.endsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Offerte versturen: de boeking gaat naar OFFERTE, er komt een PDF bij de boeking (zichtbaar in het portaal) en die
 * gaat als bijlage met de offertemail naar de hoofdboeker. Herhaalbaar zolang de offerte niet bevestigd is.
 */
class QuoteControllerTest extends AbstractBookingControllerTest {

    private String sendQuoteUrl() {
        return "/api/bookings/" + BOOKING_TP_4 + "/send-quote";
    }

    private void configureQuote(String token) throws Exception {
        String documentBody = mockMvc.perform(post("/api/document-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Offerte",
                                "sourceHtml", "<p>Offerte ${booking.bookingNumber} (${booking.bookingStatus})</p>"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String emailBody = mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Offertemail",
                                "subject", "Offerte ${booking.bookingNumber} (${booking.bookingStatus})",
                                "bodyHtml", "<p>Beste ${prospect.fullName}, bijgaand uw offerte.</p>"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();

        Map<String, Object> settings = new HashMap<>();
        settings.put("quoteDocumentTemplateId", objectMapper.readTree(documentBody).get("documentTemplateId").asText());
        settings.put("quoteEmailTemplateId", objectMapper.readTree(emailBody).get("emailTemplateId").asText());
        mockMvc.perform(put("/api/organization-settings/mine").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(settings)))
                .andExpect(status().isOk());
    }

    private void setBooking(String token, String bookingStatus, String bookerId, boolean quoteConfirmed) throws Exception {
        String booker = bookerId == null ? "null" : "\"" + bookerId + "\"";
        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"" + bookingStatus + "\",\"bookerId\":" + booker
                                + ",\"quoteConfirmed\":" + quoteConfirmed + "}"))
                .andExpect(status().isOk());
    }

    private String bookingStatus(String token) throws Exception {
        String body = mockMvc.perform(get("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookingStatus").asText();
    }

    private JsonNode sentEmails(String token) throws Exception {
        String body = mockMvc.perform(get("/api/sent-emails/booking/" + BOOKING_TP_4).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private long quotePdfs(String token) throws Exception {
        String body = mockMvc.perform(get("/api/documents/booking/" + BOOKING_TP_4).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long count = 0;
        for (JsonNode document : objectMapper.readTree(body)) {
            if ("application/pdf".equals(document.get("mimeType").asText()) && document.get("displayname").asText().startsWith("Offerte")) {
                count++;
            }
        }
        return count;
    }

    @Test
    void manager_sendQuote_fromAanvraag_setsOfferte_andMailsThePdfToTheMainBooker() throws Exception {
        String token = managerToken();
        configureQuote(token);
        setBooking(token, BOOKING_STATUS_AANVRAAG, BOOKER_TP_4.toString(), false);

        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("offerte"))
                .andExpect(jsonPath("$.documentId").isNotEmpty())
                .andExpect(jsonPath("$.documentName").value(endsWith(".pdf")))
                .andExpect(jsonPath("$.to").isNotEmpty())
                // de mail wordt samengevoegd nadat de status al OFFERTE is
                .andExpect(jsonPath("$.subject").value(endsWith("(OFFERTE)")));

        assertEquals("offerte", bookingStatus(token));
        assertEquals(1, quotePdfs(token));
        JsonNode latest = sentEmails(token).get(0);
        assertTrue(latest.get("attachmentName").asText().endsWith(".pdf"));
        assertTrue(latest.get("attachmentDocumentId").isTextual());
    }

    @Test
    void sendingTheQuoteAgain_inOfferte_makesANewPdfAndMail() throws Exception {
        String token = managerToken();
        configureQuote(token);
        setBooking(token, BOOKING_STATUS_AANVRAAG, BOOKER_TP_4.toString(), false);
        int mailsBefore = sentEmails(token).size();

        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token)).andExpect(status().isOk());

        assertEquals("offerte", bookingStatus(token));
        assertEquals(2, quotePdfs(token));
        assertEquals(mailsBefore + 2, sentEmails(token).size());
    }

    @Test
    void resendingTheQuoteMail_attachesTheSameDocumentAgain() throws Exception {
        String token = managerToken();
        configureQuote(token);
        setBooking(token, BOOKING_STATUS_AANVRAAG, BOOKER_TP_4.toString(), false);
        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        JsonNode original = sentEmails(token).get(0);

        mockMvc.perform(post("/api/sent-emails/" + original.get("sentEmailId").asText() + "/resend")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.attachmentDocumentId").value(original.get("attachmentDocumentId").asText()));

        assertEquals(1, quotePdfs(token));
    }

    @Test
    void sendQuote_withoutQuoteSettings_returns400_andChangesNothing() throws Exception {
        String token = managerToken();
        setBooking(token, BOOKING_STATUS_AANVRAAG, BOOKER_TP_4.toString(), false);

        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Organisatie-instellingen")));

        assertEquals(BOOKING_STATUS_AANVRAAG, bookingStatus(token));
        assertEquals(0, quotePdfs(token));
    }

    @Test
    void sendQuote_withoutMainBooker_returns400() throws Exception {
        String token = managerToken();
        configureQuote(token);
        setBooking(token, BOOKING_STATUS_AANVRAAG, null, false);

        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        assertEquals(BOOKING_STATUS_AANVRAAG, bookingStatus(token));
    }

    @Test
    void sendQuote_afterConfirmation_returns400() throws Exception {
        String token = managerToken();
        configureQuote(token);
        setBooking(token, "offerte", BOOKER_TP_4.toString(), false);
        setBooking(token, "offerte", BOOKER_TP_4.toString(), true);

        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        assertEquals("boeking", bookingStatus(token));
    }

    @Test
    void sendQuote_inALaterStatus_returns400() throws Exception {
        String token = managerToken();
        configureQuote(token);
        setBooking(token, "voorschot", BOOKER_TP_4.toString(), false);

        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());

        assertEquals("voorschot", bookingStatus(token));
    }

    @Test
    void employee_ofAnotherOrganization_gets403() throws Exception {
        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_cannotSendAQuote() throws Exception {
        mockMvc.perform(post(sendQuoteUrl()).header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }
}
