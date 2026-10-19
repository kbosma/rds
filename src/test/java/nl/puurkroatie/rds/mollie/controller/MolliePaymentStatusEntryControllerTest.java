package nl.puurkroatie.rds.mollie.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;

import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * De statushistorie van een betaling toont wie een regel aanmaakte met een leesbare naam in plaats van een id.
 * Seeddata (betaling BK-2026-001): OPEN door medewerker Maria Jansen, PENDING door boeker Klaas van Houten,
 * PAID door het systeem (Mollie, geen aanmaker).
 */
class MolliePaymentStatusEntryControllerTest extends AbstractControllerTest {

    private static final String PAYMENT_PK_1 = "08000000-0000-0000-0000-000000000001";
    private static final String PAYMENT_TP_4 = "08000000-0000-0000-0000-000000000004"; // alleen OPEN, organisatie TechPartner
    private static final String STATUS_ENTRY_URL = "/api/mollie/payment-status-entries";

    private JsonNode entryWithStatus(JsonNode entries, String status) {
        for (JsonNode entry : entries) {
            if (status.equals(entry.get("status").asText())) {
                return entry;
            }
        }
        throw new AssertionError("Geen statusregel met status " + status);
    }

    @Test
    void statusHistory_showsReadableNameOfCreator() throws Exception {
        String body = mockMvc.perform(get("/api/mollie/payment-status-entries/by-payment/" + PAYMENT_PK_1)
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode entries = objectMapper.readTree(body);

        assertEquals("Maria Jansen", entryWithStatus(entries, "open").get("createdByName").asText());
        assertEquals("Klaas van Houten", entryWithStatus(entries, "pending").get("createdByName").asText());
    }

    @Test
    void statusHistory_systemEntryHasNoCreatorName() throws Exception {
        String body = mockMvc.perform(get("/api/mollie/payment-status-entries/by-payment/" + PAYMENT_PK_1)
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode paid = entryWithStatus(objectMapper.readTree(body), "paid");

        assertTrue(paid.get("createdBy").isNull());
        assertTrue(paid.get("createdByName") == null || paid.get("createdByName").isNull());
    }

    private org.springframework.test.web.servlet.ResultActions correct(String token, String paymentId, String status, String reason) throws Exception {
        String json = objectMapper.writeValueAsString(java.util.Map.of("status", status, "reason", reason));
        return mockMvc.perform(post(STATUS_ENTRY_URL + "/by-payment/" + paymentId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    // MANAGER: een correctie is een nieuwe regel met wie, reden en markering; de bestaande regels blijven staan
    @Test
    void manager_correction_addsNewEntryAndKeepsHistory() throws Exception {
        String token = managerToken();
        String before = mockMvc.perform(get(STATUS_ENTRY_URL + "/by-payment/" + PAYMENT_TP_4).header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        String created = correct(token, PAYMENT_TP_4, "paid", "Klant betaalde per bankoverschrijving")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode entry = objectMapper.readTree(created);
        assertEquals("paid", entry.get("status").asText());
        assertTrue(entry.get("correction").asBoolean());
        assertEquals("Klant betaalde per bankoverschrijving", entry.get("reason").asText());
        assertEquals("Pieter de Groot", entry.get("createdByName").asText());

        JsonNode after = objectMapper.readTree(mockMvc.perform(get(STATUS_ENTRY_URL + "/by-payment/" + PAYMENT_TP_4)
                        .header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString());
        JsonNode old = objectMapper.readTree(before);
        assertEquals(old.size() + 1, after.size());
        for (int i = 0; i < old.size(); i++) { // de oorspronkelijke regels zijn ongewijzigd
            JsonNode original = old.get(i);
            JsonNode kept = null;
            for (JsonNode candidate : after) {
                if (candidate.get("molliePaymentStatusEntryId").asText().equals(original.get("molliePaymentStatusEntryId").asText())) kept = candidate;
            }
            assertEquals(original.get("status").asText(), kept.get("status").asText());
            assertEquals(original.get("createdAt").asText(), kept.get("createdAt").asText());
            assertTrue(!kept.get("correction").asBoolean());
        }
    }

    // ADMIN mag ook corrigeren
    @Test
    void admin_correction_returns201() throws Exception {
        correct(adminToken(), PAYMENT_TP_4, "canceled", "Boeking is geannuleerd").andExpect(status().isCreated());
    }

    // EMPLOYEE: geen PAYMENT_CORRECT — 403
    @Test
    void employee_correction_returns403() throws Exception {
        correct(employeeToken(), PAYMENT_PK_1, "canceled", "Boeking is geannuleerd").andExpect(status().isForbidden());
    }

    // MANAGER: betaling van een andere organisatie — 403
    @Test
    void manager_correction_otherOrganization_returns403() throws Exception {
        correct(managerToken(), PAYMENT_PK_1, "canceled", "Boeking is geannuleerd").andExpect(status().isForbidden());
    }

    // Alleen open, paid, failed en canceled mogen met de hand; PENDING, AUTHORIZED en EXPIRED bepaalt Mollie
    @Test
    void correction_withMollieOnlyStatus_returns400() throws Exception {
        for (String mollieOnly : new String[]{"pending", "authorized", "expired"}) {
            correct(managerToken(), PAYMENT_TP_4, mollieOnly, "Handmatig gezet").andExpect(status().isBadRequest());
        }
    }

    @Test
    void correction_withUnknownStatus_returns400() throws Exception {
        correct(managerToken(), PAYMENT_TP_4, "bestaatniet", "Handmatig gezet").andExpect(status().isBadRequest());
    }

    // De reden is verplicht (minstens 5 tekens)
    @Test
    void correction_withoutReason_returns400() throws Exception {
        correct(managerToken(), PAYMENT_TP_4, "paid", "").andExpect(status().isBadRequest());
        correct(managerToken(), PAYMENT_TP_4, "paid", "ok").andExpect(status().isBadRequest());
        correct(managerToken(), PAYMENT_TP_4, "paid", "     ").andExpect(status().isBadRequest());
    }

    // Dezelfde status als nu heeft geen zin — 400
    @Test
    void correction_toCurrentStatus_returns400() throws Exception {
        correct(managerToken(), PAYMENT_TP_4, "open", "Hetzelfde als nu").andExpect(status().isBadRequest());
    }

    // De historie is alleen-toevoegen: wijzigen, verwijderen en een losse regel toevoegen bestaan niet meer
    @Test
    void statusEntries_cannotBeChangedDeletedOrAddedDirectly() throws Exception {
        String token = managerToken();
        String id = "09000000-0000-0000-0000-000000000004";
        String json = "{\"molliePaymentId\":\"" + PAYMENT_TP_4 + "\",\"status\":\"paid\"}";

        mockMvc.perform(put(STATUS_ENTRY_URL + "/" + id).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isNotFound());
        mockMvc.perform(delete(STATUS_ENTRY_URL + "/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
        mockMvc.perform(post(STATUS_ENTRY_URL).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isMethodNotAllowed());
    }
}
