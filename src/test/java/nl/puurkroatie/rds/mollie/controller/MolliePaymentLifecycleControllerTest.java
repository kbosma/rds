package nl.puurkroatie.rds.mollie.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Levenscyclus van een betaling: een betaling die nog niet bij Mollie bestaat (geen Mollie-id) is een aankondiging en
 * mag nog worden aangepast; zodra er een Mollie-id is, is ze geschiedenis. Het Mollie-id en de checkout-URL komen
 * alleen van Mollie en zijn niet door een client te zetten.
 */
class MolliePaymentLifecycleControllerTest extends AbstractControllerTest {

    private static final String URL = "/api/mollie/payments";
    private static final String PAYMENT_TP_4 = "08000000-0000-0000-0000-000000000004"; // heeft Mollie-id tr_test004

    private JsonNode createAnnouncement(String token, String description, double amount) throws Exception {
        String json = "{\"amount\":" + amount + ",\"currency\":\"EUR\",\"description\":\"" + description + "\","
                + "\"molliePaymentExternalId\":\"tr_door_client\",\"checkoutUrl\":\"https://evil.example/pay\"}";
        String body = mockMvc.perform(post(URL).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    @Test
    void create_ignoresMollieIdAndCheckoutUrlFromTheClient() throws Exception {
        JsonNode created = createAnnouncement(managerToken(), "Aankondiging", 100.0);

        assertTrue(created.get("molliePaymentExternalId") == null || created.get("molliePaymentExternalId").isNull());
        assertTrue(created.get("checkoutUrl") == null || created.get("checkoutUrl").isNull());
    }

    @Test
    void update_beforeMollie_changesDescriptionAndAmountButNotTheMollieFields() throws Exception {
        String token = managerToken();
        String id = createAnnouncement(token, "Voorschot", 100.0).get("molliePaymentId").asText();

        String json = "{\"amount\":250.50,\"currency\":\"EUR\",\"description\":\"Voorschot gecorrigeerd\","
                + "\"molliePaymentExternalId\":\"tr_sluipend\",\"checkoutUrl\":\"https://evil.example/pay\"}";
        String body = mockMvc.perform(put(URL + "/" + id).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode updated = objectMapper.readTree(body);

        assertEquals("Voorschot gecorrigeerd", updated.get("description").asText());
        assertEquals(250.50, updated.get("amount").asDouble());
        assertTrue(updated.get("molliePaymentExternalId") == null || updated.get("molliePaymentExternalId").isNull(),
                "een client kan geen Mollie-id zetten");
        assertTrue(updated.get("checkoutUrl") == null || updated.get("checkoutUrl").isNull());
    }

    @Test
    void update_afterMollie_returns409AndChangesNothing() throws Exception {
        String token = managerToken();
        String before = mockMvc.perform(get(URL + "/" + PAYMENT_TP_4).header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        String json = "{\"amount\":1.00,\"currency\":\"EUR\",\"description\":\"Gewijzigd\",\"molliePaymentExternalId\":null}";
        mockMvc.perform(put(URL + "/" + PAYMENT_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isConflict());

        String after = mockMvc.perform(get(URL + "/" + PAYMENT_TP_4).header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        assertEquals(before, after);
        assertEquals("tr_test004", objectMapper.readTree(after).get("molliePaymentExternalId").asText());
    }
}
