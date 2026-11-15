package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
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
 * Een prospect (potentiële klant) met een boeking is een echte boeker: zodra een boeking voor hem wordt aangemaakt
 * (bv. een concept-boeking die wordt vastgelegd door een accommodatie of reiziger toe te voegen) of aan hem wordt
 * gekoppeld, wordt hij ACTIVE. Andere statussen blijven ongemoeid.
 */
class BookingProspectActivationControllerTest extends AbstractBookingControllerTest {

    private String createBooker(String token, String bookerStatus) throws Exception {
        String json = "{\"firstname\":\"Petra\",\"prefix\":null,\"lastname\":\"Prospect\",\"callsign\":\"Petra\","
                + "\"telephone\":\"0611111111\",\"emailaddress\":\"petra@example.com\",\"gender\":\"" + GENDER_MAN + "\","
                + "\"birthdate\":\"1990-01-01\",\"initials\":\"P.\",\"status\":\"" + bookerStatus + "\"}";
        String body = mockMvc.perform(post("/api/bookers").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookerId").asText();
    }

    private String bookerStatus(String token, String bookerId) throws Exception {
        String body = mockMvc.perform(get("/api/bookers/" + bookerId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("status").asText();
    }

    private String createBookingIdFor(String token, String bookerId) throws Exception {
        String body = mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + bookerId + "\",\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("bookingId").asText();
    }

    private void complete(String token, String bookingId) throws Exception {
        mockMvc.perform(post("/api/bookings/" + bookingId + "/complete").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    private void updateBooking(String token, String bookingId, String bookerId, String bookingStatus) throws Exception {
        String booker = bookerId == null ? "null" : "\"" + bookerId + "\"";
        mockMvc.perform(put("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":" + booker + ",\"bookingStatus\":\"" + bookingStatus + "\"}"))
                .andExpect(status().isOk());
    }

    private void createBookingFor(String token, String bookerId) throws Exception {
        mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + bookerId + "\",\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"}"))
                .andExpect(status().isCreated());
    }

    // Een concept-boeking die wordt vastgelegd voor een prospect maakt de prospect ACTIVE
    @Test
    void creatingABookingForAProspect_makesTheProspectActive() throws Exception {
        String token = managerToken();
        String prospectId = createBooker(token, "prospect");
        assertEquals("prospect", bookerStatus(token, prospectId));

        createBookingFor(token, prospectId);

        assertEquals("active", bookerStatus(token, prospectId));
    }

    // Daarna staat hij niet meer in de lijst met prospects
    @Test
    void afterTheBooking_theProspectIsNoLongerListedAsProspect() throws Exception {
        String token = managerToken();
        String prospectId = createBooker(token, "prospect");

        createBookingFor(token, prospectId);

        String body = mockMvc.perform(get("/api/bookers").param("status", "prospect").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        for (JsonNode booker : objectMapper.readTree(body)) {
            assertTrue(!booker.get("bookerId").asText().equals(prospectId), "de prospect is nu een gewone boeker");
        }
    }

    // De overige boekergegevens blijven ongewijzigd
    @Test
    void activation_keepsTheOtherBookerData() throws Exception {
        String token = managerToken();
        String prospectId = createBooker(token, "prospect");

        createBookingFor(token, prospectId);

        JsonNode booker = objectMapper.readTree(mockMvc.perform(get("/api/bookers/" + prospectId)
                        .header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString());
        assertEquals("Petra", booker.get("firstname").asText());
        assertEquals("Prospect", booker.get("lastname").asText());
        assertEquals("petra@example.com", booker.get("emailaddress").asText());
        assertEquals(ORG_TECHPARTNER_ID.toString(), booker.get("tenantOrganization").asText());
    }

    // Een boeker die al ACTIVE is, blijft ACTIVE
    @Test
    void creatingABookingForAnActiveBooker_keepsItActive() throws Exception {
        String token = managerToken();

        createBookingFor(token, BOOKER_TP_4.toString());

        assertEquals("active", bookerStatus(token, BOOKER_TP_4.toString()));
    }

    // Zijn al zijn boekingen afgerond, dan wordt de boeker NIETACTIEF; een nieuwe boeking maakt hem weer ACTIVE
    @Test
    void allBookingsAfgerond_makesTheBookerInactive_andANewBookingReactivatesIt() throws Exception {
        String token = managerToken();
        String bookerId = createBooker(token, "prospect");
        String bookingId = objectMapper.readTree(mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + bookerId + "\",\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("bookingId").asText();
        assertEquals("active", bookerStatus(token, bookerId));

        complete(token, bookingId);
        assertEquals("nietactief", bookerStatus(token, bookerId));

        createBookingFor(token, bookerId);
        assertEquals("active", bookerStatus(token, bookerId));
    }

    // De status van een booker is niet te kiezen: een nieuwe booker is altijd PROSPECT
    @Test
    void creatingABookerWithAnotherStatus_stillStartsAsProspect() throws Exception {
        String token = managerToken();

        String bookerId = createBooker(token, "nietactief");

        assertEquals("prospect", bookerStatus(token, bookerId));
    }

    // Een prospect aan een bestaande boeking koppelen (boeking bijwerken) maakt hem ook ACTIVE
    @Test
    void linkingAProspectToAnExistingBooking_makesTheProspectActive() throws Exception {
        String token = managerToken();
        String prospectId = createBooker(token, "prospect");

        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + prospectId + "\",\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"}"))
                .andExpect(status().isOk());

        assertEquals("active", bookerStatus(token, prospectId));
    }

    // Een mislukte boeking (ongeldige status) laat de prospect ongemoeid
    @Test
    void aFailedBooking_leavesTheProspectUntouched() throws Exception {
        String token = managerToken();
        String prospectId = createBooker(token, "prospect");

        mockMvc.perform(post("/api/bookings").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + prospectId + "\",\"bookingStatus\":\"bestaatniet\"}"))
                .andExpect(status().isBadRequest());

        assertEquals("prospect", bookerStatus(token, prospectId));
    }

    // Ontkoppel je de enige boeking van een boeker, dan is hij weer PROSPECT
    @Test
    void unlinkingTheOnlyBooking_makesTheBookerProspectAgain() throws Exception {
        String token = managerToken();
        String bookerId = createBooker(token, "prospect");
        String bookingId = createBookingIdFor(token, bookerId);
        assertEquals("active", bookerStatus(token, bookerId));

        updateBooking(token, bookingId, null, BOOKING_STATUS_AANVRAAG);

        assertEquals("prospect", bookerStatus(token, bookerId));
    }

    // Verplaats je een boeking naar een andere boeker, dan worden beide boekers opnieuw bepaald
    @Test
    void movingABookingToAnotherBooker_updatesBothBookers() throws Exception {
        String token = managerToken();
        String fromId = createBooker(token, "prospect");
        String toId = createBooker(token, "prospect");
        String bookingId = createBookingIdFor(token, fromId);

        updateBooking(token, bookingId, toId, BOOKING_STATUS_AANVRAAG);

        assertEquals("prospect", bookerStatus(token, fromId));
        assertEquals("active", bookerStatus(token, toId));
    }

    // Verwijder je de laatste boeking van een boeker, dan is hij weer PROSPECT
    @Test
    void deletingTheLastBooking_makesTheBookerProspectAgain() throws Exception {
        String token = managerToken();
        String bookerId = createBooker(token, "prospect");
        String bookingId = createBookingIdFor(token, bookerId);

        mockMvc.perform(delete("/api/bookings/" + bookingId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        assertEquals("prospect", bookerStatus(token, bookerId));
    }

    // Zet je een afgeronde boeking terug, dan wordt een NIETACTIEF-boeker weer ACTIVE
    @Test
    void reopeningAnAfgerondBooking_makesTheBookerActiveAgain() throws Exception {
        String token = managerToken();
        String bookerId = createBooker(token, "prospect");
        String bookingId = createBookingIdFor(token, bookerId);
        complete(token, bookingId);
        assertEquals("nietactief", bookerStatus(token, bookerId));

        mockMvc.perform(post("/api/bookings/" + bookingId + "/status-revert").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"targetStatus\":\"aanvraag\",\"reason\":\"Klant wil toch nog op reis\"}"))
                .andExpect(status().isOk());

        assertEquals("active", bookerStatus(token, bookerId));
    }

    // Bij het bijwerken van een boeker negeert de server een meegestuurde status
    @Test
    void updatingABookerWithAnotherStatus_keepsTheDerivedStatus() throws Exception {
        String token = managerToken();
        String bookerId = createBooker(token, "prospect");
        createBookingFor(token, bookerId);
        String json = "{\"firstname\":\"Petra\",\"prefix\":null,\"lastname\":\"Prospect\",\"callsign\":\"Petra\","
                + "\"telephone\":\"0611111111\",\"emailaddress\":\"petra@example.com\",\"gender\":\"" + GENDER_MAN + "\","
                + "\"birthdate\":\"1990-01-01\",\"initials\":\"P.\",\"status\":\"nietactief\"}";

        mockMvc.perform(put("/api/bookers/" + bookerId).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk());

        assertEquals("active", bookerStatus(token, bookerId));
    }
}
