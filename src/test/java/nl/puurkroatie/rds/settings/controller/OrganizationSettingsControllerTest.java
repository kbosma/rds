package nl.puurkroatie.rds.settings.controller;

import jakarta.persistence.EntityManager;
import nl.puurkroatie.rds.booking.controller.AbstractBookingControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Organisatie-instellingen: één set keuzes per organisatie. Een MANAGER beheert ze, een EMPLOYEE mag ze lezen.
 * Gekozen templates moeten van de eigen organisatie zijn.
 */
class OrganizationSettingsControllerTest extends AbstractBookingControllerTest {

    private static final String MINE = "/api/organization-settings/mine";

    @Autowired
    private EntityManager entityManager;

    private String createDocumentTemplate(String token) throws Exception {
        String body = mockMvc.perform(post("/api/document-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Offerte", "sourceHtml", "<p>Offerte ${booking.bookingNumber}</p>"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("documentTemplateId").asText();
    }

    private String createEmailTemplate(String token) throws Exception {
        String body = mockMvc.perform(post("/api/email-templates").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Offertemail", "subject", "Uw offerte", "bodyHtml", "<p>Bijgaand</p>"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("emailTemplateId").asText();
    }

    private String settings(String documentTemplateId, String emailTemplateId) throws Exception {
        java.util.HashMap<String, Object> fields = new java.util.HashMap<>();
        fields.put("quoteDocumentTemplateId", documentTemplateId);
        fields.put("quoteEmailTemplateId", emailTemplateId);
        fields.put("depositPercentage", 30);
        fields.put("depositWeeksBeforeDeparture", 12);
        fields.put("balanceWeeksBeforeDeparture", 6);
        return objectMapper.writeValueAsString(fields);
    }

    @Test
    void manager_withoutSavedSettings_getsEmptyChoices() throws Exception {
        mockMvc.perform(get(MINE).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationId").isNotEmpty())
                .andExpect(jsonPath("$.quoteDocumentTemplateId").isEmpty())
                .andExpect(jsonPath("$.quoteEmailTemplateId").isEmpty())
                .andExpect(jsonPath("$.depositPercentage").value(30))
                .andExpect(jsonPath("$.depositWeeksBeforeDeparture").value(12))
                .andExpect(jsonPath("$.balanceWeeksBeforeDeparture").value(6))
                .andExpect(jsonPath("$.paymentEmailTemplateId").isEmpty());
    }

    @Test
    void manager_savesThePaymentSchedule() throws Exception {
        String token = managerToken();
        String emailTemplateId = createEmailTemplate(token);
        Map<String, Object> fields = new java.util.HashMap<>();
        fields.put("depositPercentage", 25);
        fields.put("depositWeeksBeforeDeparture", 20);
        fields.put("balanceWeeksBeforeDeparture", 8);
        fields.put("paymentEmailTemplateId", emailTemplateId);

        mockMvc.perform(put(MINE).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(fields)))
                .andExpect(status().isOk());

        mockMvc.perform(get(MINE).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.depositPercentage").value(25))
                .andExpect(jsonPath("$.depositWeeksBeforeDeparture").value(20))
                .andExpect(jsonPath("$.balanceWeeksBeforeDeparture").value(8))
                .andExpect(jsonPath("$.paymentEmailTemplateId").value(emailTemplateId));
    }

    @Test
    void manager_invalidPaymentSchedule_returns400() throws Exception {
        String token = managerToken();
        for (int[] invalid : new int[][] {{0, 12, 6}, {101, 12, 6}, {30, 6, 6}, {30, 12, -1}}) {
            Map<String, Object> fields = Map.of("depositPercentage", invalid[0],
                    "depositWeeksBeforeDeparture", invalid[1], "balanceWeeksBeforeDeparture", invalid[2]);
            mockMvc.perform(put(MINE).header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(fields)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void manager_savesTheQuoteTemplates_andCanChangeThemLater() throws Exception {
        String token = managerToken();
        String documentTemplateId = createDocumentTemplate(token);
        String emailTemplateId = createEmailTemplate(token);

        mockMvc.perform(put(MINE).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(settings(documentTemplateId, emailTemplateId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteDocumentTemplateId").value(documentTemplateId))
                .andExpect(jsonPath("$.quoteEmailTemplateId").value(emailTemplateId));

        mockMvc.perform(put(MINE).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(settings(documentTemplateId, null)))
                .andExpect(status().isOk());

        mockMvc.perform(get(MINE).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteDocumentTemplateId").value(documentTemplateId))
                .andExpect(jsonPath("$.quoteEmailTemplateId").isEmpty())
                .andExpect(jsonPath("$.modifiedAt").isNotEmpty());
    }

    @Test
    void manager_choosingAnUnknownTemplate_returns400() throws Exception {
        mockMvc.perform(put(MINE).header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON).content(settings(UUID.randomUUID().toString(), null)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletingTheChosenEmailTemplate_clearsOnlyThatChoice() throws Exception {
        String token = managerToken();
        String documentTemplateId = createDocumentTemplate(token);
        String emailTemplateId = createEmailTemplate(token);
        mockMvc.perform(put(MINE).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(settings(documentTemplateId, emailTemplateId)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/email-templates/" + emailTemplateId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        // De database maakt de keuze leeg (ON DELETE SET NULL); in de test delen alle verzoeken één transactie,
        // dus de in het geheugen bewaarde instellingen weggooien zoals een nieuw verzoek dat ook zou doen.
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get(MINE).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.quoteDocumentTemplateId").value(documentTemplateId))
                .andExpect(jsonPath("$.quoteEmailTemplateId").isEmpty());
    }

    @Test
    void employee_canReadButNotChange() throws Exception {
        String token = employeeToken();
        mockMvc.perform(get(MINE).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(put(MINE).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(settings(null, null)))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_hasNoAccess() throws Exception {
        mockMvc.perform(get(MINE).header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isForbidden());
    }
}
