package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RoleControllerTest extends AbstractControllerTest {

    // Test 40: ADMIN: GET /api/roles — 200
    @Test
    void admin_findAll_returns200() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // Test 41: ADMIN: POST /api/roles — 201
    @Test
    void admin_createRole_returns201() throws Exception {
        String token = adminToken();

        mockMvc.perform(post("/api/roles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"TESTROL\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("TESTROL"));
    }

    // Test 42: MANAGER: GET /api/roles — 200 (heeft ROLE_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // Test 43: MANAGER: POST /api/roles — 403 (geen ROLE_WRITE)
    @Test
    void manager_createRole_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(post("/api/roles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"TESTROL\"}"))
                .andExpect(status().isForbidden());
    }

    // Test 44: EMPLOYEE: GET /api/roles — 403
    @Test
    void employee_findAll_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/roles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 45: Ongeauthenticeerd: GET /api/roles — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/roles"))
                .andExpect(status().isUnauthorized());
    }
}
