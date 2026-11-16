package nl.puurkroatie.rds.auth.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    // Regressie: het organisatie-formulier stuurt bij een update alleen name +
    // emailFrom (geen mollieKey). Dat mag de bestaande mollie-key niet wissen,
    // terwijl emailFrom wel wordt gezet.
    @Test
    void admin_update_preservesMollieKeyAndSetsEmailFrom() throws Exception {
        String token = adminToken();

        String json = "{\"name\":\"Puurkroatie\",\"emailFrom\":\"info@puurkroatie.nl\"}";
        mockMvc.perform(put("/api/organizations/" + ORG_PUURKROATIE_ID)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailFrom").value("info@puurkroatie.nl"))
                .andExpect(jsonPath("$.mollieKey").value("test_GpPHhs7SHk73fAyMyaJUFUKJQdxDD5"))
                // audit blijft behouden in de response (niet null na update)
                .andExpect(jsonPath("$.createdAt").value("2026-01-01T09:00:00"));
    }

    // Verwijderen vereist ORGANIZATION_DELETE (alleen ADMIN). Een ontbrekende authority geeft 403 vanuit de
    // method security, nog vóór de service of de OrganizationDeletionGuard (die geeft 409) wordt geraakt.
    // ADMIN zelf: zie DeleteVerificationControllerTest (204 zonder bedrijfsgegevens, 409 met).
    @Test
    void manager_delete_returns403() throws Exception {
        mockMvc.perform(delete("/api/organizations/" + ORG_TECHPARTNER_ID)
                        .header("Authorization", "Bearer " + managerToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void employee_delete_returns403() throws Exception {
        mockMvc.perform(delete("/api/organizations/" + ORG_TECHPARTNER_ID)
                        .header("Authorization", "Bearer " + employeeToken()))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticated_delete_returns401() throws Exception {
        mockMvc.perform(delete("/api/organizations/" + ORG_TECHPARTNER_ID))
                .andExpect(status().isUnauthorized());
    }
}
