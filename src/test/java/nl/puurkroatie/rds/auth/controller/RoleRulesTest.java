package nl.puurkroatie.rds.auth.controller;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * De regels voor eigen rollen (docs/voorstel-eigen-rollen.md, §4), via de API en rechtstreeks in de database.
 * Seed na V24: Pieter is MANAGER en Sophie EMPLOYEE van TechPartner; Jan is ADMIN in RDS Platform.
 */
class RoleRulesTest extends AbstractAuthControllerTest {

    private static final String SOPHIE = "sophie.vandijk";

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    // ----- hulpjes -----

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String createRole(String token, String name) throws Exception {
        String body = mockMvc.perform(post("/api/roles").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"" + name + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("roleId").asText();
    }

    private String authorityId(String name) {
        return jdbc.queryForObject("SELECT authority_id::text FROM authority WHERE description = ?", String.class, name);
    }

    private ResultActions addAuthority(String token, String roleId, String authority) throws Exception {
        return mockMvc.perform(post("/api/role-authorities").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roleId\":\"" + roleId + "\",\"authorityId\":\"" + authorityId(authority) + "\"}"));
    }

    private ResultActions removeAuthority(String token, String roleId, String authority) throws Exception {
        return mockMvc.perform(delete("/api/role-authorities/" + roleId + "/" + authorityId(authority))
                .header("Authorization", bearer(token)));
    }

    private Set<String> authoritiesOf(String roleId) {
        entityManager.flush(); // wat via de API (JPA) is opgeslagen, staat dan in de database voor de SQL hieronder
        return new HashSet<>(jdbc.queryForList("SELECT a.description FROM role_authority ra JOIN authority a "
                + "ON a.authority_id = ra.authority_id WHERE ra.role_id = ?::uuid", String.class, roleId));
    }

    private String systemRoleOf(UUID organization, String key) {
        entityManager.flush();
        return jdbc.queryForObject("SELECT role_id::text FROM role WHERE tenant_organization = ? AND system_key = ?",
                String.class, organization, key);
    }

    private ResultActions assign(String token, Object accountId, String roleId) throws Exception {
        return mockMvc.perform(post("/api/account-roles").header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":\"" + accountId + "\",\"roleId\":\"" + roleId + "\"}"));
    }

    /**
     * Sophie krijgt naast EMPLOYEE een eigen rol waarmee ze rollen mag inrichten en toewijzen; meer niet. Ze is dus
     * een employee met rolbeheer-rechten (het scenario van §4.7).
     */
    private String sophieWithRoleManagementRights() {
        entityManager.flush();
        UUID role = UUID.randomUUID();
        jdbc.update("INSERT INTO role (role_id, description, tenant_organization) VALUES (?, 'Rolbeheer', ?)", role, ORG_TECHPARTNER_ID);
        for (String authority : List.of("ROLE_READ", "ROLE_CREATE", "ROLE_UPDATE", "ROLE_DELETE", "AUTHORITY_READ",
                "ROLEAUTHORITY_READ", "ROLEAUTHORITY_CREATE", "ROLEAUTHORITY_DELETE",
                "ACCOUNTROLE_READ", "ACCOUNTROLE_CREATE", "ACCOUNTROLE_DELETE")) {
            jdbc.update("INSERT INTO role_authority (role_id, authority_id) SELECT ?, authority_id FROM authority WHERE description = ?",
                    role, authority);
        }
        jdbc.update("INSERT INTO account_role (account_id, role_id, tenant_organization, created_at) VALUES (?, ?, ?, now())",
                EMPLOYEE_TECHPARTNER_ACCOUNT_ID, role, ORG_TECHPARTNER_ID);
        try {
            return loginAndGetToken(SOPHIE, DEFAULT_PASSWORD);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    // ----- §4.1, §4.5: rechten toevoegen, met vereisten -----

    @Test
    void addingAnAuthority_bringsItsRequirementsAlong_andIsLogged() throws Exception {
        String manager = managerToken();
        String role = createRole(manager, "Boekhouder");

        addAuthority(manager, role, "PAYMENT_UPDATE").andExpect(status().isCreated());

        assertEquals(Set.of("PAYMENT_UPDATE", "PAYMENT_READ", "BOOKING_READ"), authoritiesOf(role));
        mockMvc.perform(get("/api/authorization-log?roleId=" + role).header("Authorization", bearer(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4)) // aangemaakt + drie rechten
                .andExpect(jsonPath("$[?(@.authority == 'PAYMENT_READ')].details").value("vereist voor PAYMENT_UPDATE"));
    }

    @Test
    void anAuthorityTheUserDoesNotHave_cannotBeGiven() throws Exception {
        String manager = managerToken();
        String role = createRole(manager, "Boekhouder");

        addAuthority(manager, role, "ORGANIZATION_UPDATE").andExpect(status().isForbidden()); // niet uitdeelbaar door klanten
        assertTrue(authoritiesOf(role).isEmpty());
    }

    @Test
    void anAuthorityNeededByAnotherOne_cannotBeRemoved() throws Exception {
        String manager = managerToken();
        String role = createRole(manager, "Boekhouder");
        addAuthority(manager, role, "PAYMENT_UPDATE").andExpect(status().isCreated());

        removeAuthority(manager, role, "PAYMENT_READ").andExpect(status().isConflict());
        removeAuthority(manager, role, "PAYMENT_UPDATE").andExpect(status().isNoContent());
        removeAuthority(manager, role, "PAYMENT_READ").andExpect(status().isNoContent());
    }

    // ----- systeemrollen en andere organisaties -----

    @Test
    void aSystemRole_isLocked() throws Exception {
        String manager = managerToken();
        String employeeRole = systemRoleOf(ORG_TECHPARTNER_ID, "EMPLOYEE");

        addAuthority(manager, employeeRole, "PAYMENT_UPDATE").andExpect(status().isForbidden());
        removeAuthority(manager, employeeRole, "BOOKING_READ").andExpect(status().isForbidden());
        mockMvc.perform(put("/api/roles/" + employeeRole).header("Authorization", bearer(manager))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"Medewerker\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void theRolesOfAnotherOrganization_doNotExist() throws Exception {
        String otherOrganizationRole = systemRoleOf(ORG_PUURKROATIE_ID, "EMPLOYEE");

        mockMvc.perform(get("/api/roles/" + otherOrganizationRole).header("Authorization", bearer(managerToken())))
                .andExpect(status().isNotFound());
        addAuthority(managerToken(), otherOrganizationRole, "BOOKING_READ").andExpect(status().isNotFound());
    }

    @Test
    void theAdmin_doesNotChangeTheOwnRolesOfACustomer() throws Exception {
        String role = createRole(managerToken(), "Boekhouder");

        addAuthority(adminToken(), role, "BOOKING_READ").andExpect(status().isNotFound());
    }

    // ----- §4.6: namen en verwijderen -----

    @Test
    void theNameOfASystemRole_andAnExistingName_areRefused() throws Exception {
        String manager = managerToken();
        createRole(manager, "Boekhouder");

        for (String name : List.of("manager", "Boekhouder", "BOEKHOUDER")) {
            mockMvc.perform(post("/api/roles").header("Authorization", bearer(manager))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"description\":\"" + name + "\"}"))
                    .andExpect(status().isConflict());
        }
    }

    @Test
    void aRoleInUse_cannotBeDeleted() throws Exception {
        String manager = managerToken();
        String role = createRole(manager, "Boekhouder");
        addAuthority(manager, role, "BOOKING_READ").andExpect(status().isCreated());
        assign(manager, EMPLOYEE_TECHPARTNER_ACCOUNT_ID, role).andExpect(status().isCreated());

        mockMvc.perform(delete("/api/roles/" + role).header("Authorization", bearer(manager))).andExpect(status().isConflict());

        mockMvc.perform(delete("/api/account-roles/" + EMPLOYEE_TECHPARTNER_ACCOUNT_ID + "/" + role)
                .header("Authorization", bearer(manager))).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/roles/" + role).header("Authorization", bearer(manager))).andExpect(status().isNoContent());
    }

    // ----- §4.7: geen escalatie -----

    @Test
    void anEmployeeWithRoleManagementRights_cannotMakeHimselfManager() throws Exception {
        String sophie = sophieWithRoleManagementRights();

        // Een rol "Kopie manager" maken mag, maar er manager-rechten in zetten niet: die heeft ze zelf niet.
        String copy = createRole(sophie, "Kopie manager");
        addAuthority(sophie, copy, "ORGANIZATION_SETTINGS_UPDATE").andExpect(status().isForbidden());
        addAuthority(sophie, copy, "PERSON_CREATE").andExpect(status().isForbidden());

        // De systeemrol MANAGER aan zichzelf geven evenmin: die rol ligt boven haar niveau.
        assign(sophie, EMPLOYEE_TECHPARTNER_ACCOUNT_ID, systemRoleOf(ORG_TECHPARTNER_ID, "MANAGER")).andExpect(status().isForbidden());

        // Wat ze zelf heeft, mag ze doorgeven (ook de rolbeheer-rechten zelf: geen aparte vlag).
        addAuthority(sophie, copy, "BOOKING_READ").andExpect(status().isCreated());
        addAuthority(sophie, copy, "ROLE_CREATE").andExpect(status().isCreated());
    }

    @Test
    void anEmployeeWithRoleManagementRights_cannotTouchTheManagersRoleOrAccount() throws Exception {
        String sophie = sophieWithRoleManagementRights();

        mockMvc.perform(delete("/api/account-roles/" + MANAGER_ACCOUNT_ID + "/" + ROLE_MANAGER_ID)
                .header("Authorization", bearer(sophie))).andExpect(status().isForbidden());
        assign(sophie, MANAGER_ACCOUNT_ID, systemRoleOf(ORG_TECHPARTNER_ID, "EMPLOYEE")).andExpect(status().isForbidden());
    }

    // ----- §4.3: de laatste beheerder -----

    @Test
    void theLastManager_cannotBeLockedOrDeleted() throws Exception {
        String admin = adminToken();

        mockMvc.perform(put("/api/accounts/" + MANAGER_ACCOUNT_ID).header("Authorization", bearer(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userName\":\"pieter.degroot\",\"locked\":true,\"mustChangePassword\":false}"))
                .andExpect(status().isConflict());
        mockMvc.perform(delete("/api/accounts/" + MANAGER_ACCOUNT_ID).header("Authorization", bearer(admin)))
                .andExpect(status().isConflict());
    }

    // ----- onboarding -----

    @Test
    void aNewOrganization_getsLockedCopiesOfManagerAndEmployee_withTheTemplate() throws Exception {
        String body = mockMvc.perform(post("/api/organizations").header("Authorization", bearer(adminToken()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Nieuw Reisbureau BV\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        UUID organization = UUID.fromString(objectMapper.readTree(body).get("organizationId").asText());

        for (String key : List.of("MANAGER", "EMPLOYEE")) {
            Set<String> template = new HashSet<>(jdbc.queryForList("SELECT a.description FROM system_role_template t "
                    + "JOIN authority a ON a.authority_id = t.authority_id WHERE t.system_key = ?", String.class, key));
            assertEquals(template, authoritiesOf(systemRoleOf(organization, key)), key);
        }
    }

    // ----- de database bewaakt het ook zelf -----

    @Test
    void theDatabase_refusesChangesToASystemRole() {
        entityManager.flush();
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO role_authority (role_id, authority_id) SELECT ?::uuid, authority_id FROM authority WHERE description = 'PAYMENT_DELETE'",
                systemRoleOf(ORG_TECHPARTNER_ID, "EMPLOYEE")));
    }

    @Test
    void theDatabase_refusesARoleOfAnotherOrganization() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO account_role (account_id, role_id, tenant_organization, created_at) VALUES (?, ?::uuid, ?, now())",
                MANAGER_ACCOUNT_ID, systemRoleOf(ORG_PUURKROATIE_ID, "EMPLOYEE"), ORG_TECHPARTNER_ID));
    }

    // Elke foutmelding van de database breekt de transactie af: één fout per test.
    @Test
    void theDatabase_refusesToDeleteThePlatformOrganization() {
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("DELETE FROM organization WHERE organization_id = ?", ORG_PLATFORM_ID));
    }

    @Test
    void theDatabase_refusesASecondPlatformOrganization() {
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("INSERT INTO organization (organization_id, name, platform, created_at) VALUES (gen_random_uuid(), 'Tweede', true, now())"));
    }

    @Test
    void theDatabase_keepsAdminInThePlatform() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO role (role_id, description, tenant_organization, system_key) VALUES (gen_random_uuid(), 'Beheer', ?, 'ADMIN')",
                ORG_TECHPARTNER_ID));
    }

    @Test
    void theAuthorizationLog_cannotBeChanged() throws Exception {
        createRole(managerToken(), "Boekhouder");
        entityManager.flush();

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE authorization_log SET details = 'gewijzigd'"));
    }

    @Test
    void theAuthorizationLog_cannotBeDeleted() throws Exception {
        createRole(managerToken(), "Boekhouder");
        entityManager.flush();

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("DELETE FROM authorization_log"));
    }

    @Test
    void syncSystemRoles_isIdempotent_andTheSystemRolesMeetTheirOwnRequirements() {
        String before = jdbc.queryForObject("SELECT string_agg(role_id || ':' || authority_id, ',' ORDER BY role_id, authority_id) FROM role_authority", String.class);
        jdbc.execute("SELECT sync_system_roles()");
        String after = jdbc.queryForObject("SELECT string_agg(role_id || ':' || authority_id, ',' ORDER BY role_id, authority_id) FROM role_authority", String.class);
        assertEquals(before, after);

        List<String> unmet = jdbc.queryForList("SELECT t.system_key || ' ' || a.description || ' mist ' || r.description "
                + "FROM system_role_template t JOIN authority_requires q ON q.authority_id = t.authority_id "
                + "JOIN authority a ON a.authority_id = q.authority_id JOIN authority r ON r.authority_id = q.required_authority_id "
                + "WHERE NOT EXISTS (SELECT 1 FROM system_role_template t2 WHERE t2.system_key = t.system_key "
                + "AND t2.authority_id = q.required_authority_id)", String.class);
        assertTrue(unmet.isEmpty(), unmet.toString());
    }

    @Test
    void grantableAuthorities_areWhatTheManagerHasAndMayGiveAway() throws Exception {
        JsonNode grantable = objectMapper.readTree(mockMvc.perform(get("/api/authorities/grantable")
                        .header("Authorization", bearer(managerToken())))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        Set<String> names = new HashSet<>();
        grantable.forEach(a -> names.add(a.get("description").asText()));

        assertTrue(names.contains("BOOKING_READ") && names.contains("ROLE_CREATE"));
        assertTrue(!names.contains("PLATFORM_ADMIN") && !names.contains("ORGANIZATION_READ"));
    }
}
