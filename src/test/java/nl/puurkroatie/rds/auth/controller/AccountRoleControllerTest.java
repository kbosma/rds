package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

class AccountRoleControllerTest extends AbstractAuthControllerTest {

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
        String accountRoleJson = "{\"accountId\":\"" + MANAGER_ACCOUNT_ID + "\"," +
                "\"roleId\":\"" + ROLE_EMPLOYEE_ID + "\"}";

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

    // MANAGER: mag zichzelf geen ADMIN-rol geven (privilege escalation) — 403
    @Test
    void manager_assignAdminRole_returns403() throws Exception {
        String token = managerToken();

        String json = "{\"accountId\":\"" + MANAGER_ACCOUNT_ID + "\"," +
                "\"roleId\":\"" + ROLE_ADMIN_ID + "\"}";

        mockMvc.perform(post("/api/account-roles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // ADMIN: mag wel een ADMIN-rol toewijzen — 201
    @Test
    void admin_assignAdminRole_returns201() throws Exception {
        String token = adminToken();

        String json = "{\"accountId\":\"" + MANAGER_ACCOUNT_ID + "\"," +
                "\"roleId\":\"" + ROLE_ADMIN_ID + "\"}";

        mockMvc.perform(post("/api/account-roles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role.description").value("ADMIN"));
    }

    // MANAGER: mag een ADMIN-rol van een account in de eigen organisatie niet intrekken — 403
    @Test
    void manager_removeAdminRole_returns403() throws Exception {
        // Token vooraf ophalen: na de toewijzing zou een nieuwe login van deze manager zelf ADMIN zijn.
        String managerToken = managerToken();
        String adminToken = adminToken();
        String json = "{\"accountId\":\"" + MANAGER_ACCOUNT_ID + "\"," +
                "\"roleId\":\"" + ROLE_ADMIN_ID + "\"}";
        mockMvc.perform(post("/api/account-roles")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/account-roles/" + MANAGER_ACCOUNT_ID + "/" + ROLE_ADMIN_ID)
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/account-roles lekt geen wachtwoord-hash, TOTP-geheim, herstelcodes of Mollie-sleutel
    @Test
    void manager_findAll_doesNotExposeSecrets() throws Exception {
        String body = mockMvc.perform(get("/api/account-roles")
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].account.accountId").exists())
                .andExpect(jsonPath("$[0].role.description").exists())
                .andReturn().getResponse().getContentAsString();

        for (String secretField : new String[]{"passwordHash", "totpSecret", "recoveryCodes", "mollieKey", "$2a$"}) {
            assert !body.contains(secretField) : "Response mag '" + secretField + "' niet bevatten";
        }
    }

    // MANAGER: GET /api/account-roles/{accountId}/{roleId} lekt ook niets
    @Test
    void manager_findById_doesNotExposeSecrets() throws Exception {
        String body = mockMvc.perform(get("/api/account-roles/" + MANAGER_ACCOUNT_ID + "/" + ROLE_MANAGER_ID)
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role.description").value("MANAGER"))
                .andReturn().getResponse().getContentAsString();

        assert !body.contains("passwordHash") && !body.contains("totpSecret") && !body.contains("mollieKey")
                : "Response mag geen geheimen bevatten";
    }
}
