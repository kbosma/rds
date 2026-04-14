package nl.puurkroatie.rds.booking.controller;

import com.fasterxml.jackson.databind.JsonNode;
import nl.puurkroatie.rds.common.controller.AbstractControllerTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DocumentTemplateControllerTest extends AbstractControllerTest {

    // ADMIN: geen TEMPLATE authorities → 403 op alle endpoints
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/document-templates")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/document-templates/00000000-0000-0000-0000-000000000001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_create_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Admin Template\",\"description\":\"Should fail\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_update_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(put("/api/document-templates/00000000-0000-0000-0000-000000000001")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Admin Template\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_delete_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(delete("/api/document-templates/00000000-0000-0000-0000-000000000001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void admin_getContent_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/document-templates/00000000-0000-0000-0000-000000000001/content")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/document-templates — 200 (heeft TEMPLATE_READ)
    @Test
    void manager_findAll_returns200() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/document-templates")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // MANAGER: POST + GET — volledige CRUD flow
    @Test
    void manager_createAndFindTemplate_returns201And200() throws Exception {
        String token = managerToken();

        String json = "{\"name\":\"Bevestigingsbrief\",\"description\":\"Template voor bevestigingsbrieven\"}";

        String response = mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bevestigingsbrief"))
                .andExpect(jsonPath("$.description").value("Template voor bevestigingsbrieven"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()))
                .andReturn().getResponse().getContentAsString();

        JsonNode created = objectMapper.readTree(response);
        String templateId = created.get("documentTemplateId").asText();

        mockMvc.perform(get("/api/document-templates/" + templateId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentTemplateId").value(templateId))
                .andExpect(jsonPath("$.name").value("Bevestigingsbrief"));
    }

    // MANAGER: PUT — update template
    @Test
    void manager_updateTemplate_returns200() throws Exception {
        String token = managerToken();

        String createJson = "{\"name\":\"Factuur\",\"description\":\"Factuur template\"}";
        String createResponse = mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String templateId = objectMapper.readTree(createResponse).get("documentTemplateId").asText();

        String updateJson = "{\"name\":\"Factuur Updated\",\"description\":\"Bijgewerkte factuur template\"}";
        mockMvc.perform(put("/api/document-templates/" + templateId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Factuur Updated"));
    }

    // MANAGER: DELETE — delete template
    @Test
    void manager_deleteTemplate_returns204() throws Exception {
        String token = managerToken();

        String createJson = "{\"name\":\"Te Verwijderen\",\"description\":\"Wordt verwijderd\"}";
        String createResponse = mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String templateId = objectMapper.readTree(createResponse).get("documentTemplateId").asText();

        mockMvc.perform(delete("/api/document-templates/" + templateId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/document-templates/" + templateId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: GET — heeft TEMPLATE_READ → 200
    @Test
    void employee_findAll_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/document-templates")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // EMPLOYEE: POST — geen TEMPLATE_CREATE → 403
    @Test
    void employee_create_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"name\":\"Employee Template\",\"description\":\"Should fail\"}";

        mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: PUT — geen TEMPLATE_UPDATE → 403
    @Test
    void employee_update_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(put("/api/document-templates/00000000-0000-0000-0000-000000000001")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hacked\"}"))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE — geen TEMPLATE_DELETE → 403
    @Test
    void employee_delete_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/document-templates/00000000-0000-0000-0000-000000000001")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Tenant isolatie: MANAGER kan templates van andere organisatie niet zien
    @Test
    void manager_cannotSeeTemplatesFromOtherOrganization() throws Exception {
        String employeeToken = employeeToken();
        String managerToken = managerToken();

        // Employee (Puurkroatie) maakt template aan via manager van Puurkroatie is niet mogelijk
        // Gebruik een workaround: maak een template aan met manager (TechPartner)
        String createJson = "{\"name\":\"TechPartner Template\",\"description\":\"Van TechPartner\"}";
        String createResponse = mockMvc.perform(post("/api/document-templates")
                        .header("Authorization", "Bearer " + managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String templateId = objectMapper.readTree(createResponse).get("documentTemplateId").asText();

        // Employee (Puurkroatie) kan deze template niet zien
        mockMvc.perform(get("/api/document-templates/" + templateId)
                        .header("Authorization", "Bearer " + employeeToken))
                .andExpect(status().isNotFound());
    }

    // Ongeauthenticeerd: 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/document-templates"))
                .andExpect(status().isUnauthorized());
    }
}
