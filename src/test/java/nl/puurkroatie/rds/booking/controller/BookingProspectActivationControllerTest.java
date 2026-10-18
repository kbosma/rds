package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

    // Een niet-actieve boeker wordt niet vanzelf weer actief: dat is een bewuste keuze
    @Test
    void creatingABookingForAnInactiveBooker_doesNotReactivateIt() throws Exception {
        String token = managerToken();
        String inactiveId = createBooker(token, "nietactief");

        createBookingFor(token, inactiveId);

        assertEquals("nietactief", bookerStatus(token, inactiveId));
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
}
