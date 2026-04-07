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

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"," +
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

    // MANAGER: DELETE /api/bookings/{id} eigen org — 204
    @Test
    void manager_deleteBooking_ownOrganization_returns204() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/bookings/" + BOOKING_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
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

        String json = "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\"," +
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

    // EMPLOYEE: DELETE /api/bookings/{id} eigen org — 204
    @Test
    void employee_deleteBooking_ownOrganization_returns204() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/bookings/" + BOOKING_PK_2)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
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
}
