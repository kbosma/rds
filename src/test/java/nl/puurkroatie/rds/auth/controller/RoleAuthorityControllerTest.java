package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RoleAuthorityControllerTest extends AbstractAuthControllerTest {

    // Test 56: ADMIN: GET /api/role-authorities — 200
    @Test
    void admin_findAll_returns200() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/role-authorities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(21))));
    }

    // Test 57: MANAGER: GET /api/role-authorities — 200 (heeft ROLEAUTHORITY_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/role-authorities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // Test 58: MANAGER: POST /api/role-authorities — 403 (geen ROLEAUTHORITY_WRITE)
    @Test
    void manager_createRoleAuthority_returns403() throws Exception {
        String token = managerToken();

        String roleAuthorityJson = "{\"role\":{\"roleId\":\"" + ROLE_MANAGER_ID + "\"}," +
                "\"authority\":{\"authorityId\":\"d1000000-0000-0000-0000-000000000002\"}}";

        mockMvc.perform(post("/api/role-authorities")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(roleAuthorityJson))
                .andExpect(status().isForbidden());
    }

    // Test 59: EMPLOYEE: GET /api/role-authorities — 403
    @Test
    void employee_findAll_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/role-authorities")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 60: Ongeauthenticeerd: GET /api/role-authorities — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/role-authorities"))
                .andExpect(status().isUnauthorized());
    }
}
