package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GenderControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/genders — alle genders (>= 3)
    @Test
    void admin_findAll_returnsAllGenders() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/genders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // ADMIN: GET /api/genders/{id} — specifiek gender opvraagbaar
    @Test
    void admin_findById_returnsGender() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/genders/" + GENDER_MAN)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.genderId").value(GENDER_MAN.toString()))
                .andExpect(jsonPath("$.displayname").value("man"));
    }

    // MANAGER: GET /api/genders — 200 (heeft BOOKING_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/genders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // EMPLOYEE: GET /api/genders — 200 (heeft BOOKING_READ)
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/genders")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // Ongeauthenticeerd: GET /api/genders — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/genders"))
                .andExpect(status().isUnauthorized());
    }
}
