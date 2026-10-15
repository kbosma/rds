package nl.puurkroatie.rds.booking.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * "Verwijderen" moet echt verwijderen: per resource aanmaken, verwijderen (204) en daarna controleren dat hij
 * weg is (404). Daarnaast: adressen die nergens meer aan hangen worden opgeruimd, en een organisatie met
 * bedrijfsgegevens kan niet verwijderd worden.
 */
class DeleteVerificationControllerTest extends AbstractBookingControllerTest {

    private static final String ADDRESS_JSON = "{\"street\":\"Teststraat\",\"housenumber\":1,\"housenumberAddition\":null,"
            + "\"postalcode\":\"1000 AA\",\"city\":\"Teststad\",\"country\":\"Nederland\",\"addressrole\":\"woon\"}";

    @org.springframework.beans.factory.annotation.Autowired
    private jakarta.persistence.EntityManager entityManager;

    /**
     * De test draait in één transactie, dus een rij die de database via een cascade of een native delete heeft
     * weggehaald kan nog als verouderd object in de persistence context staan. In productie is elk request een
     * eigen transactie; hier ruimen we de context op voordat we controleren wat er echt in de database staat.
     */
    private void forgetCachedObjects() {
        entityManager.flush();
        entityManager.clear();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    private String create(String token, String path, String idField, String json) throws Exception {
        String body = mockMvc.perform(post(path).header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get(idField).asText();
    }

    private void assertDeletedForReal(String token, String path, String id) throws Exception {
        mockMvc.perform(get(path + "/" + id).header("Authorization", bearer(token))).andExpect(status().isOk());
        mockMvc.perform(delete(path + "/" + id).header("Authorization", bearer(token))).andExpect(status().isNoContent());
        mockMvc.perform(get(path + "/" + id).header("Authorization", bearer(token))).andExpect(status().isNotFound());
    }

    // ----- elke resource: aanmaken, verwijderen, weg -----

    @Test
    void theBookingResources_areReallyDeleted() throws Exception {
        String token = managerToken();
        assertDeletedForReal(token, "/api/bookers", create(token, "/api/bookers", "bookerId",
                "{\"firstname\":\"Los\",\"lastname\":\"Booker\",\"emailaddress\":\"los@example.com\"}"));
        assertDeletedForReal(token, "/api/bookings", create(token, "/api/bookings", "bookingId",
                "{\"bookingStatus\":\"" + BOOKING_STATUS_AANVRAAG + "\",\"bookerId\":\"" + BOOKER_TP_4 + "\"}"));
        assertDeletedForReal(token, "/api/accommodations", create(token, "/api/accommodations", "accommodationId",
                "{\"key\":\"ACC-DV-1\",\"name\":\"Weg\"}"));
        assertDeletedForReal(token, "/api/suppliers", create(token, "/api/suppliers", "supplierId",
                "{\"key\":\"SUP-DV-1\",\"name\":\"Weg\"}"));
        assertDeletedForReal(token, "/api/activities", create(token, "/api/activities", "activityId",
                "{\"name\":\"Weg\",\"activityType\":\"tour\"}"));
        assertDeletedForReal(token, "/api/addresses", create(token, "/api/addresses", "addressId", ADDRESS_JSON));
        assertDeletedForReal(token, "/api/travelers", create(token, "/api/travelers", "travelerId",
                "{\"bookingId\":\"" + BOOKING_TP_4 + "\",\"firstname\":\"Los\",\"prefix\":null,\"lastname\":\"Reiziger\","
                        + "\"gender\":\"man\",\"birthdate\":\"2010-05-15\",\"initials\":\"L.\"}"));
    }

    @Test
    void theTemplates_areReallyDeleted() throws Exception {
        String token = managerToken();
        assertDeletedForReal(token, "/api/document-templates", create(token, "/api/document-templates", "documentTemplateId",
                "{\"name\":\"Weg\",\"sourceHtml\":\"<p>x</p>\"}"));
        assertDeletedForReal(token, "/api/email-templates", create(token, "/api/email-templates", "emailTemplateId",
                "{\"name\":\"Weg\",\"subject\":\"S\",\"bodyHtml\":\"<p>x</p>\"}"));
    }

    @Test
    void theAdminResources_areReallyDeleted() throws Exception {
        String token = adminToken();
        assertDeletedForReal(token, "/api/roles", create(token, "/api/roles", "roleId", "{\"description\":\"TESTROL\"}"));
        assertDeletedForReal(token, "/api/authorities", create(token, "/api/authorities", "authorityId", "{\"description\":\"TEST_AUTH\"}"));
        String org = create(token, "/api/organizations", "organizationId", "{\"name\":\"Leeg BV\"}");
        assertDeletedForReal(token, "/api/persons", create(token, "/api/persons", "persoonId",
                "{\"firstname\":\"Los\",\"prefix\":null,\"lastname\":\"Persoon\",\"organizationId\":\"" + org + "\"}"));
        assertDeletedForReal(token, "/api/organizations", org);
    }

    // ----- wees-adressen -----

    private String addressLinkedTo(String token, String ownerPath, String ownerField, String ownerId, String linkPath) throws Exception {
        String addressId = create(token, "/api/addresses", "addressId", ADDRESS_JSON);
        mockMvc.perform(post(linkPath).header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"" + ownerField + "\":\"" + ownerId + "\",\"addressId\":\"" + addressId + "\"}"))
                .andExpect(status().isCreated());
        return addressId;
    }

    private void expectAddress(String addressId, int expectedStatus) throws Exception {
        forgetCachedObjects();
        mockMvc.perform(get("/api/addresses/" + addressId).header("Authorization", bearer(managerToken())))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void deletingABooker_alsoRemovesItsOwnAddresses() throws Exception {
        String token = managerToken();
        String booker = create(token, "/api/bookers", "bookerId", "{\"firstname\":\"A\",\"lastname\":\"B\",\"emailaddress\":\"a@b.nl\"}");
        String address = addressLinkedTo(token, "/api/bookers", "bookerId", booker, "/api/booker-addresses");

        mockMvc.perform(delete("/api/bookers/" + booker).header("Authorization", bearer(token))).andExpect(status().isNoContent());

        expectAddress(address, 404);
    }

    @Test
    void deletingAnAccommodationAndASupplier_alsoRemoveTheirOwnAddresses() throws Exception {
        String token = managerToken();
        String accommodation = create(token, "/api/accommodations", "accommodationId", "{\"key\":\"ACC-OR-1\",\"name\":\"A\"}");
        String supplier = create(token, "/api/suppliers", "supplierId", "{\"key\":\"SUP-OR-1\",\"name\":\"S\"}");
        String accAddress = addressLinkedTo(token, "/api/accommodations", "accommodationId", accommodation, "/api/accommodation-addresses");
        String supAddress = addressLinkedTo(token, "/api/suppliers", "supplierId", supplier, "/api/supplier-addresses");

        mockMvc.perform(delete("/api/accommodations/" + accommodation).header("Authorization", bearer(token))).andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/suppliers/" + supplier).header("Authorization", bearer(token))).andExpect(status().isNoContent());

        expectAddress(accAddress, 404);
        expectAddress(supAddress, 404);
    }

    @Test
    void anAddressThatIsStillUsedElsewhere_staysWhenOneOwnerIsDeleted() throws Exception {
        String token = managerToken();
        String first = create(token, "/api/bookers", "bookerId", "{\"firstname\":\"A\",\"lastname\":\"B\",\"emailaddress\":\"a@b.nl\"}");
        String second = create(token, "/api/bookers", "bookerId", "{\"firstname\":\"C\",\"lastname\":\"D\",\"emailaddress\":\"c@d.nl\"}");
        String shared = addressLinkedTo(token, "/api/bookers", "bookerId", first, "/api/booker-addresses");
        mockMvc.perform(post("/api/booker-addresses").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + second + "\",\"addressId\":\"" + shared + "\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/bookers/" + first).header("Authorization", bearer(token))).andExpect(status().isNoContent());
        expectAddress(shared, 200); // hangt nog aan de tweede booker

        mockMvc.perform(delete("/api/bookers/" + second).header("Authorization", bearer(token))).andExpect(status().isNoContent());
        expectAddress(shared, 404); // nu aan niets meer
    }

    @Test
    void anAddressOfAnotherOwnerKind_isNotTouchedWhenABookerIsDeleted() throws Exception {
        String token = managerToken();
        String booker = create(token, "/api/bookers", "bookerId", "{\"firstname\":\"A\",\"lastname\":\"B\",\"emailaddress\":\"a@b.nl\"}");
        String supplier = create(token, "/api/suppliers", "supplierId", "{\"key\":\"SUP-OR-2\",\"name\":\"S\"}");
        String shared = addressLinkedTo(token, "/api/suppliers", "supplierId", supplier, "/api/supplier-addresses");
        mockMvc.perform(post("/api/booker-addresses").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookerId\":\"" + booker + "\",\"addressId\":\"" + shared + "\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/bookers/" + booker).header("Authorization", bearer(token))).andExpect(status().isNoContent());

        expectAddress(shared, 200); // de leverancier gebruikt hem nog
    }

    // ----- organisatie met bedrijfsgegevens -----

    @Test
    void anOrganizationWithBusinessData_cannotBeDeleted_andKeepsEverything() throws Exception {
        mockMvc.perform(delete("/api/organizations/" + ORG_TECHPARTNER_ID).header("Authorization", bearer(adminToken())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("still has data")))
                .andExpect(jsonPath("$.message").value(containsString("booking")));

        mockMvc.perform(get("/api/organizations/" + ORG_TECHPARTNER_ID).header("Authorization", bearer(adminToken())))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/bookings/" + BOOKING_TP_4).header("Authorization", bearer(managerToken())))
                .andExpect(status().isOk());
    }

    @Test
    void anOrganizationWithOnlyPersonsAndAccounts_canBeDeleted_andTakesThemAlong() throws Exception {
        String token = adminToken();
        String org = create(token, "/api/organizations", "organizationId", "{\"name\":\"Alleen mensen BV\"}");
        String person = create(token, "/api/persons", "persoonId",
                "{\"firstname\":\"Jan\",\"prefix\":null,\"lastname\":\"Mens\",\"organizationId\":\"" + org + "\"}");

        mockMvc.perform(delete("/api/organizations/" + org).header("Authorization", bearer(token))).andExpect(status().isNoContent());

        forgetCachedObjects();
        mockMvc.perform(get("/api/persons/" + person).header("Authorization", bearer(token))).andExpect(status().isNotFound());
    }

    @Test
    void anOrganizationThatGainsBusinessData_isNoLongerDeletable() throws Exception {
        String token = adminToken();
        String org = create(token, "/api/organizations", "organizationId", "{\"name\":\"Met data BV\"}");
        // een booker onder die organisatie: aanmaken kan alleen als iemand van die organisatie; schrijf hem rechtstreeks weg
        jdbcInsertBooker(org);

        mockMvc.perform(delete("/api/organizations/" + org).header("Authorization", bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("booker: 1")));
    }

    private void jdbcInsertBooker(String organizationId) {
        entityManager.createNativeQuery("insert into booker (booker_id, firstname, lastname, status, created_at, tenant_organization)"
                        + " values (:id, 'X', 'Y', 'ACTIVE', now(), :org)")
                .setParameter("id", java.util.UUID.randomUUID())
                .setParameter("org", java.util.UUID.fromString(organizationId))
                .executeUpdate();
    }
}
