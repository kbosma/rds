package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RoleControllerTest extends AbstractAuthControllerTest {

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

    // MANAGER: GET /api/roles — alleen de rollen van de eigen organisatie (zijn kopieën van MANAGER en EMPLOYEE)
    @Test
    void manager_findAll_returnsTheRolesOfTheOwnOrganization() throws Exception {
        mockMvc.perform(get("/api/roles")
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].systemKey", containsInAnyOrder("EMPLOYEE", "MANAGER")))
                .andExpect(jsonPath("$[*].tenantOrganization", everyItem(is(ORG_TECHPARTNER_ID.toString()))))
                .andExpect(jsonPath("$[*].editable", everyItem(is(false))));
    }

    // MANAGER: POST /api/roles — een eigen rol in de eigen organisatie (ROLE_CREATE sinds V24)
    @Test
    void manager_createRole_inTheOwnOrganization_returns201() throws Exception {
        mockMvc.perform(post("/api/roles")
                        .header("Authorization", "Bearer " + managerToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"Boekhouder\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()))
                .andExpect(jsonPath("$.systemKey").doesNotExist())
                .andExpect(jsonPath("$.editable").value(true));
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
