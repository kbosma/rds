package nl.puurkroatie.rds.auth.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    /** De rol met deze systeemsleutel in de organisatie van de ingelogde gebruiker (of van {@code organizationId}). */
    private String systemRoleId(String token, String systemKey, UUID organizationId) throws Exception {
        String query = organizationId == null ? "" : "?organizationId=" + organizationId;
        JsonNode roles = objectMapper.readTree(mockMvc.perform(get("/api/roles" + query)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode role : roles) {
            if (systemKey.equals(role.path("systemKey").asText())) {
                return role.get("roleId").asText();
            }
        }
        throw new AssertionError("Geen systeemrol " + systemKey);
    }

    private ResultActions assign(String token, Object accountId, Object roleId) throws Exception {
        return mockMvc.perform(post("/api/account-roles")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":\"" + accountId + "\",\"roleId\":\"" + roleId + "\"}"));
    }

    // MANAGER: de EMPLOYEE-rol van de eigen organisatie aan een account van de eigen organisatie — 201
    @Test
    void manager_createAccountRole_returns201() throws Exception {
        String token = managerToken();
        assign(token, MANAGER_ACCOUNT_ID, systemRoleId(token, "EMPLOYEE", null)).andExpect(status().isCreated());
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

    // MANAGER: de rol ADMIN bestaat niet in zijn organisatie (alleen in het platform) — 404, niets lekt
    @Test
    void manager_assignAdminRole_returns404() throws Exception {
        assign(managerToken(), MANAGER_ACCOUNT_ID, ROLE_ADMIN_ID).andExpect(status().isNotFound());
    }

    // ADMIN: ook een beheerder kan ADMIN niet aan een account van een klant geven — 404
    @Test
    void admin_assignAdminRoleToACustomerAccount_returns404() throws Exception {
        assign(adminToken(), EMPLOYEE_TECHPARTNER_ACCOUNT_ID, ROLE_ADMIN_ID).andExpect(status().isNotFound());
    }

    // ADMIN: mag bij een klant de systeemrollen toewijzen (bijv. een tweede manager) — 201
    @Test
    void admin_assignsTheManagerRoleOfACustomer_returns201() throws Exception {
        String token = adminToken();
        assign(token, EMPLOYEE_TECHPARTNER_ACCOUNT_ID, systemRoleId(token, "MANAGER", ORG_TECHPARTNER_ID))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role.description").value("MANAGER"));
    }

    // MANAGER: de laatste MANAGER van de organisatie kan zijn rol niet kwijt — 409
    @Test
    void theLastManager_cannotBeRevoked_returns409() throws Exception {
        mockMvc.perform(delete("/api/account-roles/" + MANAGER_ACCOUNT_ID + "/" + ROLE_MANAGER_ID)
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isConflict());
    }

    // Met een tweede manager kan de eerste zijn MANAGER-rol wel kwijt — 204
    @Test
    void withASecondManager_theFirstCanBeRevoked_returns204() throws Exception {
        String admin = adminToken();
        assign(admin, EMPLOYEE_TECHPARTNER_ACCOUNT_ID, systemRoleId(admin, "MANAGER", ORG_TECHPARTNER_ID)).andExpect(status().isCreated());

        mockMvc.perform(delete("/api/account-roles/" + MANAGER_ACCOUNT_ID + "/" + ROLE_MANAGER_ID)
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isNoContent());
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

    // MANAGER: de rollen van de eigen organisatie onder zijn niveau: EMPLOYEE en MANAGER, geen ADMIN
    @Test
    void manager_assignableRoles_areTheRolesOfTheOwnOrganization() throws Exception {
        mockMvc.perform(get("/api/account-roles/assignable-roles")
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].description", containsInAnyOrder("EMPLOYEE", "MANAGER")))
                .andExpect(jsonPath("$[*].tenantOrganization", everyItem(is(ORG_TECHPARTNER_ID.toString()))));
    }

    // ADMIN: voor een account van een klant de systeemrollen van die klant
    @Test
    void admin_assignableRolesForACustomerAccount_areTheSystemRolesOfThatCustomer() throws Exception {
        mockMvc.perform(get("/api/account-roles/assignable-roles?accountId=" + EMPLOYEE_TECHPARTNER_ACCOUNT_ID)
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].systemKey", containsInAnyOrder("EMPLOYEE", "MANAGER")))
                .andExpect(jsonPath("$[*].tenantOrganization", everyItem(is(ORG_TECHPARTNER_ID.toString()))));
    }

    // EMPLOYEE: GET /api/account-roles/assignable-roles — 403 (geen ACCOUNTROLE_READ)
    @Test
    void employee_assignableRoles_returns403() throws Exception {
        mockMvc.perform(get("/api/account-roles/assignable-roles")
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }
}
