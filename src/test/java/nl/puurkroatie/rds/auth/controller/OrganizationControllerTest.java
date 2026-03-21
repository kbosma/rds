package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OrganizationControllerTest extends AbstractAuthControllerTest {

    // Test 35: ADMIN: GET /api/organizations — 200
    @Test
    void admin_findAll_returns200() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/organizations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))));
    }

    // Test 36: ADMIN: GET /api/organizations/{id} — 200
    @Test
    void admin_findById_returns200() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/organizations/" + ORG_PUURKROATIE_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.organizationId").value(ORG_PUURKROATIE_ID.toString()))
                .andExpect(jsonPath("$.name").value("Puurkroatie"));
    }

    // Test 37: MANAGER: GET /api/organizations — 403 (geen ORGANIZATION_READ)
    @Test
    void manager_findAll_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/organizations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 38: EMPLOYEE: GET /api/organizations — 403
    @Test
    void employee_findAll_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/organizations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 39: Ongeauthenticeerd: GET /api/organizations — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/organizations"))
                .andExpect(status().isUnauthorized());
    }
}
