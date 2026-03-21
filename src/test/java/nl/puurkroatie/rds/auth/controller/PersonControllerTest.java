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

class PersonControllerTest extends AbstractAuthControllerTest {

    // Test 10: ADMIN: GET /api/persons — alle persons (>= 3)
    @Test
    void admin_findAll_returnsAllPersons() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/persons")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    // Test 11: ADMIN: GET /api/persons/{id} — elke person opvraagbaar
    @Test
    void admin_findById_returnsAnyPerson() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/persons/" + MANAGER_PERSON_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.persoonId").value(MANAGER_PERSON_ID.toString()))
                .andExpect(jsonPath("$.firstname").value("Pieter"));
    }

    // Test 12: MANAGER: GET /api/persons — alleen persons van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationPersons() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/persons")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode persons = objectMapper.readTree(response);
        for (JsonNode person : persons) {
            assert person.get("organizationId").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see persons from own organization";
        }
    }

    // Test 13: MANAGER: POST /api/persons binnen eigen organisatie — 201
    @Test
    void manager_createPerson_ownOrganization_returns201() throws Exception {
        String token = managerToken();

        String personJson = "{\"firstname\":\"Test\",\"prefix\":null,\"lastname\":\"Medewerker\"," +
                "\"organizationId\":\"" + ORG_TECHPARTNER_ID + "\"}";

        mockMvc.perform(post("/api/persons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(personJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.firstname").value("Test"))
                .andExpect(jsonPath("$.organizationId").value(ORG_TECHPARTNER_ID.toString()));
    }

    // Test 14: MANAGER: POST /api/persons in andere organisatie — 403
    @Test
    void manager_createPerson_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String personJson = "{\"firstname\":\"Test\",\"prefix\":null,\"lastname\":\"Medewerker\"," +
                "\"organizationId\":\"" + ORG_PUURKROATIE_ID + "\"}";

        mockMvc.perform(post("/api/persons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(personJson))
                .andExpect(status().isForbidden());
    }

    // Test 15: EMPLOYEE: GET /api/persons — alleen eigen person (1 resultaat)
    @Test
    void employee_findAll_returnsOnlyOwnPerson() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/persons")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].persoonId").value(EMPLOYEE_PERSON_ID.toString()));
    }

    // Test 16: EMPLOYEE: GET /api/persons/{eigen-id} — 200
    @Test
    void employee_findById_ownPerson_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/persons/" + EMPLOYEE_PERSON_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.persoonId").value(EMPLOYEE_PERSON_ID.toString()))
                .andExpect(jsonPath("$.firstname").value("Maria"));
    }

    // Test 17: EMPLOYEE: GET /api/persons/{ander-id} — 404 (service filtert)
    @Test
    void employee_findById_otherPerson_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/persons/" + ADMIN_PERSON_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // Test 18: EMPLOYEE: POST /api/persons — 403 (geen PERSON_WRITE)
    @Test
    void employee_createPerson_returns403() throws Exception {
        String token = employeeToken();

        String personJson = "{\"firstname\":\"Test\",\"prefix\":null,\"lastname\":\"Medewerker\"," +
                "\"organizationId\":\"" + ORG_PUURKROATIE_ID + "\"}";

        mockMvc.perform(post("/api/persons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(personJson))
                .andExpect(status().isForbidden());
    }

    // Test 19: EMPLOYEE: PUT /api/persons/{eigen-id} — 403 (geen PERSON_WRITE)
    @Test
    void employee_updatePerson_returns403() throws Exception {
        String token = employeeToken();

        String personJson = "{\"firstname\":\"Maria\",\"prefix\":null,\"lastname\":\"Jansen\"," +
                "\"organizationId\":\"" + ORG_PUURKROATIE_ID + "\"}";

        mockMvc.perform(put("/api/persons/" + EMPLOYEE_PERSON_ID)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(personJson))
                .andExpect(status().isForbidden());
    }

    // Test 20: EMPLOYEE: DELETE /api/persons/{eigen-id} — 403 (geen PERSON_DELETE)
    @Test
    void employee_deletePerson_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/persons/" + EMPLOYEE_PERSON_ID)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Test 21: Ongeauthenticeerd: GET /api/persons — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/persons"))
                .andExpect(status().isUnauthorized());
    }
}
