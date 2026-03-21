package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BookingStatusControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/booking-statuses — alle statussen (>= 6)
    @Test
    void admin_findAll_returnsAllStatuses() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/booking-statuses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))));
    }

    // ADMIN: GET /api/booking-statuses/{id} — specifieke status opvraagbaar
    @Test
    void admin_findById_returnsStatus() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/booking-statuses/" + BOOKING_STATUS_CONCEPT)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingstatusId").value(BOOKING_STATUS_CONCEPT.toString()))
                .andExpect(jsonPath("$.displayname").value("concept"));
    }

    // MANAGER: GET /api/booking-statuses — 200 (heeft BOOKING_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/booking-statuses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))));
    }

    // EMPLOYEE: GET /api/booking-statuses — 200 (heeft BOOKING_READ)
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/booking-statuses")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))));
    }

    // Ongeauthenticeerd: GET /api/booking-statuses — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/booking-statuses"))
                .andExpect(status().isUnauthorized());
    }
}
