package nl.puurkroatie.rds.auth.controller;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Welke personen en accounts iemand ziet, volgt uit zijn authorities en niet uit de naam van zijn rol
 * (docs/voorstel-eigen-rollen.md, §5). Een rol met een naam die de code niet kent ("Boekhouder") gedraagt zich
 * precies volgens zijn authorities.
 */
class AuthorityBasedDataScopeTest extends AbstractAuthControllerTest {

    private static final String PASSWORD = "Boekhouder-2027!";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    private UUID roleId;
    private UUID ownPersonId;

    @BeforeEach
    void anAccountWithACustomRole() throws Exception {
        String manager = managerToken();
        ownPersonId = UUID.fromString(objectMapper.readTree(mockMvc.perform(post("/api/persons")
                        .header("Authorization", "Bearer " + manager)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstname\":\"Bea\",\"prefix\":null,\"lastname\":\"Boekhouder\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("persoonId").asText());
        UUID accountId = UUID.fromString(objectMapper.readTree(mockMvc.perform(post("/api/accounts")
                        .header("Authorization", "Bearer " + manager)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"bea.boekhouder\",\"password\":\"" + PASSWORD + "\",\"personId\":\"" + ownPersonId
                                + "\",\"locked\":false,\"mustChangePassword\":false,\"expiresAt\":\"2030-12-31T23:59:00\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("accountId").asText());

        entityManager.flush(); // de via de API gemaakte persoon en account staan dan in de database voor de SQL hieronder

        // Een rol die de code niet kent, met alleen leesrechten op personen en accounts.
        roleId = UUID.randomUUID();
        jdbc.update("INSERT INTO role (role_id, description, tenant_organization) VALUES (?, 'Boekhouder', ?)", roleId, ORG_TECHPARTNER_ID);
        grant("PERSON_READ");
        grant("ACCOUNT_READ");
        jdbc.update("INSERT INTO account_role (account_id, role_id, tenant_organization, created_at) VALUES (?, ?, ?, now())",
                accountId, roleId, ORG_TECHPARTNER_ID);
    }

    private void grant(String authority) {
        jdbc.update("INSERT INTO role_authority (role_id, authority_id) "
                + "SELECT ?, authority_id FROM authority WHERE description = ?", roleId, authority);
    }

    private Set<String> personIdsVisibleTo(String token) throws Exception {
        JsonNode persons = objectMapper.readTree(mockMvc.perform(get("/api/persons").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
        Set<String> ids = new HashSet<>();
        persons.forEach(person -> ids.add(person.get("persoonId").asText()));
        return ids;
    }

    @Test
    void withoutUserScopeOrganization_onlyTheOwnPersonIsVisible() throws Exception {
        assertEquals(Set.of(ownPersonId.toString()), personIdsVisibleTo(loginAndGetToken("bea.boekhouder", PASSWORD)));
    }

    @Test
    void withUserScopeOrganization_thePersonsOfTheWholeOrganizationAreVisible() throws Exception {
        grant("USER_SCOPE_ORGANIZATION");

        Set<String> visible = personIdsVisibleTo(loginAndGetToken("bea.boekhouder", PASSWORD));

        assertTrue(visible.contains(ownPersonId.toString()));
        assertTrue(visible.contains(MANAGER_PERSON_ID.toString()), "ook de manager van de eigen organisatie");
        assertTrue(!visible.contains(ADMIN_PERSON_ID.toString()), "maar niemand van een andere organisatie");
    }

    @Test
    void theAdminSeesOtherOrganizationsThroughPlatformAdmin() throws Exception {
        Set<String> visible = personIdsVisibleTo(adminToken());

        assertTrue(visible.contains(ownPersonId.toString()));
        assertTrue(visible.contains(ADMIN_PERSON_ID.toString()));
    }
}
