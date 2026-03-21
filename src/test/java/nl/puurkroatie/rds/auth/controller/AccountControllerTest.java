package nl.puurkroatie.rds.auth.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountControllerTest extends AbstractControllerTest {

    // Test 22: ADMIN: GET /api/accounts — alle accounts (>= 3)
    @Test
    void admin_findAll_returnsAllAccounts() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/accounts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // Test 23: ADMIN: GET /api/accounts/{id} — elk account
    @Test
    void admin_findById_returnsAnyAccount() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/accounts/" + MANAGER_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountId").value(MANAGER_ACCOUNT_ID.toString()))
                .andExpect(jsonPath("$.userName").value("pieter.degroot"));
    }

    // Test 24: MANAGER: GET /api/accounts — alleen accounts van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationAccounts() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/accounts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode accounts = objectMapper.readTree(response);
        // Manager (TechPartner BV) should only see accounts from own organization
        java.util.Set<String> techPartnerPersonIds = java.util.Set.of(
                MANAGER_PERSON_ID.toString(),
                EMPLOYEE_TECHPARTNER_PERSON_ID.toString());
        for (JsonNode account : accounts) {
            assert techPartnerPersonIds.contains(account.get("personId").asText())
                    : "Manager should only see accounts from own organization";
        }
    }

    // Test 25: MANAGER: PUT /api/accounts/{id} met mustChangePassword=true — 200
    @Test
    void manager_updateAccount_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        String accountJson = "{\"userName\":\"pieter.degroot\",\"password\":\"password123\"," +
                "\"personId\":\"" + MANAGER_PERSON_ID + "\"," +
                "\"locked\":false,\"mustChangePassword\":true," +
                "\"expiresAt\":\"2027-06-01T00:00:00\"}";

        mockMvc.perform(put("/api/accounts/" + MANAGER_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(accountJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(true));
    }

    // Test 26: MANAGER: PUT /api/accounts in andere organisatie — 403
    @Test
    void manager_updateAccount_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String accountJson = "{\"userName\":\"jan.vanbergen\",\"password\":\"password123\"," +
                "\"personId\":\"" + ADMIN_PERSON_ID + "\"," +
                "\"locked\":false,\"mustChangePassword\":false," +
                "\"expiresAt\":\"2027-01-01T00:00:00\"}";

        mockMvc.perform(put("/api/accounts/" + ADMIN_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(accountJson))
                .andExpect(status().isForbidden());
    }

    // Test 27: EMPLOYEE: GET /api/accounts — alleen eigen account (1 resultaat)
    @Test
    void employee_findAll_returnsOnlyOwnAccount() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accounts")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].accountId").value(EMPLOYEE_ACCOUNT_ID.toString()));
    }

    // Test 28: EMPLOYEE: GET /api/accounts/{eigen-id} — 200
    @Test
    void employee_findById_ownAccount_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accounts/" + EMPLOYEE_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountId").value(EMPLOYEE_ACCOUNT_ID.toString()))
                .andExpect(jsonPath("$.userName").value("maria.jansen"));
    }

    // Test 29: EMPLOYEE: GET /api/accounts/{ander-id} — 404 (service filtert)
    @Test
    void employee_findById_otherAccount_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/accounts/" + ADMIN_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // Test 30: EMPLOYEE: POST /api/accounts — 403 (geen ACCOUNT_WRITE)
    @Test
    void employee_createAccount_returns403() throws Exception {
        String token = employeeToken();

        String accountJson = "{\"userName\":\"nieuwe.user\",\"password\":\"password123\"," +
                "\"personId\":\"" + EMPLOYEE_PERSON_ID + "\"," +
                "\"locked\":false,\"mustChangePassword\":false}";

        mockMvc.perform(post("/api/accounts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(accountJson))
                .andExpect(status().isForbidden());
    }

    // Test 31: EMPLOYEE: PUT /api/accounts/{eigen-id} — 403 (geen ACCOUNT_WRITE)
    @Test
    void employee_updateAccount_returns403() throws Exception {
        String token = employeeToken();

        String accountJson = "{\"userName\":\"maria.jansen\",\"password\":\"password123\"," +
                "\"personId\":\"" + EMPLOYEE_PERSON_ID + "\"," +
                "\"locked\":false,\"mustChangePassword\":false}";

        mockMvc.perform(put("/api/accounts/" + EMPLOYEE_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(accountJson))
                .andExpect(status().isForbidden());
    }

    // Test 32: EMPLOYEE: DELETE /api/accounts/{eigen-id} — 403 (geen ACCOUNT_DELETE)
    @Test
    void employee_deleteAccount_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/accounts/" + EMPLOYEE_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 33: AccountDto bevat geen passwordHash — response body bevat geen passwordHash
    @Test
    void accountDto_doesNotContainPasswordHash() throws Exception {
        String token = adminToken();

        String response = mockMvc.perform(get("/api/accounts/" + ADMIN_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(response);
        assert !json.has("passwordHash") : "AccountDto should not contain passwordHash";
        assert json.get("password").isNull() : "AccountDto password should be null";
    }

    // Test 34: Ongeauthenticeerd: GET /api/accounts — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/accounts"))
                .andExpect(status().isUnauthorized());
    }
}
