package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookingControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/bookings — geen BOOKING_READ authority → 403
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/bookings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/bookings/{id} — geen BOOKING_READ authority → 403
    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/bookings/" + BOOKING_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/bookings — alleen bookings van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationBookings() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/bookings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode bookings = objectMapper.readTree(response);
        for (JsonNode booking : bookings) {
            assert booking.get("tenantOrganization").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see bookings from own organization";
        }
    }

    // MANAGER: GET /api/bookings/{id} eigen org — 200
    @Test
    void manager_findById_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingId").value(BOOKING_TP_4.toString()));
    }

    // MANAGER: GET /api/bookings/{id} andere org — 404 (service filtert)
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/bookings/" + BOOKING_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/bookings — 201 (heeft BOOKING_WRITE)
    @Test
    void manager_createBooking_returns201() throws Exception {
        String token = managerToken();

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_TP_4 + "\"," +
                "\"fromDate\":\"2026-12-01\",\"untilDate\":\"2026-12-14\"," +
                "\"totalSum\":1500.00}";

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingNumber").value(matchesPattern("BK-\\d{4}-\\d{5}")))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()));
    }

    // MANAGER: PUT /api/bookings/{id} eigen org — 200
    @Test
    void manager_updateBooking_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"," +
                "\"fromDate\":\"2026-07-20\",\"untilDate\":\"2026-07-27\"," +
                "\"totalSum\":1700.00}";

        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingNumber").value("BK-2026-004"));
    }

    // MANAGER: PUT /api/bookings/{id} andere org — 403
    @Test
    void manager_updateBooking_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"," +
                "\"fromDate\":\"2026-07-01\",\"untilDate\":\"2026-07-14\"," +
                "\"totalSum\":9999.00}";

        mockMvc.perform(put("/api/bookings/" + BOOKING_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // MANAGER: DELETE /api/bookings/{id} eigen org — 204 (zolang er geen documenten of betalingen aan hangen)
    @Test
    void manager_deleteBooking_ownOrganization_returns204() throws Exception {
        String token = managerToken();
        String created = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("bookingId").asText();

        mockMvc.perform(delete("/api/bookings/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // Een boeking met documenten en betalingen (geschiedenis) mag niet verwijderd worden — 409
    @Test
    void manager_deleteBooking_withDocumentsAndPayments_returns409() throws Exception {
        mockMvc.perform(delete("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isConflict());
    }

    // MANAGER: DELETE /api/bookings/{id} andere org — 403
    @Test
    void manager_deleteBooking_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/bookings/" + BOOKING_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: GET /api/bookings — alleen bookings van eigen organisatie
    @Test
    void employee_findAll_returnsOnlyOwnOrganizationBookings() throws Exception {
        String token = employeeToken();

        String response = mockMvc.perform(get("/api/bookings")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode bookings = objectMapper.readTree(response);
        for (JsonNode booking : bookings) {
            assert booking.get("tenantOrganization").asText().equals(ORG_PUURKROATIE_ID.toString())
                    : "Employee should only see bookings from own organization";
        }
    }

    // EMPLOYEE: GET /api/bookings/{id} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/bookings/" + BOOKING_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingId").value(BOOKING_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/bookings/{id} andere org — 404 (service filtert)
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/bookings — 201 (heeft BOOKING_WRITE)
    @Test
    void employee_createBooking_returns201() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_PK_1 + "\"," +
                "\"fromDate\":\"2026-11-01\",\"untilDate\":\"2026-11-14\"," +
                "\"totalSum\":1200.00}";

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingNumber").value(matchesPattern("BK-\\d{4}-\\d{5}")))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_PUURKROATIE_ID.toString()));
    }

    // EMPLOYEE: PUT /api/bookings/{id} eigen org — 200
    @Test
    void employee_updateBooking_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"," +
                "\"fromDate\":\"2026-07-01\",\"untilDate\":\"2026-07-14\"," +
                "\"totalSum\":2500.00}";

        mockMvc.perform(put("/api/bookings/" + BOOKING_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingNumber").value("BK-2026-001"));
    }

    // EMPLOYEE: PUT /api/bookings/{id} andere org — 403
    @Test
    void employee_updateBooking_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"," +
                "\"fromDate\":\"2026-07-20\",\"untilDate\":\"2026-07-27\"," +
                "\"totalSum\":9999.00}";

        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE /api/bookings/{id} eigen org — 204 (zolang er geen documenten of betalingen aan hangen)
    @Test
    void employee_deleteBooking_ownOrganization_returns204() throws Exception {
        String token = employeeToken();
        String created = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_PK_1 + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).get("bookingId").asText();

        mockMvc.perform(delete("/api/bookings/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    // EMPLOYEE: een boeking met documenten/betalingen mag ook niet weg — 409
    @Test
    void employee_deleteBooking_withDocumentsAndPayments_returns409() throws Exception {
        mockMvc.perform(delete("/api/bookings/" + BOOKING_PK_2)
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isConflict());
    }

    // EMPLOYEE: DELETE /api/bookings/{id} andere org — 403
    @Test
    void employee_deleteBooking_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/bookings — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/bookings"))
                .andExpect(status().isUnauthorized());
    }

    // MANAGER: POST /api/bookings met een booker van een andere organisatie — 403
    @Test
    void manager_createBooking_withBookerOfOtherOrganization_returns403() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_PK_1 + "\"}"))
                .andExpect(status().isForbidden());
    }

    // MANAGER: PUT /api/bookings/{id} (eigen boeking) met een booker van een andere organisatie — 403
    @Test
    void manager_updateBooking_withBookerOfOtherOrganization_returns403() throws Exception {
        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_PK_1 + "\"}"))
                .andExpect(status().isForbidden());
    }

    // De status wijzig je niet via PUT: dat doen offerte versturen, bevestigen, betalingen en datums; terugzetten gaat
    // met een reden. Een andere status in het verzoek geeft 400 en de status blijft.
    @Test
    void manager_updateBooking_withAnotherStatus_returns400_andKeepsTheStatus() throws Exception {
        String token = managerToken();
        for (String other : new String[] {"offerte", "opreis", "weerthuis", "afgerond"}) {
            mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4)
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"bookingStatus\":\"" + other + "\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                    .andExpect(status().isBadRequest());
        }
        mockMvc.perform(get("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.bookingStatus").value("aanvraag"));
    }

    // Een boeking ontstaat alleen vanuit een bestaande booker — zonder booker 400
    @Test
    void manager_createBooking_withoutBooker_returns400() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"}"))
                .andExpect(status().isBadRequest());
    }

    // Een nieuwe boeking begint altijd als AANVRAAG — een andere status bij aanmaken is 400
    @Test
    void manager_createBooking_withOtherStatusThanAanvraag_returns400() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"betaald\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                .andExpect(status().isBadRequest());
    }

    // Offerte bevestigen: alleen vanuit OFFERTE; daarna BOEKING met het moment van bevestigen
    @Test
    void manager_confirmQuote_fromOfferte_setsStatusBoekingAndConfirmedAt() throws Exception {
        String token = managerToken();
        forceStatus(BOOKING_TP_4, "offerte");

        String confirm = "{\"bookingStatus\":\"offerte\",\"bookerId\":\"" + BOOKER_TP_4 + "\",\"quoteConfirmed\":true}";
        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(confirm))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quoteConfirmed").value(true))
                .andExpect(jsonPath("$.quoteConfirmedAt").isNotEmpty())
                .andExpect(jsonPath("$.bookingStatus").value("boeking"));

        // terugdraaien via het vinkje kan niet
        String unconfirm = "{\"bookingStatus\":\"boeking\",\"bookerId\":\"" + BOOKER_TP_4 + "\",\"quoteConfirmed\":false}";
        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(unconfirm))
                .andExpect(status().isBadRequest());
    }

    // Bevestigen kan niet vanuit een andere status dan OFFERTE
    @Test
    void manager_confirmQuote_fromAanvraag_returns400() throws Exception {
        String token = managerToken();
        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"aanvraag\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"aanvraag\",\"bookerId\":\"" + BOOKER_TP_4 + "\",\"quoteConfirmed\":true}"))
                .andExpect(status().isBadRequest());
    }

    // Bevestigen kan niet zonder hoofdboeker
    @Test
    void manager_confirmQuote_withoutBooker_returns400() throws Exception {
        String token = managerToken();
        forceStatus(BOOKING_TP_4, "offerte");
        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"offerte\",\"bookerId\":null}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"offerte\",\"bookerId\":null,\"quoteConfirmed\":true}"))
                .andExpect(status().isBadRequest());
    }

    // Na bevestigen blijven vinkje en moment van bevestigen staan bij latere statuswijzigingen
    @Test
    void manager_confirmedQuote_keepsConfirmedAtOnLaterUpdates() throws Exception {
        String token = managerToken();
        forceStatus(BOOKING_TP_4, "offerte");
        String confirmedAt = objectMapper.readTree(mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"offerte\",\"bookerId\":\"" + BOOKER_TP_4 + "\",\"quoteConfirmed\":true}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("quoteConfirmedAt").asText();

        mockMvc.perform(put("/api/bookings/" + BOOKING_TP_4).header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"boeking\",\"bookerId\":\"" + BOOKER_TP_4 + "\",\"quoteConfirmed\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingStatus").value("boeking"))
                .andExpect(jsonPath("$.quoteConfirmed").value(true))
                .andExpect(jsonPath("$.quoteConfirmedAt").value(confirmedAt));
    }

    // MANAGER: POST /api/bookings met een onbekende status — 400
    @Test
    void manager_createBooking_withUnknownStatus_returns400() throws Exception {
        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingStatus\":\"bestaatniet\"}"))
                .andExpect(status().isBadRequest());
    }
}
