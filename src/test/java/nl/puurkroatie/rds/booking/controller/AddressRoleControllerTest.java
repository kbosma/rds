package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AddressRoleControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/address-roles — alle address roles (>= 4)
    @Test
    void admin_findAll_returnsAllAddressRoles() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/address-roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))));
    }

    // ADMIN: GET /api/address-roles/{id} — specifieke address role opvraagbaar
    @Test
    void admin_findById_returnsAddressRole() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/address-roles/" + ADDRESSROLE_WOON)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addressroleId").value(ADDRESSROLE_WOON.toString()))
                .andExpect(jsonPath("$.displayname").value("woon"));
    }

    // MANAGER: GET /api/address-roles — 200 (heeft BOOKING_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/address-roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))));
    }

    // EMPLOYEE: GET /api/address-roles — 200 (heeft BOOKING_READ)
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/address-roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(4))));
    }

    // Ongeauthenticeerd: GET /api/address-roles — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/address-roles"))
                .andExpect(status().isUnauthorized());
    }
}
