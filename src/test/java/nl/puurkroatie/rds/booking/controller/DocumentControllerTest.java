package nl.puurkroatie.rds.booking.controller;

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

class DocumentControllerTest extends AbstractBookingControllerTest {

    // ADMIN: GET /api/documents — geen BOOKING_READ authority → 403
    @Test
    void admin_findAll_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/documents")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/documents/{id} — geen BOOKING_READ authority → 403
    @Test
    void admin_findById_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: POST /api/documents — geen BOOKING_CREATE authority → 403
    @Test
    void admin_create_returns403() throws Exception {
        String token = adminToken();

        String json = "{\"bookingId\":\"" + BOOKING_PK_1 + "\"," +
                "\"displayname\":\"Admin Document\",\"document\":null}";

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // ADMIN: PUT /api/documents/{id} — geen BOOKING_UPDATE authority → 403
    @Test
    void admin_update_returns403() throws Exception {
        String token = adminToken();

        String json = "{\"bookingId\":\"" + BOOKING_PK_1 + "\"," +
                "\"displayname\":\"Admin Update\",\"document\":null}";

        mockMvc.perform(put("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // ADMIN: DELETE /api/documents/{id} — geen BOOKING_DELETE authority → 403
    @Test
    void admin_delete_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(delete("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: GET /api/documents/{id}/content — geen BOOKING_READ authority → 403
    @Test
    void admin_getContent_returns403() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/documents/" + DOCUMENT_PK_1 + "/content")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // ADMIN: POST /api/documents/generate — geen BOOKING_CREATE authority → 403
    @Test
    void admin_generate_returns403() throws Exception {
        String token = adminToken();

        String json = "{\"templateId\":\"00000000-0000-0000-0000-000000000001\"," +
                "\"bookingId\":\"" + BOOKING_PK_1 + "\",\"outputFormat\":\"docx\"}";

        mockMvc.perform(post("/api/documents/generate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // MANAGER: GET /api/documents — alleen documenten van eigen organisatie
    @Test
    void manager_findAll_returnsOnlyOwnOrganizationDocuments() throws Exception {
        String token = managerToken();

        String response = mockMvc.perform(get("/api/documents")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode documents = objectMapper.readTree(response);
        for (JsonNode document : documents) {
            assert document.get("tenantOrganization").asText().equals(ORG_TECHPARTNER_ID.toString())
                    : "Manager should only see documents from own organization";
        }
    }

    // MANAGER: GET /api/documents/{id} andere org — 404
    @Test
    void manager_findById_otherOrganization_returns404() throws Exception {
        String token = managerToken();

        mockMvc.perform(get("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // MANAGER: POST /api/documents — 201
    @Test
    void manager_createDocument_returns201() throws Exception {
        String token = managerToken();

        String json = "{\"bookingId\":\"" + BOOKING_TP_4 + "\"," +
                "\"displayname\":\"Test Document\",\"document\":null}";

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayname").value("Test Document"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_TECHPARTNER_ID.toString()));
    }

    // MANAGER: PUT /api/documents/{id} eigen org — 200
    @Test
    void manager_updateDocument_ownOrganization_returns200() throws Exception {
        String token = managerToken();

        String json = "{\"bookingId\":\"" + BOOKING_TP_4 + "\"," +
                "\"displayname\":\"Offerte BK-2026-004 Updated\",\"document\":null}";

        mockMvc.perform(put("/api/documents/" + DOCUMENT_TP_4)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayname").value("Offerte BK-2026-004 Updated"));
    }

    // MANAGER: PUT /api/documents/{id} andere org — 403
    @Test
    void manager_updateDocument_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        String json = "{\"bookingId\":\"" + BOOKING_PK_1 + "\"," +
                "\"displayname\":\"Hacked\",\"document\":null}";

        mockMvc.perform(put("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // MANAGER: DELETE /api/documents/{id} andere org — 403
    @Test
    void manager_deleteDocument_otherOrganization_returns403() throws Exception {
        String token = managerToken();

        mockMvc.perform(delete("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: GET /api/documents — alleen documenten van eigen organisatie
    @Test
    void employee_findAll_returnsOnlyOwnOrganizationDocuments() throws Exception {
        String token = employeeToken();

        String response = mockMvc.perform(get("/api/documents")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode documents = objectMapper.readTree(response);
        for (JsonNode document : documents) {
            assert document.get("tenantOrganization").asText().equals(ORG_PUURKROATIE_ID.toString())
                    : "Employee should only see documents from own organization";
        }
    }

    // EMPLOYEE: GET /api/documents/{id} eigen org — 200
    @Test
    void employee_findById_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentId").value(DOCUMENT_PK_1.toString()));
    }

    // EMPLOYEE: GET /api/documents/{id} andere org — 404
    @Test
    void employee_findById_otherOrganization_returns404() throws Exception {
        String token = employeeToken();

        mockMvc.perform(get("/api/documents/" + DOCUMENT_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    // EMPLOYEE: POST /api/documents — 201 (heeft BOOKING_WRITE)
    @Test
    void employee_createDocument_returns201() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingId\":\"" + BOOKING_PK_1 + "\"," +
                "\"displayname\":\"Employee Document\",\"document\":null}";

        mockMvc.perform(post("/api/documents")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayname").value("Employee Document"))
                .andExpect(jsonPath("$.tenantOrganization").value(ORG_PUURKROATIE_ID.toString()));
    }

    // EMPLOYEE: PUT /api/documents/{id} eigen org — 200
    @Test
    void employee_updateDocument_ownOrganization_returns200() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingId\":\"" + BOOKING_PK_1 + "\"," +
                "\"displayname\":\"Bevestigingsbrief Updated\",\"document\":null}";

        mockMvc.perform(put("/api/documents/" + DOCUMENT_PK_1)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayname").value("Bevestigingsbrief Updated"));
    }

    // EMPLOYEE: PUT /api/documents/{id} andere org — 403
    @Test
    void employee_updateDocument_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        String json = "{\"bookingId\":\"" + BOOKING_TP_4 + "\"," +
                "\"displayname\":\"Hacked\",\"document\":null}";

        mockMvc.perform(put("/api/documents/" + DOCUMENT_TP_4)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    // EMPLOYEE: DELETE /api/documents/{id} andere org — 403
    @Test
    void employee_deleteDocument_otherOrganization_returns403() throws Exception {
        String token = employeeToken();

        mockMvc.perform(delete("/api/documents/" + DOCUMENT_TP_4)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // Ongeauthenticeerd: GET /api/documents — 401
    @Test
    void unauthenticated_findAll_returns401() throws Exception {
        mockMvc.perform(get("/api/documents"))
                .andExpect(status().isUnauthorized());
    }
}
