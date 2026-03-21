package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthorityControllerTest extends AbstractControllerTest {

    // Test 46: ADMIN: GET /api/authorities — 200
    @Test
    void admin_findAll_returns200() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/authorities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(21))));
    }

    // Test 47: MANAGER: GET /api/authorities — 200 (heeft AUTHORITY_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/authorities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(21))));
    }

    // Test 48: MANAGER: POST /api/authorities — 403 (geen AUTHORITY_WRITE)
    @Test
    void manager_createAuthority_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(post("/api/authorities")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"TEST_AUTHORITY\"}"))
                .andExpect(status().isForbidden());
    }

    // Test 49: EMPLOYEE: GET /api/authorities — 403
    @Test
    void employee_findAll_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/authorities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 50: Ongeauthenticeerd: GET /api/authorities — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/authorities"))
                .andExpect(status().isUnauthorized());
    }
}
