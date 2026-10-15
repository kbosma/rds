package nl.puurkroatie.rds.email.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * E-mailtemplate-endpoints hergebruiken de TEMPLATE_*-authorities:
 * ADMIN heeft ze niet (403), MANAGER volledig, EMPLOYEE alleen READ.
 */
class EmailTemplateControllerTest extends AbstractBookingControllerTest {

    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/email-templates"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_findAll_returns403() throws Exception {
        mockMvc.perform(get("/api/email-templates")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void employee_findAll_returns200() throws Exception {
        mockMvc.perform(get("/api/email-templates")
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isOk());
    }

    @Test
    void employee_create_returns403() throws Exception {
        String json = "{\"name\":\"X\",\"subject\":\"S\",\"bodyHtml\":\"<p>b</p>\"}";
        mockMvc.perform(post("/api/email-templates")
                        .header("Authorization", "Bearer " + employeeToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_createUpdateDelete_fullFlow() throws Exception {
        String token = managerToken();

        String createJson = "{\"name\":\"Welkom\",\"description\":\"Aanmeld-mail\"," +
                "\"subject\":\"Welkom ${prospect.firstname}\",\"bodyHtml\":\"<p>Hoi</p>\"}";
        String createResponse = mockMvc.perform(post("/api/email-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Welkom"))
                .andExpect(jsonPath("$.subject").value("Welkom ${prospect.firstname}"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()))
                .andReturn().getResponse().getContentAsString();

        String id = objectMapper.readTree(createResponse).get("emailTemplateId").asText();

        mockMvc.perform(get("/api/email-templates/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailTemplateId").value(id));

        String updateJson = "{\"name\":\"Welkom v2\",\"subject\":\"Hoi ${prospect.firstname}\",\"bodyHtml\":\"<p>Hoi 2</p>\"}";
        mockMvc.perform(put("/api/email-templates/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Welkom v2"));

        mockMvc.perform(delete("/api/email-templates/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/email-templates/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void manager_render_mergesProspectData() throws Exception {
        String token = managerToken();

        String createJson = "{\"name\":\"Welkom\",\"subject\":\"Welkom ${prospect.firstname}\"," +
                "\"bodyHtml\":\"<p>Beste ${prospect.fullName}</p>\"}";
        String createResponse = mockMvc.perform(post("/api/email-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(createResponse).get("emailTemplateId").asText();

        // Render voor een seed-booker van dezelfde organisatie (TechPartner)
        String renderResponse = mockMvc.perform(post("/api/email-templates/" + id + "/render")
                        .param("bookerId", BOOKER_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode rendered = objectMapper.readTree(renderResponse);
        assert rendered.get("subject").asText().startsWith("Welkom ")
                : "subject moet gemerged zijn";
        assert !rendered.get("subject").asText().contains("${")
                : "subject mag geen onvervangen placeholder bevatten";
        assert !rendered.get("bodyHtml").asText().contains("${")
                : "body moet gemerged zijn";
    }

    @Test
    void unauthenticated_send_returns401() throws Exception {
        mockMvc.perform(post("/api/email-templates/" + UUID.randomUUID() + "/send")
                        .param("bookerId", BOOKER_TP_4.toString()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void admin_send_returns403() throws Exception {
        // ADMIN heeft geen EMAIL_SEND (business-authority).
        mockMvc.perform(post("/api/email-templates/" + UUID.randomUUID() + "/send")
                        .param("bookerId", BOOKER_TP_4.toString())
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_send_sendsMailToBooker() throws Exception {
        String token = managerToken();

        String createJson = "{\"name\":\"Welkom\",\"subject\":\"Welkom ${prospect.firstname}\"," +
                "\"bodyHtml\":\"<p>Beste ${prospect.fullName}</p>\"}";
        String createResponse = mockMvc.perform(post("/api/email-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(createResponse).get("emailTemplateId").asText();

        // Verstuur naar een seed-booker van dezelfde organisatie (TechPartner).
        // De afzender komt uit organization.email_from (seed V6).
        mockMvc.perform(post("/api/email-templates/" + id + "/send")
                        .param("bookerId", BOOKER_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.to").value("thomas.smit@example.com"))
                .andExpect(jsonPath("$.from").value("noreply@techpartner.example"))
                .andExpect(jsonPath("$.subject").value("Welkom Thomas"));
    }

    // ----- e-mail voor een BOEKING (zelfde template-model + repeat tables) -----

    private String createTemplate(String token, String subject, String bodyHtml) throws Exception {
        String json = objectMapper.writeValueAsString(java.util.Map.of(
                "name", "Boekingsmail", "subject", subject, "bodyHtml", bodyHtml));
        String response = mockMvc.perform(post("/api/email-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("emailTemplateId").asText();
    }

    @Test
    void manager_renderForBooking_mergesBookingData() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "Boeking ${booking.bookingNumber}",
                "<p>Beste ${prospect.fullName}, status ${booking.bookingStatus}</p>");

        mockMvc.perform(post("/api/email-templates/" + id + "/render")
                        .param("bookingId", BOOKING_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subject").value(org.hamcrest.Matchers.startsWith("Boeking ")))
                .andExpect(jsonPath("$.subject").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("${"))))
                .andExpect(jsonPath("$.bodyHtml").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("${"))));
    }

    @Test
    void manager_renderForBooking_expandsARepeatedTravelerTable() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "S",
                "<table data-repeat=\"booking.travelers\" data-item=\"t\"><tbody>"
                        + "<tr><th>Naam</th></tr><tr><td>${t.firstname}</td></tr></tbody></table>");

        mockMvc.perform(post("/api/email-templates/" + id + "/render")
                        .param("bookingId", BOOKING_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bodyHtml").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("data-repeat"))))
                .andExpect(jsonPath("$.bodyHtml").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("${"))));
    }

    @Test
    void manager_renderForBooking_ofAnotherOrganisation_returns403() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "S", "<p>x</p>");

        mockMvc.perform(post("/api/email-templates/" + id + "/render")
                        .param("bookingId", BOOKING_PK_1.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void render_withBothBookerAndBooking_returns400() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "S", "<p>x</p>");

        mockMvc.perform(post("/api/email-templates/" + id + "/render")
                        .param("bookerId", BOOKER_TP_4.toString())
                        .param("bookingId", BOOKING_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void render_withNeitherBookerNorBooking_returns400() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "S", "<p>x</p>");

        mockMvc.perform(post("/api/email-templates/" + id + "/render")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void send_withBothBookerAndBooking_returns400() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "S", "<p>x</p>");

        mockMvc.perform(post("/api/email-templates/" + id + "/send")
                        .param("bookerId", BOOKER_TP_4.toString())
                        .param("bookingId", BOOKING_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    void admin_sendForBooking_returns403() throws Exception {
        mockMvc.perform(post("/api/email-templates/" + UUID.randomUUID() + "/send")
                        .param("bookingId", BOOKING_TP_4.toString())
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void manager_sendForBooking_sendsMailToTheMainBooker() throws Exception {
        String token = managerToken();
        String id = createTemplate(token, "Boeking ${booking.bookingNumber}", "<p>Beste ${prospect.fullName}</p>");

        mockMvc.perform(post("/api/email-templates/" + id + "/send")
                        .param("bookingId", BOOKING_TP_4.toString())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("noreply@techpartner.example"))
                .andExpect(jsonPath("$.to").isNotEmpty())
                .andExpect(jsonPath("$.subject").value(org.hamcrest.Matchers.startsWith("Boeking ")));
    }
}
