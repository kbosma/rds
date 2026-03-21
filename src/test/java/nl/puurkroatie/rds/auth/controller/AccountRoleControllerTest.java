package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountRoleControllerTest extends AbstractControllerTest {

    // Test 51: ADMIN: GET /api/account-roles — 200
    @Test
    void admin_findAll_returns200() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/account-roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // Test 52: MANAGER: GET /api/account-roles — 200 (heeft ACCOUNTROLE_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/account-roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // Test 53: MANAGER: POST /api/account-roles — 201 (heeft ACCOUNTROLE_WRITE)
    @Test
    void manager_createAccountRole_returns201() throws Exception {
        String token = managerToken();

        // Koppel manager's account aan EMPLOYEE role (extra role toewijzing)
        String accountRoleJson = "{\"account\":{\"accountId\":\"" + MANAGER_ACCOUNT_ID + "\"}," +
                "\"role\":{\"roleId\":\"" + ROLE_EMPLOYEE_ID + "\"}}";

        mockMvc.perform(post("/api/account-roles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(accountRoleJson))
                .andExpect(status().isCreated());
    }

    // Test 54: EMPLOYEE: GET /api/account-roles — 403
    @Test
    void employee_findAll_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/account-roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 55: Ongeauthenticeerd: GET /api/account-roles — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/account-roles"))
                .andExpect(status().isUnauthorized());
    }
}
