package nl.puurkroatie.rds.auth.controller;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Base64;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Wijzigingen in rechten werken direct door (docs/voorstel-eigen-rollen.md, §6): een token van vóór de wijziging wordt
 * geweigerd met 401 AUTHZ_CHANGED; met dat token is wel een nieuw token op te halen, met de nieuwe rechten.
 */
class AuthzVersionTest extends AbstractAuthControllerTest {

    private static final String SOPHIE = "sophie.vandijk";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    /**
     * De test draait in één transactie; in de app sluit elke aanroep zijn eigen transactie af. Zo komt een wijziging
     * via JPA in de database (en gaan de triggers af) voordat de volgende aanroep de rechtenversie controleert.
     */
    private void commitLikeARequest() {
        entityManager.flush();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String systemRoleOf(UUID organization, String key) {
        entityManager.flush();
        return jdbc.queryForObject("SELECT role_id::text FROM role WHERE tenant_organization = ? AND system_key = ?",
                String.class, organization, key);
    }

    private JsonNode claims(String token) throws Exception {
        return objectMapper.readTree(new String(Base64.getUrlDecoder().decode(token.split("\\.")[1])));
    }

    private String refresh(String token) throws Exception {
        String body = mockMvc.perform(post("/api/auth/token/refresh").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }

    @Test
    void afterARoleIsAssigned_theOldTokenIsRefused_andARefreshBringsTheNewRights() throws Exception {
        String sophie = loginAndGetToken(SOPHIE, DEFAULT_PASSWORD);
        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(sophie))).andExpect(status().isOk());

        // Een beheerder maakt Sophie manager.
        mockMvc.perform(post("/api/account-roles").header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + EMPLOYEE_TECHPARTNER_ACCOUNT_ID + "\",\"roleId\":\""
                                + systemRoleOf(ORG_TECHPARTNER_ID, "MANAGER") + "\"}"))
                .andExpect(status().isCreated());
        commitLikeARequest();

        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(sophie)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHZ_CHANGED"));

        String fresh = refresh(sophie);
        assertTrue(claims(fresh).get("authorities").toString().contains("ACCOUNT_CREATE"), "nu met de rechten van een manager");
        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(fresh))).andExpect(status().isOk());
    }

    @Test
    void aChangeInARole_reachesEveryoneWithThatRole_butNobodyElse() throws Exception {
        String manager = managerToken();
        String sophie = loginAndGetToken(SOPHIE, DEFAULT_PASSWORD);

        // Pieter maakt een eigen rol, geeft die aan Sophie en zet er daarna nog een recht bij.
        String body = mockMvc.perform(post("/api/roles").header("Authorization", bearer(manager))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"Boekhouder\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String role = objectMapper.readTree(body).get("roleId").asText();
        mockMvc.perform(post("/api/account-roles").header("Authorization", bearer(manager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accountId\":\"" + EMPLOYEE_TECHPARTNER_ACCOUNT_ID + "\",\"roleId\":\"" + role + "\"}"))
                .andExpect(status().isCreated());
        commitLikeARequest();
        String sophieAfterAssignment = refresh(sophie);

        String paymentUpdate = jdbc.queryForObject("SELECT authority_id::text FROM authority WHERE description = 'PAYMENT_UPDATE'", String.class);
        mockMvc.perform(post("/api/role-authorities").header("Authorization", bearer(manager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roleId\":\"" + role + "\",\"authorityId\":\"" + paymentUpdate + "\"}"))
                .andExpect(status().isCreated());
        commitLikeARequest();

        // Sophie heeft de rol: haar token is verouderd. Pieter niet: zijn token werkt gewoon door.
        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(sophieAfterAssignment)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(manager))).andExpect(status().isOk());
        assertTrue(claims(refresh(sophieAfterAssignment)).get("authorities").toString().contains("PAYMENT_UPDATE"));
    }

    @Test
    void aLockedAccount_cannotRefresh() throws Exception {
        String sophie = loginAndGetToken(SOPHIE, DEFAULT_PASSWORD);

        mockMvc.perform(put("/api/accounts/" + EMPLOYEE_TECHPARTNER_ACCOUNT_ID).header("Authorization", bearer(managerToken()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"sophie.vandijk\",\"locked\":true,\"mustChangePassword\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/bookings").header("Authorization", bearer(sophie)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHZ_CHANGED"));
        mockMvc.perform(post("/api/auth/token/refresh").header("Authorization", bearer(sophie)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshing_needsAnEmployeeToken() throws Exception {
        mockMvc.perform(post("/api/auth/token/refresh")).andExpect(status().isUnauthorized());
    }
}
