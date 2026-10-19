package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Een koppeling tussen een betaling en een boeking wordt nooit losgemaakt. Een betaling die aan de verkeerde boeking
 * hangt, wordt herkoppeld, met reden; elke herkoppeling is geregistreerd (wie, wanneer, van/naar, waarom).
 *
 * Seeddata (TechPartner): betaling 004 hangt aan boeking BK-2026-004, betaling 005 aan BK-2026-005 en 006 aan BK-2026-006.
 */
class PaymentRelinkControllerTest extends AbstractBookingControllerTest {

    private static final String URL = "/api/booking-mollie-payments";
    private static final String PAYMENT_TP_4 = "08000000-0000-0000-0000-000000000004";
    private static final String BOOKING_TP_5 = "01000000-0000-0000-0000-000000000005";
    private static final String BOOKING_TP_6 = "01000000-0000-0000-0000-000000000006";

    private ResultActions relink(String token, String paymentId, String targetBookingId, String reason) throws Exception {
        String json = objectMapper.writeValueAsString(Map.of("targetBookingId", targetBookingId, "reason", reason));
        return mockMvc.perform(post(URL + "/" + paymentId + "/relink").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private JsonNode json(String token, String url) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get(url).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private boolean linked(String token, String bookingId, String paymentId) throws Exception {
        for (JsonNode link : json(token, URL + "/" + bookingId)) {
            if (paymentId.equals(link.get("molliePaymentId").asText())) return true;
        }
        return false;
    }

    // MANAGER: de betaling verhuist, en de herkoppeling is geregistreerd met boekingnummers, naam en reden
    @Test
    void manager_relink_movesThePaymentAndRegistersIt() throws Exception {
        String token = managerToken();
        assertTrue(linked(token, BOOKING_TP_4.toString(), PAYMENT_TP_4));

        String body = relink(token, PAYMENT_TP_4, BOOKING_TP_5, "Per ongeluk aan de verkeerde boeking gehangen")
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode created = objectMapper.readTree(body);
        assertEquals("BK-2026-004", created.get("fromBookingNumber").asText());
        assertEquals("BK-2026-005", created.get("toBookingNumber").asText());
        assertEquals("Per ongeluk aan de verkeerde boeking gehangen", created.get("reason").asText());
        assertEquals("Pieter de Groot", created.get("createdByName").asText());

        assertTrue(!linked(token, BOOKING_TP_4.toString(), PAYMENT_TP_4), "niet meer aan de oude boeking");
        assertTrue(linked(token, BOOKING_TP_5, PAYMENT_TP_4), "nu aan de nieuwe boeking");
    }

    // De historie blijft: elke herkoppeling staat erin, oudste eerst
    @Test
    void relinks_areKeptInOrder() throws Exception {
        String token = managerToken();
        relink(token, PAYMENT_TP_4, BOOKING_TP_5, "Eerste correctie van de koppeling").andExpect(status().isCreated());
        relink(token, PAYMENT_TP_4, BOOKING_TP_6, "Tweede correctie van de koppeling").andExpect(status().isCreated());

        JsonNode history = json(token, URL + "/" + PAYMENT_TP_4 + "/relinks");
        assertEquals(2, history.size());
        assertEquals("BK-2026-005", history.get(0).get("toBookingNumber").asText());
        assertEquals("BK-2026-005", history.get(1).get("fromBookingNumber").asText());
        assertEquals("BK-2026-006", history.get(1).get("toBookingNumber").asText());
        assertTrue(linked(token, BOOKING_TP_6, PAYMENT_TP_4));
    }

    @Test
    void admin_relink_withinTheOrganization_returns201() throws Exception {
        relink(adminToken(), PAYMENT_TP_4, BOOKING_TP_5, "Beheerder corrigeert de koppeling").andExpect(status().isCreated());
    }

    // Dezelfde boeking als nu heeft geen zin — 400
    @Test
    void relink_toTheCurrentBooking_returns400() throws Exception {
        relink(managerToken(), PAYMENT_TP_4, BOOKING_TP_4.toString(), "Geen echte wijziging bedoeld").andExpect(status().isBadRequest());
    }

    // De reden is verplicht (minstens 5 tekens)
    @Test
    void relink_withoutReason_returns400() throws Exception {
        relink(managerToken(), PAYMENT_TP_4, BOOKING_TP_5, "").andExpect(status().isBadRequest());
        relink(managerToken(), PAYMENT_TP_4, BOOKING_TP_5, "ok").andExpect(status().isBadRequest());
        relink(managerToken(), PAYMENT_TP_4, BOOKING_TP_5, "      ").andExpect(status().isBadRequest());
    }

    // Een betaling blijft binnen één organisatie: een boeking van een andere organisatie mag niet
    @Test
    void relink_toBookingOfOtherOrganization_returns403() throws Exception {
        relink(managerToken(), PAYMENT_TP_4, BOOKING_PK_1.toString(), "Hoort bij een andere organisatie").andExpect(status().isForbidden());
        relink(adminToken(), PAYMENT_TP_4, BOOKING_PK_1.toString(), "Ook een beheerder mag dit niet").andExpect(status().isForbidden());
    }

    // Een betaling van een andere organisatie is niet te herkoppelen
    @Test
    void manager_relink_paymentOfOtherOrganization_returns403() throws Exception {
        relink(managerToken(), "08000000-0000-0000-0000-000000000001", BOOKING_PK_2.toString(), "Andere organisatie dan de mijne").andExpect(status().isForbidden());
    }

    // EMPLOYEE heeft geen PAYMENT_RELINK — 403
    @Test
    void employee_relink_returns403() throws Exception {
        relink(employeeToken(), "08000000-0000-0000-0000-000000000001", BOOKING_PK_2.toString(), "Geen recht om te herkoppelen").andExpect(status().isForbidden());
    }

    // Een koppeling losmaken bestaat niet meer
    @Test
    void unlinking_doesNotExist() throws Exception {
        mockMvc.perform(delete(URL + "/" + BOOKING_TP_4 + "/" + PAYMENT_TP_4).header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isMethodNotAllowed());
        assertTrue(linked(managerToken(), BOOKING_TP_4.toString(), PAYMENT_TP_4));
    }

    // Een boeking waar een betaling van is weggekoppeld heeft geschiedenis en kan niet meer verwijderd worden
    @Test
    void aBookingThatHadAPaymentRelinkedAwayCannotBeDeleted() throws Exception {
        String token = managerToken();
        String fresh = createBooking(token);
        String other = createBooking(token);
        String payment = objectMapper.readTree(mockMvc.perform(post("/api/mollie/payments").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":10,\"currency\":\"EUR\",\"description\":\"Test\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("molliePaymentId").asText();
        mockMvc.perform(post(URL).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"bookingId\":\"" + fresh + "\",\"molliePaymentId\":\"" + payment + "\"}")).andExpect(status().isCreated());
        relink(token, payment, other, "Naar de juiste boeking verplaatst").andExpect(status().isCreated());

        mockMvc.perform(delete("/api/bookings/" + fresh).header("Authorization", "Bearer " + token)).andExpect(status().isConflict());
    }

    private String createBooking(String token) throws Exception {
        return objectMapper.readTree(mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("bookingId").asText();
    }
}
